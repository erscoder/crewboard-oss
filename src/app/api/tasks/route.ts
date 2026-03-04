import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { triggerAgentIfNeeded } from '@/app/actions'
import { sendTaskDoneNotification } from '@/lib/slack'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const projectId = searchParams.get('projectId')
  const status = searchParams.get('status')
  const assigneeId = searchParams.get('assigneeId')

  const where: Record<string, unknown> = {}
  if (projectId) where.projectId = projectId
  if (status) where.status = status
  if (assigneeId) where.assigneeId = assigneeId

  const [tasks, projects, users] = await Promise.all([
    prisma.task.findMany({
      where,
      include: { project: true, assignee: true, attachments: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.project.findMany({ orderBy: { name: 'asc' } }),
    prisma.user.findMany({ orderBy: { name: 'asc' } }),
  ])

  return NextResponse.json({ tasks, projects, users })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { title, projectId, description, assigneeId, status } = body

  if (!title || !projectId) {
    return NextResponse.json(
      { error: 'title and projectId are required' },
      { status: 400 }
    )
  }

  const validStatuses = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'REVIEW', 'DONE']
  const taskStatus = status && validStatuses.includes(status) ? status : 'BACKLOG'

  const task = await prisma.$transaction(async (tx) => {
    const project = await tx.project.update({
      where: { id: projectId },
      data: { taskCounter: { increment: 1 } },
    })

    const prefix =
      project.prefix ||
      project.name.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 3) ||
      'TSK'
    const shortId = `${prefix}-${project.taskCounter}`

    return tx.task.create({
      data: {
        title,
        description: description ?? '',
        projectId,
        assigneeId: assigneeId ?? null,
        status: taskStatus,
        shortId,
      },
      include: { project: true, assignee: true, attachments: true },
    })
  })

  await prisma.activity.create({
    data: {
      type: 'created',
      message: `Task "${title}" created`,
      taskId: task.id,
      userId: assigneeId ?? undefined,
    },
  })

  triggerAgentIfNeeded(task.id, assigneeId, taskStatus)

  revalidatePath('/')
  return NextResponse.json(task, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const body = await request.json()
  const { taskId, status, assigneeId, title, description } = body

  if (!taskId) {
    return NextResponse.json(
      { error: 'taskId is required' },
      { status: 400 }
    )
  }

  const task = await prisma.task.findUnique({ where: { id: taskId } })
  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  }

  const updates: Record<string, unknown> = {}

  // Status change
  if (status && status !== task.status) {
    const validStatuses = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'REVIEW', 'DONE']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    updates.status = status
    if (status === 'IN_PROGRESS' && task.status !== 'IN_PROGRESS') {
      updates.startedAt = new Date()
    }
    if (status === 'DONE' && task.status !== 'DONE') {
      updates.completedAt = new Date()
    }
  }

  // Assignee change
  if (assigneeId !== undefined) {
    updates.assigneeId = assigneeId || null
  }

  // Title/description change
  if (title !== undefined) {
    const trimmed = title.trim()
    if (!trimmed) {
      return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 })
    }
    updates.title = trimmed
  }
  if (description !== undefined) {
    updates.description = description?.trim() ?? null
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(task)
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
      attachments: true,
    },
  })

  // Log activities
  const finalStatus = (updates.status as string) ?? task.status

  if (updates.status) {
    const activityType = updates.status === 'DONE' ? 'completed' : 'moved'
    await prisma.activity.create({
      data: {
        type: activityType,
        message:
          activityType === 'completed'
            ? 'Task completed'
            : `Task moved to ${(updates.status as string).replace('_', ' ').toLowerCase()}`,
        taskId,
      },
    })
  }

  if (assigneeId !== undefined) {
    await prisma.activity.create({
      data: {
        type: 'assigned',
        message: updates.assigneeId
          ? `Task assigned to ${updatedTask.assignee?.name ?? 'someone'}`
          : 'Task unassigned',
        taskId,
        userId: (updates.assigneeId as string) ?? undefined,
      },
    })
  }

  if (title !== undefined || description !== undefined) {
    if (!updates.status && assigneeId === undefined) {
      await prisma.activity.create({
        data: {
          type: 'updated',
          message: 'Task details updated',
          taskId,
        },
      })
    }
  }

  // Trigger agent if task is TODO and has a bot assignee
  const effectiveAssigneeId = (updates.assigneeId as string | null) ?? task.assigneeId
  if (finalStatus === 'TODO' && effectiveAssigneeId) {
    if (updates.status === 'TODO' || assigneeId !== undefined) {
      triggerAgentIfNeeded(taskId, effectiveAssigneeId, 'TODO')
    }
  }

  // Slack notification on DONE
  if (updates.status === 'DONE' && updatedTask.project?.notifySlackOnDone) {
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
  return NextResponse.json(updatedTask)
}

export async function DELETE(request: NextRequest) {
  const body = await request.json()
  const { taskId } = body

  if (!taskId) {
    return NextResponse.json(
      { error: 'taskId is required' },
      { status: 400 }
    )
  }

  const task = await prisma.task.findUnique({ where: { id: taskId } })
  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  }

  await prisma.task.delete({ where: { id: taskId } })

  await prisma.activity.create({
    data: {
      type: 'deleted',
      message: `Task "${task.title}" deleted`,
    },
  })

  revalidatePath('/')
  return NextResponse.json({ ok: true })
}
