import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

function randomProjectColor(): string {
  const colors = [
    '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
    '#f43f5e', '#ef4444', '#f97316', '#eab308', '#84cc16',
    '#22c55e', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6',
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}

export async function POST(req: Request) {
  const body = await req.json()
  const { repo } = body ?? {}
  if (!repo?.id || !repo?.full_name || !repo?.name) {
    return NextResponse.json({ error: 'Invalid repo payload' }, { status: 400 })
  }
  const existingLink = await prisma.gitHubRepo.findFirst({
    where: { repoId: String(repo.id) },
    include: { project: true },
  })
  if (existingLink) {
    return NextResponse.json({ error: 'Repository already linked', project: existingLink.project }, { status: 409 })
  }
  const project = await prisma.$transaction(async (tx) => {
    const newProject = await tx.project.create({
      data: { name: repo.name, color: randomProjectColor() },
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
