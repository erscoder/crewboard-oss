import { WebClient, WebAPICallResult } from '@slack/web-api'
import { prisma } from './prisma'

type SlackChannelOption = {
  id: string
  name: string
  is_private?: boolean | null
}

export const SLACK_BOT_SCOPES =
  'chat:write,chat:write.public,channels:read,groups:read,im:read,mpim:read'

export function getSlackRedirectUri() {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3020'
  return `${baseUrl.replace(/\/$/, '')}/api/slack/callback`
}

function createClient(token?: string) {
  return new WebClient(token)
}

export async function getSlackWorkspace(workspaceId?: string) {
  if (workspaceId) {
    return prisma.slackWorkspace.findUnique({ where: { id: workspaceId } })
  }
  return prisma.slackWorkspace.findFirst({ orderBy: { createdAt: 'desc' } })
}

export async function fetchSlackChannels(workspaceId?: string): Promise<SlackChannelOption[]> {
  const workspace = await getSlackWorkspace(workspaceId)
  if (!workspace?.accessToken) return []

  const client = createClient(workspace.accessToken)
  const channels: SlackChannelOption[] = []

  let cursor: string | undefined
  // Limit pagination to avoid long fetches
  for (let i = 0; i < 3; i++) {
    const res = (await client.conversations.list({
      limit: 200,
      cursor,
      types: 'public_channel,private_channel',
    })) as WebAPICallResult & { channels?: any[]; response_metadata?: { next_cursor?: string } }

    if (!res.ok || !res.channels) break

    channels.push(
      ...res.channels
        .filter((ch) => ch.id)
        .map((ch) => ({
          id: ch.id as string,
          name: (ch.name as string) || (ch.id as string),
          is_private: ch.is_private ?? false,
        })),
    )

    const next = res.response_metadata?.next_cursor
    if (!next) break
    cursor = next
  }

  return channels
}

export async function upsertSlackChannel(workspaceId: string, channelId: string, name?: string) {
  return prisma.slackChannel.upsert({
    where: { workspaceId_channelId: { workspaceId, channelId } },
    update: { name: name || channelId },
    create: { workspaceId, channelId, name: name || channelId },
  })
}

async function resolveChannelName(client: WebClient, channelId: string, provided?: string) {
  if (provided) return provided
  try {
    const info = (await client.conversations.info({ channel: channelId })) as WebAPICallResult & {
      channel?: { name?: string }
    }
    if (info.ok && info.channel?.name) return info.channel.name
  } catch {
    // ignore
  }
  return channelId
}

/**
 * Send notification when a task is assigned to someone
 */
