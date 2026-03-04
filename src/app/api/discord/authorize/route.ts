import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'crypto'

const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3020'

export async function GET() {
  const clientId = process.env.DISCORD_CLIENT_ID
  if (!clientId) {
    return NextResponse.json({ error: 'DISCORD_CLIENT_ID not configured' }, { status: 500 })
  }

  const state = crypto.randomBytes(16).toString('hex')
  const cookieStore = await cookies()
  cookieStore.set('discord_oauth_state', state, { httpOnly: true, maxAge: 600, path: '/' })

  const params = new URLSearchParams({
    client_id: clientId,
    permissions: '2048',
    scope: 'bot',
    state,
    redirect_uri: `${BASE_URL}/api/discord/callback`,
  })

  return NextResponse.redirect(`https://discord.com/oauth2/authorize?${params}`)
}
