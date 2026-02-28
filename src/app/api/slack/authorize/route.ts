import crypto from 'crypto'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { SLACK_BOT_SCOPES, getSlackRedirectUri } from '@/lib/slack'

export async function GET(request: Request) {
  if (!process.env.SLACK_CLIENT_ID || !process.env.SLACK_CLIENT_SECRET) {
    return new NextResponse('Slack client ID/secret missing', { status: 500 })
  }

  const state = crypto.randomBytes(16).toString('hex')
  const redirect = new URL(request.url).searchParams.get('redirect') || '/projects'

  const cookieStore = await cookies()
  cookieStore.set('slack_oauth_state', state, { path: '/', maxAge: 10 * 60 })
  cookieStore.set('slack_oauth_redirect', redirect, { path: '/', maxAge: 10 * 60 })

  const url = new URL('https://slack.com/oauth/v2/authorize')
  url.searchParams.set('client_id', process.env.SLACK_CLIENT_ID)
  url.searchParams.set('scope', SLACK_BOT_SCOPES)
  url.searchParams.set('redirect_uri', getSlackRedirectUri())
  url.searchParams.set('state', state)

  return NextResponse.redirect(url.toString())
}
