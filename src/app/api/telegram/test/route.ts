import { NextRequest, NextResponse } from 'next/server'
import { sendTelegramMessage } from '@/lib/telegram'

export async function POST(req: NextRequest) {
  const { chatId } = await req.json()
  if (!chatId) {
    return NextResponse.json({ error: 'chatId required' }, { status: 400 })
  }

  const result = await sendTelegramMessage(chatId, '✅ Crewboard test message — Telegram is connected!')
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
