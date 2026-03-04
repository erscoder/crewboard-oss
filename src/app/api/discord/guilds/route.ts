import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const guilds = await prisma.discordGuild.findMany({
    include: { channels: { orderBy: { name: 'asc' } } },
    orderBy: { guildName: 'asc' },
  })
  return NextResponse.json({ guilds })
}
