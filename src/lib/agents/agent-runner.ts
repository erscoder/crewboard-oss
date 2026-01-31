import 'server-only'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { AgentProfile, AgentRunStatus, ApiProvider, Task } from '@prisma/client'

import { resolveApiKey } from '@/lib/api-keys'
import { prisma } from '@/lib/prisma'
import { buildSkillsPrompt } from './skills-loader'

export interface RunResult {
  runId: string
  status: AgentRunStatus
  output: string | null
  error: string | null
  tokens: {
    input: number
    output: number
    total: number
  }
  cost: number | null
}

/**
 * Build the full system prompt for an agent including skills
 */
function buildSystemPrompt(agent: AgentProfile, task: Task): string {
  const skillsPrompt = buildSkillsPrompt(agent.skills)
  
  return `${agent.systemPrompt}

${skillsPrompt}

# Current Task

**Title:** ${task.title}

**Description:**
${task.description || 'No description provided.'}

# Instructions

1. Analyze the task carefully
2. Break it down into steps if needed
3. Execute each step using available tools
4. Report your progress and results
5. When complete, summarize what was done

Be thorough but efficient. Ask for clarification if the task is ambiguous.`
}

/**
 * Determine which API client to use based on model name
 */
function getProvider(model: string): 'anthropic' | 'openai' {
  if (model.startsWith('claude') || model.startsWith('anthropic')) {
    return 'anthropic'
  }
  return 'openai'
}

function toApiProvider(provider: 'anthropic' | 'openai'): ApiProvider {
  return provider === 'anthropic' ? 'ANTHROPIC' : 'OPENAI'
}

/**
 * Execute a task with Anthropic Claude
 */
async function runWithAnthropic(
  agent: AgentProfile,
  systemPrompt: string,
  userMessage: string,
  apiKey?: string
): Promise<{ content: string; inputTokens: number; outputTokens: number }> {
  const key = apiKey || process.env.ANTHROPIC_API_KEY
  if (!key) {
    throw new Error('No Anthropic API key available')
  }

  const client = new Anthropic({ apiKey: key })

  const response = await client.messages.create({
    model: agent.model,
    max_tokens: agent.maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  })
  
  const content = response.content
    .filter(block => block.type === 'text')
    .map(block => (block as { type: 'text'; text: string }).text)
    .join('\n')
  
  return {
    content,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  }
}

/**
 * Execute a task with OpenAI
 */
async function runWithOpenAI(
  agent: AgentProfile,
  systemPrompt: string,
  userMessage: string,
  apiKey?: string
): Promise<{ content: string; inputTokens: number; outputTokens: number }> {
  const key = apiKey || process.env.OPENAI_API_KEY
  if (!key) {
    throw new Error('No OpenAI API key available')
  }

  const client = new OpenAI({ apiKey: key })

  const response = await client.chat.completions.create({
    model: agent.model,
    max_tokens: agent.maxTokens,
    temperature: agent.temperature,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
  })
  
  return {
    content: response.choices[0]?.message?.content || '',
    inputTokens: response.usage?.prompt_tokens || 0,
    outputTokens: response.usage?.completion_tokens || 0,
  }
}

/**
 * Estimate cost based on model and tokens
 */
function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  // Prices per 1M tokens (approximate)
  const prices: Record<string, { input: number; output: number }> = {
    'claude-opus-4-5': { input: 15, output: 75 },
    'claude-sonnet-4-20250514': { input: 3, output: 15 },
    'gpt5.1.codex': { input: 5, output: 15 },
    'gpt-4o': { input: 2.5, output: 10 },
  }
  
  const price = prices[model] || { input: 5, output: 15 }
  
  return (
    (inputTokens / 1_000_000) * price.input +
    (outputTokens / 1_000_000) * price.output
  )
}

/**
 * Run an agent on a task
 */
export async function runAgent(
  agentId: string,
  taskId: string,
  userId?: string
): Promise<RunResult> {
  // Load agent and task
  const agent = await prisma.agentProfile.findUnique({
    where: { id: agentId },
  })
  
  if (!agent) {
    throw new Error(`Agent not found: ${agentId}`)
  }
  
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: true, comments: true },
  })
  
  if (!task) {
    throw new Error(`Task not found: ${taskId}`)
  }
  
  // Create the run record
  const run = await prisma.agentRun.create({
    data: {
      agentId: agent.id,
      taskId: task.id,
      status: 'RUNNING',
      input: `Task: ${task.title}\n\n${task.description || ''}`,
      startedAt: new Date(),
    },
  })
  
  // Update task status
  await prisma.task.update({
    where: { id: taskId },
    data: { status: 'IN_PROGRESS', startedAt: new Date() },
  })
  
  try {
    const systemPrompt = buildSystemPrompt(agent, task)
    const userMessage = 'Please execute this task. Provide a detailed response with your analysis and results.'
    
    const provider = getProvider(agent.model)
    const resolvedKey = await resolveApiKey(toApiProvider(provider), userId)

    if (!resolvedKey.apiKey) {
      throw new Error(`No API key configured for ${provider.toUpperCase()}`)
    }
    
    let result: { content: string; inputTokens: number; outputTokens: number }
    
    if (provider === 'anthropic') {
      result = await runWithAnthropic(agent, systemPrompt, userMessage, resolvedKey.apiKey)
    } else {
      result = await runWithOpenAI(agent, systemPrompt, userMessage, resolvedKey.apiKey)
    }
    
    const cost = estimateCost(agent.model, result.inputTokens, result.outputTokens)
    
    // Update run with success
    await prisma.agentRun.update({
      where: { id: run.id },
      data: {
        status: 'COMPLETED',
        output: result.content,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        totalTokens: result.inputTokens + result.outputTokens,
        cost,
        completedAt: new Date(),
      },
    })
    
    // Add a comment with the agent's response
    await prisma.comment.create({
      data: {
        taskId: task.id,
        authorId: task.assigneeId!, // The agent user
        content: `**Agent Response:**\n\n${result.content.slice(0, 2000)}${result.content.length > 2000 ? '...' : ''}`,
      },
    })
    
    // Update task to REVIEW
    await prisma.task.update({
      where: { id: taskId },
      data: { status: 'REVIEW' },
    })
    
    return {
      runId: run.id,
      status: 'COMPLETED',
      output: result.content,
      error: null,
      tokens: {
        input: result.inputTokens,
        output: result.outputTokens,
        total: result.inputTokens + result.outputTokens,
      },
      cost,
    }
  } catch (error: any) {
    // Update run with failure
    await prisma.agentRun.update({
      where: { id: run.id },
      data: {
        status: 'FAILED',
        error: error.message || 'Unknown error',
        completedAt: new Date(),
      },
    })
    
    return {
      runId: run.id,
      status: 'FAILED',
      output: null,
      error: error.message || 'Unknown error',
      tokens: { input: 0, output: 0, total: 0 },
      cost: null,
    }
  }
}

/**
 * Get agent by name (for lookup from User.name)
 */
export async function getAgentByName(name: string): Promise<AgentProfile | null> {
  return prisma.agentProfile.findUnique({
    where: { name },
  })
}

/**
 * List all active agents
 */
export async function listAgents(): Promise<AgentProfile[]> {
  return prisma.agentProfile.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  })
}
