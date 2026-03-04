import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const config = await prisma.appConfig.findUnique({ where: { id: 'global' } })
  return NextResponse.json(config ?? {
    agentDeliveryEnabled: false,
    agentDeliveryChannel: null,
    agentDeliveryTo: null,
    agentDeliveryBestEffort: true,
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { agentDeliveryEnabled, agentDeliveryChannel, agentDeliveryTo, agentDeliveryBestEffort } = body

    const config = await prisma.appConfig.upsert({
      where: { id: 'global' },
      create: {
        id: 'global',
        agentDeliveryEnabled: agentDeliveryEnabled ?? false,
        agentDeliveryChannel: agentDeliveryChannel ?? null,
        agentDeliveryTo: agentDeliveryTo ?? null,
        agentDeliveryBestEffort: agentDeliveryBestEffort ?? true,
      },
      update: {
        agentDeliveryEnabled: agentDeliveryEnabled ?? false,
        agentDeliveryChannel: agentDeliveryChannel ?? null,
        agentDeliveryTo: agentDeliveryTo ?? null,
        agentDeliveryBestEffort: agentDeliveryBestEffort ?? true,
      },
    })

    return NextResponse.json(config)
  } catch (err: any) {
    console.error('[agent-delivery] POST error:', err)
    return NextResponse.json({ error: err.message ?? 'Internal error' }, { status: 500 })
  }
}
