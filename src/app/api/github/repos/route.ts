import { NextResponse } from 'next/server'
import type { GitHubRepo } from '@/types/github'

export const dynamic = 'force-dynamic'

export async function GET() {
  // OSS version - GitHub integration requires manual token setup
  return NextResponse.json([])
}
