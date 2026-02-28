'use server'

import { prisma } from '@/lib/prisma'
import { createProjectFolder, getProjectFolders } from '@/lib/projects'
import { revalidatePath } from 'next/cache'
import { upsertSlackChannel } from '@/lib/slack'

// Random colors for projects
const PROJECT_COLORS = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#f43f5e', // rose
  '#f59e0b', // amber
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#3b82f6', // blue
]

function getRandomColor(): string {
  return PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)]
}

function revalidateProjects() {
  revalidatePath('/projects')
  revalidatePath('/')
}

async function getActorUserId() {
  const session = { user: { id: 'oss-user', name: 'User' } }
  if (session?.user?.id) return 'oss-user'

  const fallback = await prisma.user.findFirst({
    where: { isBot: false },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  })

  return fallback?.id ?? null
}

/**
 * Sync database projects with filesystem folders
 * - Creates DB entries for folders that don't exist in DB
 * - Returns all projects
 */
export async function syncProjects() {
  const folders = await getProjectFolders()
  const dbProjects = await prisma.project.findMany()

  const dbNames = new Set(dbProjects.map(p => p.name.toLowerCase()))

  // Create DB entries for folders not in DB
  for (const folder of folders) {
    if (!dbNames.has(folder.name.toLowerCase())) {
      await prisma.project.create({
        data: {
          name: folder.name,
          color: getRandomColor(),
        },
      })
    }
  }

  revalidateProjects()
  return prisma.project.findMany({
    include: {
      _count: { select: { tasks: true } },
      githubRepo: true,
      slackChannel: true,
      slackWorkspace: true,
    },
    orderBy: { name: 'asc' },
  })
}

/**
 * Create a new project (folder + DB entry)
 */
export async function createProject(data: { name: string; description?: string; color?: string }) {

  // Create folder with README and git init
  const folder = createProjectFolder(data.name, data.description)

  // Create DB entry
  const project = await prisma.project.create({
    data: {
      name: folder.name,
      color: data.color || getRandomColor(),
    },
  })

  revalidateProjects()
  return project
}

/**
 * Update project color
 */
export async function updateProject(id: string, data: { color?: string }) {
  const project = await prisma.project.update({
    where: { id },
    data: {
      color: data.color,
    },
  })

  revalidateProjects()
  return project
}

/**
 * Delete project from DB (does NOT delete folder)
 */
export async function deleteProject(id: string) {
  // Move tasks to no project
  await prisma.task.updateMany({
    where: { projectId: id },
    data: { projectId: undefined as any }, // This will fail - need to handle differently
  })

  await prisma.project.delete({ where: { id } })
  revalidateProjects()
}

export async function linkProjectSlackChannel(params: {
  projectId: string
  workspaceId: string
  channelId: string
  channelName?: string
}) {
  const { projectId, workspaceId, channelId, channelName } = params
  const channel = await upsertSlackChannel(workspaceId, channelId, channelName)

  await prisma.project.update({
    where: { id: projectId },
    data: {
      slackWorkspaceId: workspaceId,
      slackChannelId: channel.id,
    },
  })

  revalidateProjects()
  return channel
}

export async function toggleProjectSlackNotifications(projectId: string, enabled: boolean) {
  await prisma.project.update({
    where: { id: projectId },
    data: { notifySlackOnDone: enabled },
  })

  revalidateProjects()
}

export async function disconnectSlackWorkspace(workspaceId?: string) {
  const workspace = workspaceId
    ? await prisma.slackWorkspace.findUnique({ where: { id: workspaceId } })
    : await prisma.slackWorkspace.findFirst({ orderBy: { createdAt: 'desc' } })

  if (!workspace) return

  await prisma.project.updateMany({
    where: { slackWorkspaceId: workspace.id },
    data: {
      slackWorkspaceId: null,
      slackChannelId: null,
      notifySlackOnDone: false,
    },
  })

  await prisma.slackChannel.deleteMany({ where: { workspaceId: workspace.id } })
  await prisma.slackWorkspace.delete({ where: { id: workspace.id } })

  revalidateProjects()
  revalidatePath('/')
}
