import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/auth'
import { createCheckoutSession } from '@/lib/subscriptions'
import { getPlanById } from '@/lib/plans'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { planId, billingCycle = 'monthly' } = await request.json().catch(() => ({}))
  const plan = getPlanById(planId)

  if (plan.id === 'free') {
    return NextResponse.json({ error: 'Free plan does not require checkout' }, { status: 400 })
  }

  try {
    const checkout = await createCheckoutSession({
      planId: plan.id,
      billingCycle,
      userId: session.user.id,
      userEmail: session.user.email,
      userName: session.user.name,
    })

    return NextResponse.json({ url: checkout.url })
  } catch (error: any) {
    console.error('[checkout]', error)
    return NextResponse.json({ error: error.message || 'Unable to create checkout' }, { status: 400 })
  }
}
