import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/auth'
import { getApiKeyOverview } from '@/lib/api-keys'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const overview = await getApiKeyOverview(session.user.id)
  return NextResponse.json({ overview })
}
