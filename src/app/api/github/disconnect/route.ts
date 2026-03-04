import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST() {
  await prisma.account.deleteMany({
    where: { provider: 'github' },
  })
  return NextResponse.json({ ok: true })
}
