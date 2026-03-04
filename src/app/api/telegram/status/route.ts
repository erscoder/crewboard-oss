import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const TELEGRAM_API = 'https://api.telegram.org'

export async function GET() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  if (!botToken) {
    return NextResponse.json({ connected: false, error: 'TELEGRAM_BOT_TOKEN not configured' })
  }

  const config = await prisma.appConfig.findUnique({ where: { id: 'global' } })
  if (config?.telegramDisabled) {
    return NextResponse.json({ connected: false, disabled: true, error: 'Disconnected' })
  }

  try {
    const res = await fetch(`${TELEGRAM_API}/bot${botToken}/getMe`)
    if (!res.ok) {
      return NextResponse.json({ connected: false, error: 'Invalid bot token' })
    }
    const data = await res.json()
    return NextResponse.json({
      connected: true,
      bot: {
        username: data.result.username,
        firstName: data.result.first_name,
      },
    })
  } catch {
    return NextResponse.json({ connected: false, error: 'Failed to verify bot' })
  }
}
