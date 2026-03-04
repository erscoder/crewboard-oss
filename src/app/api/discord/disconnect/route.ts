import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const guildId = searchParams.get('id')
  if (!guildId) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  await prisma.discordGuild.delete({ where: { id: guildId } })
  return NextResponse.json({ ok: true })
}
