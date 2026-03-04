import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const channels = await prisma.slackChannel.findMany({
    include: { workspace: { select: { teamName: true } } },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json({ channels })
}
