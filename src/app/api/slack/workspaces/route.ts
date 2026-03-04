import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {

  const workspaces = await prisma.slackWorkspace.findMany({
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

  const { searchParams } = new URL(req.url)
  const workspaceId = searchParams.get('id')

  if (!workspaceId) {
    return NextResponse.json({ error: 'Missing workspace id' }, { status: 400 })
  }

  const workspace = await prisma.slackWorkspace.findFirst({
    where: {
      id: workspaceId,
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
