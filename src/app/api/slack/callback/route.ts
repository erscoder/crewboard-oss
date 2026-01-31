import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { WebClient } from '@slack/web-api'
import { prisma } from '@/lib/prisma'
import { getAuthSession } from '@/auth'
import { getSlackRedirectUri } from '@/lib/slack'

export async function GET(request: Request) {
  const cookieStore = cookies()
  const storedState = cookieStore.get('slack_oauth_state')?.value
  const redirectTarget = cookieStore.get('slack_oauth_redirect')?.value || '/projects'

  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')

  if (!code || !state || state !== storedState) {
    return NextResponse.redirect(`${redirectTarget}?slack=error`)
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
      return NextResponse.redirect(`${redirectTarget}?slack=error`)
    }

    const session = await getAuthSession()

    await prisma.slackWorkspace.upsert({
      where: { teamId: token.team.id },
      update: {
        teamName: token.team.name || token.team.id,
        accessToken: token.access_token,
        botUserId: token.bot_user_id ?? null,
        scope: token.scope ?? null,
        installedById: session?.user?.id,
      },
      create: {
        teamId: token.team.id,
        teamName: token.team.name || token.team.id,
        accessToken: token.access_token,
        botUserId: token.bot_user_id ?? null,
        scope: token.scope ?? null,
        installedById: session?.user?.id,
      },
    })

    return NextResponse.redirect(`${redirectTarget}?slack=connected`)
  } catch (error) {
    console.error('Slack OAuth failed', error)
    return NextResponse.redirect(`${redirectTarget}?slack=error`)
  }
}
