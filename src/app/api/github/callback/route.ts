import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3020'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')

    const cookieStore = await cookies()
    const savedState = cookieStore.get('github_oauth_state')?.value
    cookieStore.delete('github_oauth_state')

    if (!code || !state || state !== savedState) {
      console.error('[github-callback] State mismatch:', { code: !!code, state, savedState })
      return NextResponse.redirect(`${BASE_URL}/settings`)
    }

    const clientId = process.env.GITHUB_CLIENT_ID!
    const clientSecret = process.env.GITHUB_CLIENT_SECRET!

    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
    })

    const tokenData = await tokenRes.json()
    console.log('[github-callback] Token exchange:', tokenData.error ?? 'ok')

    if (!tokenData.access_token) {
      console.error('[github-callback] No access token:', tokenData)
      return NextResponse.redirect(`${BASE_URL}/settings`)
    }

    const userRes = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${tokenData.access_token}`, Accept: 'application/vnd.github+json' },
    })
    const ghUser = await userRes.json()
    console.log('[github-callback] GitHub user:', ghUser.login)

    // Find the first human user to associate the account with
    const localUser = await prisma.user.findFirst({ where: { isBot: false }, orderBy: { createdAt: 'asc' } })
    if (!localUser) {
      console.error('[github-callback] No local user found')
      return NextResponse.redirect(`${BASE_URL}/settings`)
    }

    await prisma.account.upsert({
      where: { provider_providerAccountId: { provider: 'github', providerAccountId: String(ghUser.id) } },
      create: {
        userId: localUser.id,
        type: 'oauth',
        provider: 'github',
        providerAccountId: String(ghUser.id),
        access_token: tokenData.access_token,
        token_type: 'bearer',
        scope: 'repo read:user',
      },
      update: { access_token: tokenData.access_token },
    })

    console.log('[github-callback] Account stored, redirecting to settings')
    return NextResponse.redirect(`${BASE_URL}/settings`)
  } catch (err: any) {
    console.error('[github-callback] Error:', err)
    return NextResponse.redirect(`${BASE_URL}/settings`)
  }
}
