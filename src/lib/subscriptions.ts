import 'server-only'

import crypto from 'crypto'
import { lemonSqueezySetup, createCheckout } from '@lemonsqueezy/lemonsqueezy.js'
import { Subscription, SubscriptionStatus } from '@prisma/client'

import { prisma } from './prisma'
import { PlanId, getPlanById, planMap } from './plans'

type BillingCycle = 'monthly' | 'annual'

type CheckoutParams = {
  planId: PlanId
  billingCycle?: BillingCycle
  userId: string
  userEmail?: string | null
  userName?: string | null
  redirectUrl?: string
}

const variantEnvMap: Record<PlanId, Record<BillingCycle, string | undefined>> = {
  free: { monthly: undefined, annual: undefined },
  pro: {
    monthly: process.env.LEMONSQUEEZY_PRO_MONTHLY_VARIANT_ID,
    annual: process.env.LEMONSQUEEZY_PRO_ANNUAL_VARIANT_ID,
  },
  team: {
    monthly: process.env.LEMONSQUEEZY_TEAM_MONTHLY_VARIANT_ID,
    annual: process.env.LEMONSQUEEZY_TEAM_ANNUAL_VARIANT_ID,
  },
}

let lemonConfigured = false

function ensureLemonSqueezy() {
  if (lemonConfigured) return
  const apiKey = process.env.LEMONSQUEEZY_API_KEY
  if (!apiKey) {
    throw new Error('Missing LEMONSQUEEZY_API_KEY')
  }

  lemonSqueezySetup({
    apiKey,
    onError: (error) => console.error('[lemon]', error.message),
  })

  lemonConfigured = true
}

function getStoreId(): number {
  const storeId = process.env.LEMONSQUEEZY_STORE_ID
  if (!storeId) throw new Error('Missing LEMONSQUEEZY_STORE_ID')
  const parsed = Number(storeId)
  if (Number.isNaN(parsed)) throw new Error('Invalid LEMONSQUEEZY_STORE_ID')
  return parsed
}

function getVariantId(planId: PlanId, billingCycle: BillingCycle = 'monthly'): number | null {
  if (planId === 'free') return null
  const raw = variantEnvMap[planId][billingCycle]
  if (!raw) throw new Error(`Missing variant id for plan "${planId}" (${billingCycle}). Set LEMONSQUEEZY_${planId.toUpperCase()}_${billingCycle.toUpperCase()}_VARIANT_ID.`)
  const parsed = Number(raw)
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid variant id for plan "${planId}" (${billingCycle})`)
  }
  return parsed
}

export function planIdFromVariant(variantId?: string | number | null): PlanId {
  if (!variantId) return 'free'
  const value = String(variantId)

  if (variantEnvMap.pro && value === String(variantEnvMap.pro)) return 'pro'
  if (variantEnvMap.team && value === String(variantEnvMap.team)) return 'team'

  return 'free'
}

export function normalizeStatus(status?: string | null): SubscriptionStatus {
  const normalized = (status ?? 'active').toUpperCase().replace('-', '_')
  switch (normalized) {
    case 'ON_TRIAL':
      return SubscriptionStatus.ON_TRIAL
    case 'ACTIVE':
      return SubscriptionStatus.ACTIVE
    case 'PAST_DUE':
      return SubscriptionStatus.PAST_DUE
    case 'PAUSED':
      return SubscriptionStatus.PAUSED
    case 'UNPAID':
      return SubscriptionStatus.UNPAID
    case 'CANCELLED':
    case 'CANCELED':
      return SubscriptionStatus.CANCELLED
    case 'EXPIRED':
      return SubscriptionStatus.EXPIRED
    default:
      return SubscriptionStatus.ACTIVE
  }
}

export function isActiveStatus(status?: SubscriptionStatus | null) {
  if (!status) return false
  return (
    status === SubscriptionStatus.ACTIVE ||
    status === SubscriptionStatus.ON_TRIAL ||
    status === SubscriptionStatus.PAST_DUE
  )
}

export function resolvePlanId(subscription?: Subscription | null): PlanId {
  if (!subscription) return 'free'
  if (!isActiveStatus(subscription.status)) return 'free'
  const plan = planMap[subscription.planId as PlanId]
  return plan ? plan.id : 'free'
}

export async function getSubscriptionForUser(userId?: string | null) {
  if (!userId) return null
  return prisma.subscription.findUnique({ where: { userId } })
}

export async function createCheckoutSession(params: CheckoutParams) {
  ensureLemonSqueezy()

  const variantId = getVariantId(params.planId, params.billingCycle || 'monthly')
  if (!variantId) {
    throw new Error('Free plan does not require checkout')
  }

  const storeId = getStoreId()
  const fallbackOrigin =
    params.redirectUrl ||
    process.env.NEXTAUTH_URL ||
    process.env.VERCEL_URL ||
    'http://localhost:3020'
  const origin = fallbackOrigin.startsWith('http')
    ? fallbackOrigin
    : `https://${fallbackOrigin}`

  const { data, error } = await createCheckout(
    storeId,
    variantId,
    {
      checkoutOptions: {
        embed: false,
        media: false,
        logo: true,
      },
      checkoutData: {
        email: params.userEmail ?? undefined,
        name: params.userName ?? undefined,
        custom: {
          user_id: params.userId,
          plan_id: params.planId,
        },
      },
      productOptions: {
        redirectUrl: `${origin.replace(/\/$/, '')}/pricing?status=success&plan=${params.planId}`,
      },
      expiresAt: null,
      testMode: process.env.NODE_ENV !== 'production',
    },
  )

  if (error) {
    throw new Error(error.message)
  }

  const url = data?.data?.attributes?.url
  if (!url) throw new Error('Checkout URL not returned')

  return { url, id: data.data.id }
}

