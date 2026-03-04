import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'crypto'

export async function GET() {
  const clientId = process.env.GITHUB_CLIENT_ID
  if (!clientId) {
    return NextResponse.json({ error: 'GITHUB_CLIENT_ID not configured' }, { status: 500 })
  }

  const state = crypto.randomBytes(16).toString('hex')
  const cookieStore = await cookies()
  cookieStore.set('github_oauth_state', state, { httpOnly: true, maxAge: 600, path: '/' })

  const params = new URLSearchParams({
    client_id: clientId,
    scope: 'repo read:user',
    state,
  })

  return NextResponse.redirect(`https://github.com/login/oauth/authorize?${params}`)
}
