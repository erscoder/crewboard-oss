'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

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

  await prisma.task.update({
    where: { id: taskId },
    data: updates,
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
