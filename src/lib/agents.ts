import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export type AgentRunResult = {
  runId: string
  status: 'COMPLETED' | 'FAILED' | 'CANCELLED'
  output?: string
  tokens?: number
  cost?: number
  error?: string
}

/**
 * Get agent profile by name (case-insensitive)
 */
export async function getAgentByName(name: string) {
  return prisma.agentProfile.findFirst({
    where: {
      name: { equals: name, mode: 'insensitive' },
      isActive: true,
    },
  })
}

/**
 * Get agent profile by ID
 */
export async function getAgentById(id: string) {
  return prisma.agentProfile.findUnique({
    where: { id },
  })
}

/**
 * Run an agent on a task
 */
export async function runAgent(agentId: string, taskId: string): Promise<AgentRunResult> {
  // Get agent and task
  const [agent, task] = await Promise.all([
    prisma.agentProfile.findUnique({ where: { id: agentId } }),
    prisma.task.findUnique({
      where: { id: taskId },
      include: { project: true, comments: { orderBy: { createdAt: 'desc' }, take: 5 } },
    }),
  ])

  if (!agent) {
    throw new Error(`Agent not found: ${agentId}`)
  }

  if (!task) {
    throw new Error(`Task not found: ${taskId}`)
  }

  // Build prompt for the agent
  const prompt = buildAgentPrompt(agent, task)

  // Create agent run record
  const run = await prisma.agentRun.create({
    data: {
      agentId,
      taskId,
      status: 'RUNNING',
      input: prompt,
    },
  })

  // Update task to IN_PROGRESS
  await prisma.task.update({
    where: { id: taskId },
    data: { status: 'IN_PROGRESS', startedAt: new Date() },
  })

  try {
    // Call the LLM API
    const result = await callLLM(agent, prompt)

    // Update run with result
    await prisma.agentRun.update({
      where: { id: run.id },
      data: {
        status: 'COMPLETED',
        output: result.output,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        totalTokens: result.totalTokens,
        cost: result.cost,
      },
    })

    // Add comment with agent output (from the bot user)
    const botUser = await prisma.user.findFirst({ 
      where: { name: agent.name, isBot: true } 
    })
    if (botUser) {
      await prisma.comment.create({
        data: {
          taskId,
          content: `**🤖 Completed:**\n\n${result.output}`,
          authorId: botUser.id,
        },
      })
    }

    // Move task to REVIEW
    await prisma.task.update({
      where: { id: taskId },
      data: { status: 'REVIEW' },
    })

    // Log activity
    await prisma.activity.create({
      data: {
        type: 'agent_completed',
        message: `${agent.name} completed task`,
        taskId,
      },
    })

    revalidatePath('/')

    return {
      runId: run.id,
      status: 'COMPLETED',
      output: result.output,
      tokens: result.totalTokens,
      cost: result.cost,
    }
  } catch (error: any) {
    // Update run with error
    await prisma.agentRun.update({
      where: { id: run.id },
      data: {
        status: 'FAILED',
        output: `Error: ${error.message}`,
      },
    })

    // Add error comment (from the bot user)
    const botUser = await prisma.user.findFirst({ 
      where: { name: agent.name, isBot: true } 
    })
    if (botUser) {
      await prisma.comment.create({
        data: {
          taskId,
          content: `**🤖 Failed:**\n\n${error.message}`,
          authorId: botUser.id,
        },
      })
    }

    // Move back to TODO for retry
    await prisma.task.update({
      where: { id: taskId },
      data: { status: 'TODO' },
    })

    revalidatePath('/')

    return {
      runId: run.id,
      status: 'FAILED',
      error: error.message,
    }
  }
}

/**
 * Build the prompt for an agent based on task context
 */
function buildAgentPrompt(agent: any, task: any): string {
  const recentComments = task.comments
    ?.map((c: any) => `- ${c.content}`)
    .join('\n') || 'No comments yet'

  return `${agent.systemPrompt}

---

## Task: ${task.shortId || task.id}
**Title:** ${task.title}
**Project:** ${task.project?.name || 'Unknown'}
**Status:** ${task.status}

**Description:**
${task.description || 'No description provided.'}

**Recent Comments:**
${recentComments}

---

Please complete this task. Provide a clear summary of what you did and any relevant output.
`
}

