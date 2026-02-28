import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function POST(req: Request) {

  const body = await req.json()
  const { projectId, repo } = body ?? {}

  if (!projectId || !repo?.id || !repo?.full_name) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  // Ensure project exists
  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  // Upsert GitHubRepo for the project (one repo per project)
  const linked = await prisma.gitHubRepo.upsert({
    where: { projectId },
    update: {
      repoId: String(repo.id),
      name: repo.name,
      fullName: repo.full_name,
      htmlUrl: repo.html_url,
      private: !!repo.private,
      owner: repo.owner?.login ?? '',
    },
    create: {
      projectId,
      repoId: String(repo.id),
      name: repo.name,
      fullName: repo.full_name,
      htmlUrl: repo.html_url,
      private: !!repo.private,
      owner: repo.owner?.login ?? '',
    },
  })

  revalidatePath('/projects')
  revalidatePath('/')

  return NextResponse.json(linked)
}
