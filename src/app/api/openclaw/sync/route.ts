import { NextResponse } from 'next/server'
import { createOpenClawClient } from '@/lib/openclaw-client'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const client = createOpenClawClient()
    const agents = await client.getAgents()

    const synced = await Promise.all(
      agents.map(async (agent) => {
        const profile = await prisma.agentProfile.upsert({
          where: { name: agent.name },
          update: {
            model: agent.model || 'unknown',
          },
          create: {
            name: agent.name,
            model: agent.model || 'unknown',
            systemPrompt: `OpenClaw agent: ${agent.name}${agent.workspace ? ` (workspace: ${agent.workspace})` : ''}`,
            skills: [],
            tools: [],
          },
        })
        return { ...profile, externalId: agent.id, workspace: agent.workspace }
      })
    )

    return NextResponse.json({ agents: synced, count: synced.length })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