function parseDate(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export async function saveSubscriptionFromWebhook(payload: any) {
  const data = payload?.data
  const attributes = data?.attributes ?? {}

  const userId =
    payload?.meta?.custom_data?.user_id ||
    attributes?.custom_data?.user_id ||
    attributes?.custom?.user_id ||
    attributes?.user_id ||
    null

  if (!userId) {
    console.warn('[subscriptions] Missing user_id in webhook payload')
    return
  }

  const planId = (attributes?.custom_data?.plan_id ||
    payload?.meta?.custom_data?.plan_id ||
    attributes?.plan_id) as PlanId | undefined

  const derivedPlanId = planId || planIdFromVariant(attributes?.variant_id)

  const status = normalizeStatus(attributes?.status)

  const subscriptionId = String(data?.id ?? '')
  if (!subscriptionId) {
    console.warn('[subscriptions] Missing subscription id in webhook payload')
    return
  }

  const user =
    (await prisma.user.findUnique({ where: { id: userId } })) ||
    (attributes?.customer_email
      ? await prisma.user.findFirst({ where: { email: attributes.customer_email } })
      : null)

  if (!user) {
    console.warn('[subscriptions] User not found for subscription webhook')
    return
  }

  await prisma.subscription.upsert({
    where: { lemonSqueezyId: subscriptionId },
    create: {
      lemonSqueezyId: subscriptionId,
      userId: user.id,
      planId: derivedPlanId,
      status,
      storeId: attributes?.store_id ? String(attributes.store_id) : undefined,
      orderId: attributes?.order_id ? String(attributes.order_id) : undefined,
      productId: attributes?.product_id ? String(attributes.product_id) : undefined,
      variantId: attributes?.variant_id ? String(attributes.variant_id) : undefined,
      customerId: attributes?.customer_id ? String(attributes.customer_id) : undefined,
      customerEmail: attributes?.user_email ?? attributes?.customer_email ?? undefined,
      renewsAt: parseDate(attributes?.renews_at),
      endsAt: parseDate(attributes?.ends_at),
      trialEndsAt: parseDate(attributes?.trial_ends_at),
      cancelledAt: parseDate(attributes?.cancelled_at),
      cardBrand: attributes?.card_brand ?? undefined,
      cardLastFour: attributes?.card_last_four ?? undefined,
      updatePaymentUrl: attributes?.urls?.update_payment_method ?? undefined,
      customerPortalUrl: attributes?.urls?.customer_portal ?? undefined,
      testMode: Boolean(attributes?.test_mode),
    },
    update: {
      planId: derivedPlanId,
      status,
      storeId: attributes?.store_id ? String(attributes.store_id) : undefined,
      orderId: attributes?.order_id ? String(attributes.order_id) : undefined,
      productId: attributes?.product_id ? String(attributes.product_id) : undefined,
      variantId: attributes?.variant_id ? String(attributes.variant_id) : undefined,
      customerId: attributes?.customer_id ? String(attributes.customer_id) : undefined,
      customerEmail: attributes?.user_email ?? attributes?.customer_email ?? undefined,
      renewsAt: parseDate(attributes?.renews_at),
      endsAt: parseDate(attributes?.ends_at),
      trialEndsAt: parseDate(attributes?.trial_ends_at),
      cancelledAt: parseDate(attributes?.cancelled_at),
      cardBrand: attributes?.card_brand ?? undefined,
      cardLastFour: attributes?.card_last_four ?? undefined,
      updatePaymentUrl: attributes?.urls?.update_payment_method ?? undefined,
      customerPortalUrl: attributes?.urls?.customer_portal ?? undefined,
      testMode: Boolean(attributes?.test_mode),
    },
  })
}

export function verifyWebhookSignature(rawBody: string, signature: string | null) {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET
  if (!secret) throw new Error('Missing LEMONSQUEEZY_WEBHOOK_SECRET')
  if (!signature) return false

  const digest = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')

  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))
  } catch {
    return false
  }
}

export async function assertProjectLimit(userId?: string | null) {
  const planId = resolvePlanId(await getSubscriptionForUser(userId))
  const limit = getPlanById(planId).limits.projects
  if (!limit) return

  const count = await prisma.project.count()
  if (count >= limit) {
    throw new Error(`Project limit reached for the ${getPlanById(planId).name} plan.`)
  }
}

export async function assertAgentLimit(userId?: string | null) {
  const planId = resolvePlanId(await getSubscriptionForUser(userId))
  const limit = getPlanById(planId).limits.agentsPerProject
  if (!limit) return

  const count = await prisma.user.count()
  if (count >= limit) {
    throw new Error(`Agent limit reached for the ${getPlanById(planId).name} plan.`)
  }
}

export function serializeSubscriptionForSession(subscription?: Subscription | null) {
  if (!subscription) return null
  return {
    planId: resolvePlanId(subscription),
    status: subscription.status,
    renewsAt: subscription.renewsAt?.toISOString() ?? null,
    endsAt: subscription.endsAt?.toISOString() ?? null,
    customerPortalUrl: subscription.customerPortalUrl ?? null,
  }
}
