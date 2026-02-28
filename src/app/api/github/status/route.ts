import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const GITHUB_API = 'https://api.github.com'

export async function GET() {

  const account = await prisma.account.findFirst({
    where: {
      userId: 'oss-user',
      provider: 'github',
    },
  })

  if (!account?.access_token) {
    return NextResponse.json({ connected: false })
  }

  // Fetch GitHub user info
  try {
    const res = await fetch(`${GITHUB_API}/user`, {
      headers: {
        Authorization: `Bearer ${account.access_token}`,
        Accept: 'application/vnd.github+json',
      },
      cache: 'no-store',
    })

    if (!res.ok) {
      // Token might be expired/revoked
      return NextResponse.json({ connected: false, error: 'Token invalid' })
    }

    const user = await res.json()
    return NextResponse.json({
      connected: true,
      user: {
        login: user.login,
        name: user.name,
        avatar_url: user.avatar_url,
        html_url: user.html_url,
      },
    })
  } catch {
    return NextResponse.json({ connected: false, error: 'Failed to verify' })
  }
}
