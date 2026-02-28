import { NextResponse } from 'next/server'

import { getApiKeyOverview } from '@/lib/api-keys'

export const dynamic = 'force-dynamic'

export async function GET() {

  const overview = await getApiKeyOverview('oss-user')
  return NextResponse.json({ overview })
}
