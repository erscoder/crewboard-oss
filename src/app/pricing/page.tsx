import Link from 'next/link'
import { ArrowLeft, CheckCircle, Sparkles } from 'lucide-react'

import { getAuthSession } from '@/auth'
import PricingTable from '@/components/PricingTable'
import { getPlanById } from '@/lib/plans'

export const dynamic = 'force-dynamic'

export default async function PricingPage({
  searchParams,
}: {
  searchParams: { status?: string; plan?: string }
}) {
  const session = await getAuthSession()
  const plan = getPlanById(session?.user?.planId ?? 'free')
  const isSuccess = searchParams.status === 'success'
  const purchasedPlan = searchParams.plan

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10">
      <div className="mx-auto max-w-6xl px-6 py-10 space-y-8">
        {/* Success Banner */}
        {isSuccess && (
          <div className="rounded-2xl border border-green-500/40 bg-green-500/10 p-4 flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
            <div>
              <p className="font-semibold text-green-400">Payment successful!</p>
              <p className="text-sm text-muted-foreground">
                Welcome to {purchasedPlan ? purchasedPlan.charAt(0).toUpperCase() + purchasedPlan.slice(1) : 'your new plan'}! 
                Your subscription is now active.
              </p>
            </div>
            <Link
              href="/"
              className="ml-auto inline-flex items-center gap-2 rounded-xl bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600 transition-colors"
            >
              Go to Board
            </Link>
          </div>
        )}

        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Crewboard</p>
              <h1 className="text-2xl font-bold">Pricing & Billing</h1>
              <p className="text-sm text-muted-foreground">Choose a plan and manage your subscription.</p>
            </div>
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium hover:bg-card transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to board
          </Link>
        </header>

        <PricingTable
          currentPlanId={plan.id}
          subscription={session?.user?.subscription ?? null}
          isAuthenticated={Boolean(session?.user)}
        />
      </div>
    </main>
  )
}
