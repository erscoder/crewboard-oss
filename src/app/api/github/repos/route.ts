import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import { prisma } from '@/lib/prisma'
import type { GitHubRepo } from '@/types/github'

const GITHUB_API = 'https://api.github.com'

async function getGitHubAccessToken(userId: string) {
  const account = await prisma.account.findFirst({
    where: {
      userId,
      provider: 'github',
    },
  })

  return account?.access_token ?? null
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const accessToken = await getGitHubAccessToken(session.user.id)
  if (!accessToken) {
    return NextResponse.json({ error: 'No GitHub token' }, { status: 400 })
  }

  const res = await fetch(`${GITHUB_API}/user/repos?per_page=200&sort=updated`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('GitHub repos error', res.status, err)
    return NextResponse.json({ error: 'Failed to fetch repos' }, { status: 502 })
  }

  const repos = (await res.json()) as GitHubRepo[]
  return NextResponse.json(repos)
}
