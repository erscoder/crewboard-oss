import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

// Generate a random pastel color for the project
function randomProjectColor(): string {
  const colors = [
    '#6366f1', // indigo
    '#8b5cf6', // violet
    '#a855f7', // purple
    '#d946ef', // fuchsia
    '#ec4899', // pink
    '#f43f5e', // rose
    '#ef4444', // red
    '#f97316', // orange
    '#eab308', // yellow
    '#84cc16', // lime
    '#22c55e', // green
    '#14b8a6', // teal
    '#06b6d4', // cyan
    '#0ea5e9', // sky
    '#3b82f6', // blue
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { repo } = body ?? {}

  if (!repo?.id || !repo?.full_name || !repo?.name) {
    return NextResponse.json({ error: 'Invalid repo payload' }, { status: 400 })
  }

  // Check if repo is already linked to a project
  const existingLink = await prisma.gitHubRepo.findFirst({
    where: { repoId: String(repo.id) },
    include: { project: true },
  })

  if (existingLink) {
    return NextResponse.json(
      { error: 'Repository already linked', project: existingLink.project },
      { status: 409 }
    )
  }

  // Create project and link repo in a transaction
  const project = await prisma.$transaction(async (tx) => {
    const newProject = await tx.project.create({
      data: {
        name: repo.name,
        color: randomProjectColor(),
      },
    })

    await tx.gitHubRepo.create({
      data: {
        projectId: newProject.id,
        repoId: String(repo.id),
        name: repo.name,
        fullName: repo.full_name,
        htmlUrl: repo.html_url,
        private: !!repo.private,
        owner: repo.owner?.login ?? '',
      },
    })

    return newProject
  })

  revalidatePath('/projects')
  revalidatePath('/')
  revalidatePath('/settings')

  return NextResponse.json({ success: true, project })
}
