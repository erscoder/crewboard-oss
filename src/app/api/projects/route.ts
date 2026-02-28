import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const projects = await prisma.project.findMany({
    include: {
      githubRepo: {
        select: {
          id: true,
          repoId: true,
          name: true,
          fullName: true,
          htmlUrl: true,
          private: true,
        },
      },
      slackWorkspace: {
        select: {
          id: true,
          teamName: true,
        },
      },
      slackChannel: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          tasks: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return NextResponse.json(projects)
}
