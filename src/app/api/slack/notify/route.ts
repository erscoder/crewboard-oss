import { NextResponse } from 'next/server'
import { sendTaskDoneNotification } from '@/lib/slack'

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const taskId = body?.taskId as string | undefined
  const channelId = body?.channel as string | undefined
  const workspaceId = body?.workspaceId as string | undefined
  const channelName = body?.channelName as string | undefined

  if (!taskId) {
    return NextResponse.json({ ok: false, error: 'taskId is required' }, { status: 400 })
  }

  const result = await sendTaskDoneNotification(taskId, {
    slackChannel: channelId,
    workspaceId,
    channelName,
  })

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
