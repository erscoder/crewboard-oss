import { NextResponse } from 'next/server'
import { createOpenClawClient } from '@/lib/openclaw-client'

export async function GET() {
  try {
    const client = createOpenClawClient()
    const connected = await client.ping()

    let agentCount = 0
    if (connected) {
      try {
        const agents = await client.getAgents()
        agentCount = agents.length
      } catch {
        // ignore
      }
    }

    return NextResponse.json({ connected, agentCount })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ connected: false, agentCount: 0, error: message })
  }
}
