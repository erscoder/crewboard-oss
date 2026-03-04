import { NextResponse } from 'next/server'
import { createOpenClawClient } from '@/lib/openclaw-client'

export const dynamic = 'force-dynamic'

export async function GET() {
  const client = createOpenClawClient()
  const connected = await client.ping()
  const agents = connected ? await client.getAgents() : []
  return NextResponse.json({ connected, agents })
}
