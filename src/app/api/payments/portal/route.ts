import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/auth'
import { getSubscriptionForUser, isActiveStatus, resolvePlanId } from '@/lib/subscriptions'
import { getPlanById } from '@/lib/plans'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const subscription = await getSubscriptionForUser(session.user.id)
  const planId = resolvePlanId(subscription)
  if (!subscription || planId === 'free' || !isActiveStatus(subscription.status)) {
    return NextResponse.json({ error: 'No active subscription' }, { status: 404 })
  }

  const portalUrl =
    subscription.customerPortalUrl ||
    subscription.updatePaymentUrl ||
    'https://app.lemonsqueezy.com/my-account'

  return NextResponse.json({
    url: portalUrl,
    plan: getPlanById(planId).name,
  })
}
