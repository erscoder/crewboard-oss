'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function toggleAgentStatus(agentId: string, isActive: boolean) {
  await prisma.agentProfile.update({
    where: { id: agentId },
    data: { isActive },
  })
  revalidatePath('/agents')
}

export async function deleteAgent(agentId: string) {
  await prisma.agentProfile.delete({
    where: { id: agentId },
  })
  revalidatePath('/agents')
}

export async function createAgent(data: {
  name: string
  description?: string
  model: string
  systemPrompt: string
  skills: string[]
  tools: string[]
  maxTokens?: number
  temperature?: number
}) {
  const agent = await prisma.agentProfile.create({
    data: {
      name: data.name,
      description: data.description || null,
      model: data.model,
      systemPrompt: data.systemPrompt,
      skills: data.skills,
      tools: data.tools,
      maxTokens: data.maxTokens || 4096,
      temperature: data.temperature || 0.7,
      isActive: true,
    },
  })
  revalidatePath('/agents')
  return agent
}

export async function updateAgent(
  agentId: string,
  data: {
    name?: string
    description?: string
    model?: string
    systemPrompt?: string
    skills?: string[]
    tools?: string[]
    maxTokens?: number
    temperature?: number
    isActive?: boolean
  }
) {
  const agent = await prisma.agentProfile.update({
    where: { id: agentId },
    data,
  })
  revalidatePath('/agents')
  revalidatePath(`/agents/${agentId}`)
  return agent
}

export async function testAgent(agentId: string, prompt: string) {
  const { runAgent } = await import('@/lib/agents')
  
  // Create a temporary "test task" 
  const testTask = await prisma.task.create({
    data: {
      title: 'Agent Test',
      description: prompt,
      status: 'TODO',
      projectId: (await prisma.project.findFirst())?.id || '',
    },
  })

  try {
    const result = await runAgent(agentId, testTask.id)
    
    // Clean up test task
    await prisma.task.delete({ where: { id: testTask.id } })
    
    return {
      success: result.status === 'COMPLETED',
      output: result.output,
      tokens: result.tokens,
      cost: result.cost,
      error: result.error,
    }
  } catch (error: any) {
    // Clean up test task
    await prisma.task.delete({ where: { id: testTask.id } }).catch(() => {})
    
    return {
      success: false,
      error: error.message,
    }
  }
}
