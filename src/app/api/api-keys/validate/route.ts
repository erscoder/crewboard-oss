import { NextRequest, NextResponse } from 'next/server'

import { normalizeProvider, revalidateApiKey } from '@/lib/api-keys'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {

  const body = await request.json().catch(() => ({}))
  const provider = normalizeProvider(body?.provider)

  if (!provider) {
    return NextResponse.json({ error: 'provider is required' }, { status: 400 })
  }

  try {
    const result = await revalidateApiKey('oss-user', provider)
    return NextResponse.json({ provider, status: result.status, lastCheckedAt: result.lastCheckedAt })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to validate key' }, { status: 500 })
  }
}
