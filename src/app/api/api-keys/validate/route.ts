import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/auth'
import { normalizeProvider, revalidateApiKey } from '@/lib/api-keys'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
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
    const result = await revalidateApiKey(session.user.id, provider)
    return NextResponse.json({ provider, status: result.status, lastCheckedAt: result.lastCheckedAt })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to validate key' }, { status: 500 })
  }
}
