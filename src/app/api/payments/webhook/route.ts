import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

import { saveSubscriptionFromWebhook, verifyWebhookSignature } from '@/lib/subscriptions'

export const dynamic = 'force-dynamic'

const HANDLED_EVENTS = new Set([
  'subscription_created',
  'subscription_updated',
  'subscription_cancelled',
])

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = headers().get('x-signature')

  try {
    const valid = verifyWebhookSignature(rawBody, signature)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  } catch (error: any) {
    console.error('[webhook] signature error', error)
    return NextResponse.json({ error: error.message || 'Signature verification failed' }, { status: 400 })
  }

  let payload: any
  try {
    payload = JSON.parse(rawBody)
  } catch (error) {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  const eventName = payload?.meta?.event_name
  if (HANDLED_EVENTS.has(eventName)) {
    await saveSubscriptionFromWebhook(payload)
  }

  return NextResponse.json({ received: true })
}
