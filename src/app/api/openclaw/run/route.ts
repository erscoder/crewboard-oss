import { NextRequest, NextResponse } from 'next/server'
import { createOpenClawClient } from '@/lib/openclaw-client'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { taskId, agentId, message } = body as {
      taskId?: string
      agentId: string
      message: string
    }

    if (!agentId || !message) {
      return NextResponse.json({ error: 'agentId and message are required' }, { status: 400 })
    }

    const result = await createOpenClawClient().sendMessage(agentId, message)

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 502 })
    }

    // Update task status if taskId provided
    if (taskId) {
      await prisma.task.update({
        where: { id: taskId },
        data: { status: 'IN_PROGRESS' },
      }).catch(() => {
        // Ignore if task not found
      })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
