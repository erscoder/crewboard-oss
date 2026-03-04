import { NextResponse } from 'next/server'
import { createOpenClawClient } from '@/lib/openclaw-client'

export const dynamic = 'force-dynamic'

/** Returns YYYY-MM-DD date strings matching the gateway's sessions.usage format. */
function getDateRange(range: string): { startDate: string; endDate: string } {
  const now = new Date()
  const toDateStr = (d: Date) => d.toISOString().slice(0, 10)
  const endDate = toDateStr(now)

  if (range === '7d') {
    const start = new Date(now)
    start.setDate(start.getDate() - 7)
    return { startDate: toDateStr(start), endDate }
  }

  if (range === '30d') {
    const start = new Date(now)
    start.setDate(start.getDate() - 30)
    return { startDate: toDateStr(start), endDate }
  }

  // Default: today
  return { startDate: endDate, endDate }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const range = searchParams.get('range') || 'today'

  if (!['today', '7d', '30d'].includes(range)) {
    return NextResponse.json({ error: 'Invalid range. Use today, 7d, or 30d' }, { status: 400 })
  }

  const client = createOpenClawClient()
  const { startDate, endDate } = getDateRange(range)

  const stats = await client.getUsageStats(startDate, endDate)
  if (!stats) {
    return NextResponse.json(
      { error: 'Could not fetch usage stats. Check OPENCLAW_GATEWAY_TOKEN.' },
      { status: 503 },
    )
  }

  return NextResponse.json({ ...stats, range, startDate, endDate })
}