/**
 * Call LLM API with tool support (Anthropic Claude)
 */
async function callLLM(agent: any, prompt: string) {
  const { getToolsForAgent, executeTool } = await import('./agent-tools')
  
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured')
  }

  // Determine model
  const modelMap: Record<string, string> = {
    'claude-opus-4-5': 'claude-opus-4-5-20250514',
    'claude-sonnet-4': 'claude-sonnet-4-20250514',
    'claude-haiku': 'claude-3-5-haiku-20241022',
  }
  const model = modelMap[agent.model] || agent.model || 'claude-sonnet-4-20250514'

  // Get tools for this agent
  const tools = getToolsForAgent(agent.name, agent.tools)
  
  // Conversation loop for tool calls
  const messages: any[] = [{ role: 'user', content: prompt }]
  let totalInputTokens = 0
  let totalOutputTokens = 0
  let finalOutput = ''
  const maxIterations = 10 // Prevent infinite loops

  for (let i = 0; i < maxIterations; i++) {
    const requestBody: any = {
      model,
      max_tokens: agent.maxTokens || 4096,
      temperature: agent.temperature || 0.7,
      messages,
    }

    // Only include tools if agent has any
    if (tools.length > 0) {
      requestBody.tools = tools
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Anthropic API error: ${response.status} - ${error}`)
    }

    const data = await response.json()
    
    totalInputTokens += data.usage?.input_tokens || 0
    totalOutputTokens += data.usage?.output_tokens || 0

    // Check if we have tool calls
    const toolUses = data.content?.filter((c: any) => c.type === 'tool_use') || []
    const textBlocks = data.content?.filter((c: any) => c.type === 'text') || []
    
    // Collect text output
    const textOutput = textBlocks.map((c: any) => c.text).join('\n')
    if (textOutput) {
      finalOutput += (finalOutput ? '\n\n' : '') + textOutput
    }

    // If no tool calls, we're done
    if (toolUses.length === 0 || data.stop_reason === 'end_turn') {
      break
    }

    // Execute tool calls
    const toolResults: any[] = []
    for (const toolUse of toolUses) {
      console.log(`[agent-tools] Executing ${toolUse.name}:`, JSON.stringify(toolUse.input).slice(0, 100))
      
      const result = await executeTool(toolUse.name, toolUse.input, agent.name)
      
      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: result.success ? result.result : `Error: ${result.error}`,
        is_error: !result.success,
      })
    }

    // Add assistant message with tool uses and user message with results
    messages.push({ role: 'assistant', content: data.content })
    messages.push({ role: 'user', content: toolResults })
  }

  const totalTokens = totalInputTokens + totalOutputTokens

  // Estimate cost (rough rates for Sonnet)
  const inputCost = (totalInputTokens / 1_000_000) * 3 // $3/M input
  const outputCost = (totalOutputTokens / 1_000_000) * 15 // $15/M output
  const cost = inputCost + outputCost

  return {
    output: finalOutput || 'No output generated',
    inputTokens: totalInputTokens,
    outputTokens: totalOutputTokens,
    totalTokens,
    cost,
  }
}

/**
 * Cancel a running agent
 */
export async function cancelAgentRun(runId: string) {
  const run = await prisma.agentRun.findUnique({
    where: { id: runId },
    include: { task: true },
  })

  if (!run) {
    throw new Error('Run not found')
  }

  if (run.status !== 'RUNNING' && run.status !== 'QUEUED') {
    throw new Error('Run is not active')
  }

  // Update run status
  await prisma.agentRun.update({
    where: { id: runId },
    data: {
      status: 'CANCELLED',
      output: 'Cancelled by user',
    },
  })

  // Move task back to TODO if it was in progress
  if (run.task && run.task.status === 'IN_PROGRESS') {
    await prisma.task.update({
      where: { id: run.task.id },
      data: { status: 'TODO' },
    })
  }

  revalidatePath('/')

  return { success: true }
}
