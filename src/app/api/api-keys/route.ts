import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { ApiProvider } from '@prisma/client'

import { authOptions } from '@/auth'
import {
  deleteApiKey,
  listApiKeysForUser,
  normalizeProvider,
  providerLabels,
  upsertApiKey,
} from '@/lib/api-keys'

export const dynamic = 'force-dynamic'

const PROVIDERS: ApiProvider[] = ['ANTHROPIC', 'OPENAI']

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const keys = await listApiKeysForUser(session.user.id)

  return NextResponse.json({
    providers: PROVIDERS,
    keys,
    labels: providerLabels,
  })
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { provider, key } = await request.json().catch(() => ({}))
  const normalized = normalizeProvider(provider)

  if (!normalized || !key || typeof key !== 'string') {
    return NextResponse.json({ error: 'provider and key are required' }, { status: 400 })
  }

  try {
    const result = await upsertApiKey(session.user.id, normalized, key)
    return NextResponse.json({ key: result, label: providerLabels[normalized] })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to save API key' },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const provider = normalizeProvider(body?.provider)

  if (!provider) {
    return NextResponse.json({ error: 'provider is required' }, { status: 400 })
  }

  try {
    await deleteApiKey(session.user.id, provider)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to delete API key' },
      { status: 500 },
    )
  }
}
