import { NextRequest, NextResponse } from 'next/server'
import { runAgent, getAgentByName } from '@/lib/agents'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Simple API key auth for cron/webhook calls
function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const apiKey = process.env.AGENT_API_KEY
  
  if (!apiKey) {
    // If no API key configured, allow all (dev mode)
    return true
  }
  
  return authHeader === `Bearer ${apiKey}`
}

/**
 * POST /api/agents/process
 * 
 * Process all pending tasks assigned to agents
 * Called by cron job or manually
 * 
 * Body: { limit?: number, agentName?: string }
 */
export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const { limit = 5, agentName } = await request.json().catch(() => ({}))
  
  // Find tasks assigned to bot users that are in TODO status
  const whereClause: any = {
    status: 'TODO',
    assignee: {
      isBot: true,
    },
  }
  
  // Optionally filter by agent name
  if (agentName) {
    whereClause.assignee.name = agentName
  }
  
  const tasks = await prisma.task.findMany({
    where: whereClause,
    include: { assignee: true, project: true },
    orderBy: { createdAt: 'asc' },
    take: limit,
  })
  
  if (tasks.length === 0) {
    return NextResponse.json({
      message: 'No pending tasks for agents',
      processed: 0,
    })
  }
  
  const results = []
  
  for (const task of tasks) {
    const agent = await getAgentByName(task.assignee!.name)
    
    if (!agent) {
      results.push({
        taskId: task.id,
        taskTitle: task.title,
        error: `No agent profile found for: ${task.assignee!.name}`,
        status: 'SKIPPED',
      })
      continue
    }
    
    try {
      const result = await runAgent(agent.id, task.id)
      
      results.push({
        taskId: task.id,
        taskTitle: task.title,
        runId: result.runId,
        status: result.status,
        tokens: result.tokens,
        cost: result.cost,
        error: result.error,
      })
    } catch (error: any) {
      results.push({
        taskId: task.id,
        taskTitle: task.title,
        error: error.message,
        status: 'FAILED',
      })
    }
  }
  
  const successful = results.filter(r => r.status === 'COMPLETED').length
  const failed = results.filter(r => r.status === 'FAILED').length
  
  return NextResponse.json({
    message: `Processed ${tasks.length} tasks: ${successful} successful, ${failed} failed`,
    processed: tasks.length,
    successful,
    failed,
    results,
  })
}

/**
 * GET /api/agents/process
 * 
 * Get count of pending tasks for agents
 */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const pendingCount = await prisma.task.count({
    where: {
      status: 'TODO',
      assignee: { isBot: true },
    },
  })
  
  const inProgressCount = await prisma.task.count({
    where: {
      status: 'IN_PROGRESS',
      assignee: { isBot: true },
    },
  })
  
  const agents = await prisma.agentProfile.findMany({
    where: { isActive: true },
    select: { id: true, name: true, model: true },
  })
  
  return NextResponse.json({
    pending: pendingCount,
    inProgress: inProgressCount,
    agents,
  })
}
