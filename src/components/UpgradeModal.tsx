'use client'

import { useState } from 'react'
import { Loader2, Rocket, Sparkles, X, Zap } from 'lucide-react'
import { Plan, plans } from '@/lib/plans'

interface UpgradeModalProps {
  currentPlanId: string
  limitType: 'projects' | 'agents'
  onClose: () => void
}

export default function UpgradeModal({ currentPlanId, limitType, onClose }: UpgradeModalProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const currentPlan = plans.find(p => p.id === currentPlanId) || plans[0]
  const upgradePlans = plans.filter(p => {
    if (currentPlanId === 'free') return p.id === 'pro' || p.id === 'team'
    if (currentPlanId === 'pro') return p.id === 'team'
    return false
  })

  const limitMessage = limitType === 'projects' 
    ? `You've reached the ${currentPlan.limits.projects} project limit on the ${currentPlan.name} plan.`
    : `You've reached the ${currentPlan.limits.agentsPerProject} agent limit on the ${currentPlan.name} plan.`

  const handleUpgrade = async (planId: string) => {
    setLoading(planId)
    setError(null)
    
    try {
      const response = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, billingCycle: 'monthly' }),
      })

      const json = await response.json()
      if (!response.ok) {
        throw new Error(json.error || 'Unable to start checkout')
      }

      if (json.url) {
        window.location.href = json.url
      }
    } catch (err: any) {
      setError(err.message || 'Checkout failed')
      setLoading(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
      />

      {/* Dialog */}
      <div 
        className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg mx-4 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg hover:bg-card-hover transition-colors"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>

        <div className="p-6">
          {/* Icon */}
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
            <Zap className="w-6 h-6" />
          </div>

          {/* Content */}
          <h2 className="text-xl font-bold mb-2">Upgrade your plan</h2>
          <p className="text-muted-foreground text-sm mb-6">
            {limitMessage} Upgrade to unlock more {limitType} and powerful features.
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/40 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Upgrade options */}
          <div className="space-y-3">
            {upgradePlans.map((plan) => (
              <div
                key={plan.id}
                className={`relative p-4 rounded-xl border ${
                  plan.popular ? 'border-primary/60 bg-primary/5' : 'border-border'
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-2 right-3 px-2 py-0.5 text-xs font-medium bg-primary text-primary-foreground rounded-full">
                    Recommended
                  </span>
                )}
                
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <h3 className="font-semibold">{plan.name}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{plan.tasks}</p>
                    <p className="text-lg font-bold mt-2">
                      €{plan.monthly}<span className="text-sm font-normal text-muted-foreground">/mo</span>
                    </p>
                  </div>
                  
                  <button
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={loading !== null}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
                  >
                    {loading === plan.id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Rocket className="w-4 h-4" />
                        Upgrade
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {currentPlanId === 'pro' && (
            <p className="mt-4 text-xs text-muted-foreground text-center">
              💡 You'll only pay the prorated difference for the remainder of your billing cycle.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
