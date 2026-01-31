'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { sendTaskDoneNotification } from '@/lib/slack'
import { runAgent, getAgentByName } from '@/lib/agents'

/**
 * Trigger agent run if task is assigned to a bot and in TODO status
 */
async function triggerAgentIfNeeded(taskId: string, assigneeId?: string | null, status?: string) {
  if (!assigneeId || status !== 'TODO') return
  
  try {
    const assignee = await prisma.user.findUnique({ where: { id: assigneeId } })
    if (!assignee?.isBot) return
    
    const agent = await getAgentByName(assignee.name)
    if (!agent) {
      console.log(`[agent-trigger] No agent profile for: ${assignee.name}`)
      return
    }
    
    console.log(`[agent-trigger] Starting ${agent.name} on task ${taskId}`)
    
    // Run async - don't block the response
    runAgent(agent.id, taskId).then(result => {
      console.log(`[agent-trigger] ${agent.name} finished: ${result.status}`)
    }).catch(err => {
      console.error(`[agent-trigger] ${agent.name} failed:`, err.message)
    })
  } catch (error) {
    console.error('[agent-trigger] Error:', error)
  }
}

type AttachmentInput = {
  url: string
  filename?: string
  mimeType?: string
  size?: number
}

export async function createTask(data: {
  title: string
  description: string
  projectId: string
  assigneeId?: string
  status?: 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE'
  attachments?: AttachmentInput[]
}) {
  const attachmentsPayload =
    data.attachments
      ?.filter((file) => file.url?.trim())
      .map((file) => ({
        url: file.url.trim(),
        filename: file.filename?.trim() || deriveFilename(file.url),
        mimeType: file.mimeType ?? null,
        size: file.size ?? null,
      })) ?? []

  const task = await prisma.task.create({
    data: {
      title: data.title,
      description: data.description,
      projectId: data.projectId,
      assigneeId: data.assigneeId,
      status: data.status ?? 'BACKLOG',
      attachments: attachmentsPayload.length
        ? { create: attachmentsPayload }
        : undefined,
    },
    include: { attachments: true, project: true, assignee: true },
  })

  // Log activity
  await prisma.activity.create({
    data: {
      type: 'created',
      message: `Task "${data.title}" created`,
      taskId: task.id,
      userId: data.assigneeId,
    },
  })

  // Auto-trigger agent if assigned to bot and status is TODO
  triggerAgentIfNeeded(task.id, data.assigneeId, data.status ?? 'BACKLOG')

  revalidatePath('/')
  return task
}

export async function moveTask(
  taskId: string,
  newStatus: 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE',
  newOrder: number
) {
  const task = await prisma.task.findUnique({ where: { id: taskId } })
  if (!task) return

  const updates: any = {
    status: newStatus,
    order: newOrder,
  }

  // Track status changes
  if (newStatus === 'IN_PROGRESS' && task.status !== 'IN_PROGRESS') {
    updates.startedAt = new Date()
  }
  
  if (newStatus === 'DONE' && task.status !== 'DONE') {
    updates.completedAt = new Date()
  }

  const updatedTask = await prisma.task.update({
    where: { id: taskId },
    data: updates,
    include: {
      project: {
        include: {
          slackChannel: { include: { workspace: true } },
          slackWorkspace: true,
        },
      },
      assignee: true,
    },
  })

  // Log activity
  const activityType = newStatus === 'DONE' ? 'completed' : 'moved'
  await prisma.activity.create({
    data: {
      type: activityType,
      message:
        activityType === 'completed'
          ? 'Task completed'
          : `Task moved to ${newStatus.replace('_', ' ').toLowerCase()}`,
      taskId,
    },
  })

  // Auto-trigger agent if moved to TODO and assigned to bot
  if (newStatus === 'TODO' && task.status !== 'TODO') {
    triggerAgentIfNeeded(taskId, task.assigneeId, newStatus)
  }

  if (newStatus === 'DONE' && updatedTask?.project?.notifySlackOnDone) {
    const channelId = updatedTask.project.slackChannel?.channelId
    const workspaceId = updatedTask.project.slackWorkspaceId

    sendTaskDoneNotification(taskId, {
      slackChannel: channelId ?? undefined,
      workspaceId: workspaceId ?? undefined,
      channelName: updatedTask.project.slackChannel?.name,
    }).catch((err) => {
      console.error('Slack notification failed', err)
    })
  }

  revalidatePath('/')
}

export async function deleteTask(taskId: string) {
  const task = await prisma.task.findUnique({ where: { id: taskId } })
  if (!task) return

  await prisma.task.delete({ where: { id: taskId } })

  await prisma.activity.create({
    data: {
      type: 'deleted',
      message: `Task "${task.title}" deleted`,
    },
  })

  revalidatePath('/')
}

export async function updateBotStatus(isWorking: boolean, currentTaskId?: string) {
  await prisma.botStatus.upsert({
    where: { id: 'harvis' },
    update: {
      isWorking,
      currentTaskId,
      lastPing: new Date(),
    },
    create: {
      id: 'harvis',
      isWorking,
      currentTaskId,
    },
  })
}

export async function updateTaskAssignee(taskId: string, assigneeId?: string | null) {
  const task = await prisma.task.findUnique({ where: { id: taskId } })
  if (!task) return null

  const nextAssigneeId = assigneeId || null

  const updatedTask = await prisma.task.update({
    where: { id: taskId },
    data: { assigneeId: nextAssigneeId },
    include: { assignee: true, project: true, attachments: true },
  })

  await prisma.activity.create({
    data: {
      type: 'assigned',
      message: nextAssigneeId
        ? `Task assigned to ${updatedTask.assignee?.name ?? 'someone'}`
        : 'Task unassigned',
      taskId,
      userId: nextAssigneeId ?? undefined,
    },
  })

  revalidatePath('/')
  return updatedTask
}

// Seed initial data if empty
export async function seedData() {
  const userCount = await prisma.user.count()
  if (userCount > 0) return

  // Create users
  const kike = await prisma.user.create({
    data: { name: 'Kike', isBot: false },
  })

  const harvis = await prisma.user.create({
    data: { name: 'Harvis', isBot: true },
  })

  // Create projects
  const hypersignals = await prisma.project.create({
    data: { name: 'HyperSignals', color: '#f59e0b' },
  })

  const clawdbot = await prisma.project.create({
    data: { name: 'Clawdbot', color: '#8b5cf6' },
  })

  const missionControl = await prisma.project.create({
    data: { name: 'Mission Control', color: '#22c55e' },
  })

  // Create sample tasks
  await prisma.task.createMany({
    data: [
      { title: 'Add Stripe payments to HyperSignals', projectId: hypersignals.id, status: 'BACKLOG' },
      { title: 'Setup Telegram premium channel', projectId: hypersignals.id, status: 'BACKLOG' },
      { title: 'Create autotrader dashboard UI', projectId: hypersignals.id, status: 'IN_PROGRESS', assigneeId: harvis.id },
      { title: 'Add new skill: crypto-alerts', projectId: clawdbot.id, status: 'BACKLOG' },
      { title: 'Finish Mission Control UI', projectId: missionControl.id, status: 'REVIEW', assigneeId: harvis.id },
    ],
  })

  // Create bot status
  await prisma.botStatus.create({
    data: { id: 'harvis', isWorking: false },
  })

  revalidatePath('/')
}

function deriveFilename(url: string) {
  try {
    const pathname = new URL(url).pathname
    const lastSegment = pathname.split('/').filter(Boolean).pop()
    return lastSegment || 'attachment'
  } catch {
    return 'attachment'
  }
}
