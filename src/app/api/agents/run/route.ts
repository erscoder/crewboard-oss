import { NextRequest, NextResponse } from 'next/server'
import { runAgent, getAgentByName } from '@/lib/agents'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST(request: NextRequest) {
  const { taskId } = await request.json().catch(() => ({}))
  if (!taskId) {
    return NextResponse.json({ error: 'taskId is required' }, { status: 400 })
  }
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { assignee: true },
  })
  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  }
  if (!task.assignee?.isBot) {
    return NextResponse.json({ error: 'Task is not assigned to an agent' }, { status: 400 })
  }
  const agent = await getAgentByName(task.assignee.name)
  if (!agent) {
    return NextResponse.json({ error: `No agent profile found for: ${task.assignee.name}` }, { status: 404 })
  }
  try {
    const result = await runAgent(agent.id, taskId)
    return NextResponse.json({
      success: result.status === 'COMPLETED',
      runId: result.runId,
      status: result.status,
      output: result.output,
      error: result.error,
      tokens: result.tokens,
      cost: result.cost,
    })
  } catch (error: any) {
    console.error('[agent-run]', error)
    return NextResponse.json({ error: error.message || 'Agent run failed' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const taskId = request.nextUrl.searchParams.get('taskId')
  if (!taskId) {
    return NextResponse.json({ error: 'taskId is required' }, { status: 400 })
  }
  const runs = await prisma.agentRun.findMany({
    where: { taskId },
    include: { agent: true },
    orderBy: { createdAt: 'desc' },
    take: 5,
  })
  return NextResponse.json({ runs })
}
