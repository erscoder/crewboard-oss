import { NextRequest, NextResponse } from 'next/server'
import { ApiProvider } from '@prisma/client'
import { deleteApiKey, getApiKeyOverview, normalizeProvider, providerLabels, revalidateApiKey, upsertApiKey } from '@/lib/api-keys'

export const dynamic = 'force-dynamic'
const PROVIDERS: ApiProvider[] = ['ANTHROPIC', 'OPENAI']
const FAKE_USER_ID = 'oss-user'

export async function GET() {
  const session = { user: { id: 'oss-user', name: 'User' } }
  const userId = 'oss-user'
  const overview = await getApiKeyOverview(userId)
  return NextResponse.json({ providers: PROVIDERS, overview, labels: providerLabels })
}

export async function POST(request: NextRequest) {
  const session = { user: { id: 'oss-user', name: 'User' } }
  const userId = 'oss-user'
  const { provider, key } = await request.json().catch(() => ({}))
  const normalized = normalizeProvider(provider)
  if (!normalized || !key || typeof key !== 'string') {
    return NextResponse.json({ error: 'provider and key are required' }, { status: 400 })
  }
  try {
    const result = await upsertApiKey(userId, normalized, key)
    return NextResponse.json({ key: result, label: providerLabels[normalized] })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to save API key' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const session = { user: { id: 'oss-user', name: 'User' } }
  const userId = 'oss-user'
  const body = await request.json().catch(() => ({}))
  const provider = normalizeProvider(body?.provider)
  if (!provider) {
    return NextResponse.json({ error: 'provider is required' }, { status: 400 })
  }
  try {
    const result = await revalidateApiKey(userId, provider)
    return NextResponse.json({ key: result, label: providerLabels[provider] })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to revalidate API key' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const session = { user: { id: 'oss-user', name: 'User' } }
  const userId = 'oss-user'
  const body = await request.json().catch(() => ({}))
  const provider = normalizeProvider(body?.provider)
  if (!provider) {
    return NextResponse.json({ error: 'provider is required' }, { status: 400 })
  }
  try {
    await deleteApiKey(userId, provider)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to delete API key' }, { status: 500 })
  }
}
