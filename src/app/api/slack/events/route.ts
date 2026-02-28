import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createHmac } from 'crypto'

// Verify Slack request signature
function verifySlackSignature(
  signature: string | null,
  timestamp: string | null,
  body: string
): boolean {
  const signingSecret = process.env.SLACK_SIGNING_SECRET
  if (!signingSecret || !signature || !timestamp) return false

  // Check timestamp is recent (within 5 minutes)
  const time = Math.floor(Date.now() / 1000)
  if (Math.abs(time - parseInt(timestamp)) > 60 * 5) return false

  const sigBasestring = `v0:${timestamp}:${body}`
  const mySignature = `v0=${createHmac('sha256', signingSecret)
    .update(sigBasestring)
    .digest('hex')}`

  return signature === mySignature
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('x-slack-signature')
  const timestamp = request.headers.get('x-slack-request-timestamp')

  // Verify signature in production
  if (process.env.NODE_ENV === 'production') {
    if (!verifySlackSignature(signature, timestamp, body)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  }

  const payload = JSON.parse(body)

  // Handle URL verification challenge
  if (payload.type === 'url_verification') {
    return NextResponse.json({ challenge: payload.challenge })
  }

  // Handle events
  if (payload.type === 'event_callback') {
    const event = payload.event

    // Handle message events (new messages in threads)
    if (event.type === 'message' && event.thread_ts && !event.bot_id) {
      await handleThreadReply(event)
    }
  }

  return NextResponse.json({ ok: true })
}

async function handleThreadReply(event: any) {
  const { thread_ts, text, user: slackUserId, channel } = event

  // Find task by slackThreadTs
  const task = await prisma.task.findFirst({
    where: { slackThreadTs: thread_ts },
    include: { project: { include: { slackWorkspace: true } } },
  })

  if (!task) {
    console.log('[slack-events] No task found for thread:', thread_ts)
    return
  }

  // Get Slack user info to find matching Crewboard user
  const workspace = task.project?.slackWorkspace
  if (!workspace?.accessToken) return

  try {
    const { WebClient } = await import('@slack/web-api')
    const client = new WebClient(workspace.accessToken)

    const userInfo = (await client.users.info({ user: slackUserId })) as any
    const slackUserName = userInfo.user?.real_name || userInfo.user?.name || 'Slack User'
    const slackUserEmail = userInfo.user?.profile?.email

    // Try to find matching Crewboard user by email
    let author = slackUserEmail
      ? await prisma.user.findFirst({ where: { email: slackUserEmail } })
      : null

    // If no matching user, create a system comment or use first user
    if (!author) {
      author = await prisma.user.findFirst({ where: { isBot: false } })
    }

    if (!author) {
      console.log('[slack-events] No author found for comment')
      return
    }

    // Create comment in Crewboard (mark as fromSlack to avoid loop)
    await prisma.comment.create({
      data: {
        taskId: task.id,
        authorId: author.id,
        content: `[via Slack - ${slackUserName}] ${text}`,
      },
    })

    console.log(`[slack-events] Created comment from Slack on task ${task.shortId}`)
  } catch (error) {
    console.error('[slack-events] Failed to process thread reply:', error)
  }
}