export async function sendTaskAssignedNotification(
  taskId: string,
  assigneeName: string,
  options?: { slackChannel?: string; workspaceId?: string },
) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: {
        include: {
          slackChannel: { include: { workspace: true } },
          slackWorkspace: true,
        },
      },
    },
  })

  if (!task?.project) {
    return { ok: false, error: 'Task or project not found' }
  }

  const slackChannelId =
    options?.slackChannel ?? task.project.slackChannel?.channelId ?? undefined
  if (!slackChannelId) {
    return { ok: false, error: 'No Slack channel configured' }
  }

  const workspace =
    task.project.slackChannel?.workspace ||
    (task.project.slackWorkspaceId
      ? await getSlackWorkspace(task.project.slackWorkspaceId)
      : null) ||
    (options?.workspaceId ? await getSlackWorkspace(options.workspaceId) : null) ||
    (await getSlackWorkspace())

  if (!workspace?.accessToken) {
    return { ok: false, error: 'No Slack workspace connected' }
  }

  const client = createClient(workspace.accessToken)
  const taskUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3020'}/?task=${taskId}`

  try {
    await client.chat.postMessage({
      channel: slackChannelId,
      text: `📋 "${task.title}" assigned to ${assigneeName}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `:clipboard: *${task.shortId || 'Task'}* assigned to *${assigneeName}*`,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*<${taskUrl}|${task.title}>*\n${task.description?.slice(0, 200) || '_No description_'}`,
          },
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Project: *${task.project.name}* | Status: *${task.status}*`,
            },
          ],
        },
      ],
    })

    return { ok: true }
  } catch (error: any) {
    console.error('Failed to send Slack assignment notification', error?.data || error?.message)
    return { ok: false, error: 'Failed to send notification' }
  }
}

/**
 * Send a comment to Slack thread
 */
export async function sendCommentToSlack(
  taskId: string,
  commentContent: string,
  authorName: string,
  options?: { slackChannel?: string; workspaceId?: string; threadTs?: string },
) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: {
        include: {
          slackChannel: { include: { workspace: true } },
          slackWorkspace: true,
        },
      },
    },
  })

  if (!task?.project) {
    return { ok: false, error: 'Task or project not found' }
  }

  const slackChannelId =
    options?.slackChannel ?? task.project.slackChannel?.channelId ?? undefined
  if (!slackChannelId) {
    return { ok: false, error: 'No Slack channel configured' }
  }

  const workspace =
    task.project.slackChannel?.workspace ||
    (task.project.slackWorkspaceId
      ? await getSlackWorkspace(task.project.slackWorkspaceId)
      : null) ||
    (options?.workspaceId ? await getSlackWorkspace(options.workspaceId) : null) ||
    (await getSlackWorkspace())

  if (!workspace?.accessToken) {
    return { ok: false, error: 'No Slack workspace connected' }
  }

  const client = createClient(workspace.accessToken)

  try {
    const result = await client.chat.postMessage({
      channel: slackChannelId,
      thread_ts: options?.threadTs || task.slackThreadTs || undefined,
      text: `💬 ${authorName}: ${commentContent}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `💬 *${authorName}* commented on *${task.shortId || task.title}*:\n\n${commentContent}`,
          },
        },
      ],
    }) as any

    // Save thread_ts for future replies if this was the first message
    if (result.ts && !task.slackThreadTs) {
      await prisma.task.update({
        where: { id: taskId },
        data: { slackThreadTs: result.ts },
      })
    }

    return { ok: true, ts: result.ts }
  } catch (error: any) {
    console.error('Failed to send comment to Slack', error?.data || error?.message)
    return { ok: false, error: 'Failed to send comment' }
  }
}

export async function sendTaskDoneNotification(
  taskId: string,
  options?: { slackChannel?: string; workspaceId?: string; channelName?: string },
) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      assignee: true,
      project: {
        include: {
          slackChannel: { include: { workspace: true } },
          slackWorkspace: true,
        },
      },
    },
  })

  if (!task?.project) {
    return { ok: false, error: 'Task or project not found' }
  }

  const slackChannelId =
    options?.slackChannel ?? task.project.slackChannel?.channelId ?? undefined
  if (!slackChannelId) {
    return { ok: false, error: 'No Slack channel configured' }
  }

  const workspace =
    task.project.slackChannel?.workspace ||
    (task.project.slackWorkspaceId
      ? await getSlackWorkspace(task.project.slackWorkspaceId)
      : null) ||
    (options?.workspaceId ? await getSlackWorkspace(options.workspaceId) : null) ||
    (await getSlackWorkspace())

  if (!workspace?.accessToken) {
    return { ok: false, error: 'No Slack workspace connected' }
  }

  const client = createClient(workspace.accessToken)
  const channelName =
    options?.channelName ??
    task.project.slackChannel?.name ??
    (await resolveChannelName(client, slackChannelId))

  const text = `:tada: "${task.title}" was marked DONE in ${task.project.name}`

  try {
    await client.chat.postMessage({
      channel: slackChannelId,
      text,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `:tada: *${task.title}* was marked *DONE* in *${task.project.name}*.`,
          },
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: task.assignee?.name
                ? `Assignee: *${task.assignee.name}*`
                : 'Unassigned task',
            },
            {
              type: 'mrkdwn',
              text: `Status: *DONE*`,
            },
          ],
        },
      ],
    })

    await upsertSlackChannel(workspace.id, slackChannelId, channelName)

    return { ok: true }
  } catch (error: any) {
    console.error('Failed to send Slack notification', error?.data || error?.message || error)
    return { ok: false, error: 'Failed to send Slack notification' }
  }
}
