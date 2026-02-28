import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
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
        select: { tasks: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(projects)
}
