import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const workspaces = await prisma.slackWorkspace.findMany({
    where: {
      installedById: session.user.id,
    },
    select: {
      id: true,
      teamId: true,
      teamName: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return NextResponse.json({ workspaces })
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const workspaceId = searchParams.get('id')

  if (!workspaceId) {
    return NextResponse.json({ error: 'Missing workspace id' }, { status: 400 })
  }

  // Only allow deleting own workspaces
  const workspace = await prisma.slackWorkspace.findFirst({
    where: {
      id: workspaceId,
      installedById: session.user.id,
    },
  })

  if (!workspace) {
    return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
  }

  await prisma.slackWorkspace.delete({
    where: { id: workspaceId },
  })

  return NextResponse.json({ success: true })
}
