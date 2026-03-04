import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  let reconnect = false
  try {
    const body = await request.json()
    reconnect = body?.reconnect === true
  } catch {
    // No body = disconnect
  }

  await prisma.appConfig.upsert({
    where: { id: 'global' },
    update: { telegramDisabled: !reconnect },
    create: { id: 'global', telegramDisabled: !reconnect },
  })

  return NextResponse.json({ ok: true })
}
