import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { WebClient } from '@slack/web-api'
import { prisma } from '@/lib/prisma'
import { getSlackRedirectUri } from '@/lib/slack'

const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3020'

export async function GET(request: Request) {
  const cookieStore = await cookies()
  const storedState = cookieStore.get('slack_oauth_state')?.value
  const redirectPath = cookieStore.get('slack_oauth_redirect')?.value || '/settings'
  const redirectTarget = redirectPath.startsWith('http') ? redirectPath : `${BASE_URL}${redirectPath}`

  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')

  if (!code || !state || state !== storedState) {
    return NextResponse.redirect(`${BASE_URL}/oauth/success?error=state_mismatch`)
  }

  cookieStore.delete('slack_oauth_state')
  cookieStore.delete('slack_oauth_redirect')

  try {
    const client = new WebClient()
    const token = await client.oauth.v2.access({
      client_id: process.env.SLACK_CLIENT_ID!,
      client_secret: process.env.SLACK_CLIENT_SECRET!,
      code,
      redirect_uri: getSlackRedirectUri(),
    })

    if (!token.ok || !token.access_token || !token.team?.id) {
      return NextResponse.redirect(`${BASE_URL}/oauth/success?error=token_failed`)
    }

    // Find the first human user to associate the workspace with
    const localUser = await prisma.user.findFirst({ where: { isBot: false }, orderBy: { createdAt: 'asc' } })

    await prisma.slackWorkspace.upsert({
      where: { teamId: token.team.id },
      update: {
        teamName: token.team.name || token.team.id,
        accessToken: token.access_token,
        botUserId: token.bot_user_id ?? null,
        scope: token.scope ?? null,
        installedById: localUser?.id ?? null,
      },
      create: {
        teamId: token.team.id,
        teamName: token.team.name || token.team.id,
        accessToken: token.access_token,
        botUserId: token.bot_user_id ?? null,
        scope: token.scope ?? null,
        installedById: localUser?.id ?? null,
      },
    })

    return NextResponse.redirect(`${BASE_URL}/oauth/success`)
  } catch (error) {
    console.error('Slack OAuth failed', error)
    return NextResponse.redirect(`${BASE_URL}/oauth/success?error=exception`)
  }
}
