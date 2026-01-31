'use client'

import { useMemo, useState } from 'react'
import { Check, ExternalLink, Loader2, ShieldCheck, Sparkles } from 'lucide-react'
import { signIn } from 'next-auth/react'
import { Plan, PlanId, getPlanById, plans } from '@/lib/plans'

type Props = {
  currentPlanId: PlanId
  subscription?: {
    status?: string | null
    customerPortalUrl?: string | null
  } | null
  isAuthenticated: boolean
}

function formatPrice(price: number) {
  if (price === 0) return '€0'
  return `€${price.toFixed(2).replace('.00', '')}`
}

export default function PricingTable({ currentPlanId, subscription, isAuthenticated }: Props) {
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')

  const currentPlan = useMemo(() => getPlanById(currentPlanId), [currentPlanId])

  const handleCheckout = async (planId: PlanId) => {
    if (!isAuthenticated) {
      signIn(undefined, { callbackUrl: '/pricing' })
      return
    }

    if (planId === 'free') {
      window.location.href = '/'
      return
    }

    setError(null)
    setLoadingPlan(planId)
    try {
      const response = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, billingCycle }),
      })

      const json = await response.json()
      if (!response.ok) {
        throw new Error(json.error || 'Unable to start checkout')
      }

      if (json.url) {
        window.location.href = json.url as string
      }
    } catch (err: any) {
      setError(err.message || 'Checkout failed')
    } finally {
      setLoadingPlan(null)
    }
  }

  const handlePortal = async () => {
    setPortalLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/payments/portal')
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || 'No portal available')
      }
      if (json.url) {
        window.location.href = json.url as string
      }
    } catch (err: any) {
      setError(err.message || 'Unable to open portal')
    } finally {
      setPortalLoading(false)
    }
  }

  const getPrice = (plan: Plan) => {
    return billingCycle === 'annual' ? plan.annual : plan.monthly
  }

  const getSavings = (plan: Plan) => {
    if (plan.monthly === 0) return null
    const savings = Math.round((1 - plan.annual / plan.monthly) * 100)
    return savings > 0 ? savings : null
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Pricing</p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Pick the plan that fits</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Current plan: <span className="font-semibold text-primary">{currentPlan.name}</span>
            {subscription?.status && (
              <span className="ml-2 text-xs px-2 py-1 rounded-lg bg-card/70 border border-border">
                Status: {subscription.status}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Billing toggle */}
          <div className="flex items-center gap-2 bg-card/70 border border-border rounded-xl p-1">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${
                billingCycle === 'monthly'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${
                billingCycle === 'annual'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Annual
              <span className="ml-1 text-xs opacity-80">-20%</span>
            </button>
          </div>
          {isAuthenticated && (
            <button
              onClick={handlePortal}
              disabled={portalLoading}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-card-hover transition-colors disabled:opacity-60"
            >
              {portalLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Manage billing
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlan.id
          const isLoading = loadingPlan === plan.id
          const price = getPrice(plan)
          const savings = getSavings(plan)
          
          return (
            <article
              key={plan.id}
              className={`relative rounded-2xl border ${
                plan.popular ? 'border-primary/60 shadow-[0_10px_60px_-20px_rgba(79,70,229,0.7)]' : 'border-border'
              } bg-card/80 p-6 flex flex-col gap-4`}
            >
              {plan.popular && (
                <span className="absolute -top-3 right-4 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-lg">
                  Most popular
                </span>
              )}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">{plan.tagline}</p>
                </div>
                <h3 className="text-2xl font-bold">{plan.name}</h3>
                <p className="text-sm text-muted-foreground">{plan.tasks}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{formatPrice(price)}</span>
                  <span className="text-muted-foreground">/mo</span>
                  {billingCycle === 'annual' && savings && (
                    <span className="ml-2 text-xs text-green-500 font-medium">
                      Save {savings}%
                    </span>
                  )}
                </div>
              </div>

              <ul className="space-y-2 text-sm text-muted-foreground flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleCheckout(plan.id)}
                disabled={isLoading || isCurrent}
                className={`w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                  isCurrent
                    ? 'bg-muted text-muted-foreground cursor-default border border-border'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                } ${isLoading ? 'opacity-70' : ''}`}
              >
                {isCurrent ? (
                  'Current plan'
                ) : isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Redirecting...
                  </>
                ) : (
                  <>
                    {plan.cta}
                    <ExternalLink className="w-4 h-4" />
                  </>
                )}
              </button>
            </article>
          )
        })}
      </div>
    </div>
  )
}
