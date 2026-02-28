import { NextRequest, NextResponse } from 'next/server'
import { createOpenClawClient } from '@/lib/openclaw-client'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { taskId, agentSessionKey, message } = body as {
      taskId?: string
      agentSessionKey?: string
      message: string
    }

    if (!message) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 })
    }

    const client = createOpenClawClient()
    let result: { reply: string; status: string; sessionKey?: string }

    if (agentSessionKey) {
      result = await client.sendTask(agentSessionKey, message)
    } else {
      const spawned = await client.spawnTask(message)
      result = { ...spawned, status: 'spawned' }
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

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
