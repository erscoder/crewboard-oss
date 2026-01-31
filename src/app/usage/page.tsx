import { redirect } from 'next/navigation'
import { ArrowLeft, BarChart3, BatteryCharging, Gauge, Sparkles, Zap } from 'lucide-react'

import { getAuthSession } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getPlanById } from '@/lib/plans'

type HistoryPoint = {
  date: string
  label: string
  range?: string
  tasks: number
  tokens: number
}

const DAILY_HISTORY_DAYS = 30
const WEEKLY_HISTORY_WEEKS = 12

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function startOfWeek(date: Date) {
  const copy = new Date(date)
  const day = copy.getDay() // Sunday = 0
  const diff = (day + 6) % 7 // convert to Monday = 0
  copy.setDate(copy.getDate() - diff)
  copy.setHours(0, 0, 0, 0)
  return copy
}

function formatNumber(value: number) {
  return value.toLocaleString()
}

function formatDateLabel(date: Date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatRange(start: Date, end: Date) {
  const sameMonth = start.getMonth() === end.getMonth()
  const sameYear = start.getFullYear() === end.getFullYear()

  if (sameMonth && sameYear) {
    return `${formatDateLabel(start)} – ${end.getDate()}`
  }

  if (sameYear) {
    return `${formatDateLabel(start)} – ${formatDateLabel(end)}`
  }

  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
}

function formatTokens(tokens: number) {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}k`
  return tokens.toString()
}

function buildDailyHistory(tasks: { createdAt: Date }[], runs: { createdAt: Date; totalTokens: number | null }[]): HistoryPoint[] {
  const today = new Date()
  const map = new Map<string, { tasks: number; tokens: number }>()

  for (let i = DAILY_HISTORY_DAYS; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(today.getDate() - i)
    const key = date.toISOString().slice(0, 10)
    map.set(key, { tasks: 0, tokens: 0 })
  }

  tasks.forEach((task) => {
    const key = task.createdAt.toISOString().slice(0, 10)
    const entry = map.get(key)
    if (entry) entry.tasks += 1
  })

  runs.forEach((run) => {
    const key = run.createdAt.toISOString().slice(0, 10)
    const entry = map.get(key)
    if (entry) entry.tokens += run.totalTokens || 0
  })

  return Array.from(map.entries()).map(([date, value]) => ({
    date,
    label: formatDateLabel(new Date(date)),
    tasks: value.tasks,
    tokens: value.tokens,
  }))
}

function buildWeeklyHistory(tasks: { createdAt: Date }[], runs: { createdAt: Date; totalTokens: number | null }[]): HistoryPoint[] {
  const now = new Date()
  const currentWeekStart = startOfWeek(now)
  const map = new Map<string, { start: Date; end: Date; tasks: number; tokens: number }>()

  for (let i = WEEKLY_HISTORY_WEEKS - 1; i >= 0; i--) {
    const start = new Date(currentWeekStart)
    start.setDate(currentWeekStart.getDate() - i * 7)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    const key = start.toISOString().slice(0, 10)
    map.set(key, { start, end, tasks: 0, tokens: 0 })
  }

  const getWeekKey = (date: Date) => startOfWeek(date).toISOString().slice(0, 10)

  tasks.forEach((task) => {
    const key = getWeekKey(task.createdAt)
    const entry = map.get(key)
    if (entry) entry.tasks += 1
  })

  runs.forEach((run) => {
    const key = getWeekKey(run.createdAt)
    const entry = map.get(key)
    if (entry) entry.tokens += run.totalTokens || 0
  })

  return Array.from(map.entries()).map(([date, value]) => ({
    date,
    label: `Week of ${formatDateLabel(value.start)}`,
    range: formatRange(value.start, value.end),
    tasks: value.tasks,
    tokens: value.tokens,
  }))
}

export const dynamic = 'force-dynamic'

export default async function UsagePage() {
  const session = await getAuthSession()
  if (!session) {
    redirect('/api/auth/signin')
  }

  const now = new Date()
  const monthStart = startOfMonth(now)
  const windowStart = new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000) // 100d back to cover weekly window comfortably

  const [tasksThisMonth, runsAgg, tasksHistory, runsHistory] = await Promise.all([
    prisma.task.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.agentRun.aggregate({
      _sum: { totalTokens: true },
      where: { createdAt: { gte: monthStart } },
    }),
    prisma.task.findMany({
      where: { createdAt: { gte: windowStart } },
      select: { createdAt: true },
    }),
    prisma.agentRun.findMany({
      where: { createdAt: { gte: windowStart } },
      select: { createdAt: true, totalTokens: true },
    }),
  ])

  const plan = getPlanById(session.user?.planId ?? 'free')
  const taskLimit = plan.limits.tasksPerMonth ?? null
  const tokenLimit = plan.limits.tokensPerMonth ?? null

  const totalTokensThisMonth = runsAgg._sum.totalTokens ?? 0

  const tasksPct = taskLimit ? Math.min((tasksThisMonth / taskLimit) * 100, 100) : 0
  const tokensPct = tokenLimit ? Math.min((totalTokensThisMonth / tokenLimit) * 100, 100) : 0

  const tasksApproaching = taskLimit ? tasksPct >= 80 && tasksPct < 100 : false
  const tasksAtLimit = taskLimit ? tasksThisMonth >= taskLimit : false
  const tokensApproaching = tokenLimit ? tokensPct >= 80 && tokensPct < 100 : false
  const tokensAtLimit = tokenLimit ? totalTokensThisMonth >= tokenLimit : false

  const dailyHistory = buildDailyHistory(tasksHistory, runsHistory)
  const weeklyHistory = buildWeeklyHistory(tasksHistory, runsHistory)
  const billingLabel = `${monthStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(now.getFullYear(), now.getMonth() + 1, 0).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10">
      <div className="mx-auto max-w-6xl px-6 py-10 space-y-8">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center">
              <Gauge className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Crewboard</p>
              <h1 className="text-2xl font-bold">Usage & Limits</h1>
              <p className="text-sm text-muted-foreground">
                Monitor your monthly tasks and AI token consumption.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Plan</span>
              <span className="rounded-lg bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                {plan.name}
              </span>
            </div>
            <a
              href="/"
              className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium hover:bg-card transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to board
            </a>
          </div>
        </header>

        <section className="rounded-2xl border border-border bg-card/70 px-5 py-4 shadow-sm flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/30 px-3 py-1 text-xs font-semibold text-primary">
            <Gauge className="w-4 h-4" />
            Billing period: {billingLabel}
          </div>
          <div className="text-sm text-muted-foreground">
            Usage resets on the 1st of each month. Track progress to avoid throttling.
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-2">
          <UsageCard
            title="Tasks this month"
            value={`${formatNumber(tasksThisMonth)}${taskLimit ? ` / ${formatNumber(taskLimit)}` : ''}`}
            percent={taskLimit ? tasksPct : 0}
            status={tasksAtLimit ? 'limit' : tasksApproaching ? 'warning' : 'ok'}
            description={taskLimit ? 'Created tasks counted from the 1st of this month.' : 'Unlimited tasks on this plan.'}
            highlight={tasksAtLimit ? 'You have hit your monthly task limit.' : tasksApproaching ? 'You are close to the monthly task limit.' : undefined}
            badge={tasksApproaching || tasksAtLimit ? (tasksAtLimit ? 'Upgrade required' : 'Approaching limit') : undefined}
          />

          <UsageCard
            title="Tokens consumed"
            value={`${formatTokens(totalTokensThisMonth)}${tokenLimit ? ` / ${formatTokens(tokenLimit)}` : ''}`}
            percent={tokenLimit ? tokensPct : 0}
            status={tokensAtLimit ? 'limit' : tokensApproaching ? 'warning' : 'ok'}
            description={tokenLimit ? 'Sum of agent input + output tokens this month.' : 'Unlimited tokens on this plan.'}
            highlight={tokensAtLimit ? 'AI usage is paused until you upgrade.' : tokensApproaching ? 'You are close to the monthly token limit.' : undefined}
            badge={tokensApproaching || tokensAtLimit ? (tokensAtLimit ? 'At limit' : 'Approaching limit') : undefined}
          />
        </section>

        <section className="rounded-2xl border border-border bg-card/60 p-6 space-y-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">History</p>
              <h2 className="text-lg font-semibold">Last 30 days</h2>
              <p className="text-sm text-muted-foreground">Daily tasks created and tokens used.</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
              <BarChart3 className="w-4 h-4" />
              Rolling window
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <HistoryList title="Daily (last 30 days)" data={dailyHistory} />
            <HistoryList title="Weekly (last 12 weeks)" data={weeklyHistory} />
          </div>
        </section>

        {(tasksAtLimit || tokensAtLimit) && (
          <UpgradeCallout
            title="Upgrade to keep moving"
            message="You have reached the current plan limits. Upgrade to unlock higher quotas and uninterrupted automation."
            cta="View plans"
          />
        )}
        {!tasksAtLimit && !tokensAtLimit && (tasksApproaching || tokensApproaching) && (
          <UpgradeCallout
            title="Approaching your limits"
            message="Stay ahead of the curve. Upgrade now to avoid throttling as you scale work across agents."
            cta="Upgrade plan"
          />
        )}
      </div>
    </main>
  )
}

function UsageCard({
  title,
  value,
  percent,
  description,
  status,
  highlight,
  badge,
}: {
  title: string
  value: string
  percent: number
  description: string
  status: 'ok' | 'warning' | 'limit'
  highlight?: string
  badge?: string
}) {
  const gradient =
    status === 'limit'
      ? 'from-destructive via-destructive/80 to-destructive/60'
      : status === 'warning'
        ? 'from-amber-400 via-amber-300 to-amber-200'
        : 'from-primary via-primary/80 to-primary/60'

  return (
    <div className="rounded-2xl border border-border bg-card/60 p-5 shadow-sm space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{title}</p>
          <h3 className="text-2xl font-bold mt-1">{value}</h3>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
        <div className="p-2 rounded-xl bg-background/60 border border-border">
          {title.toLowerCase().includes('token') ? <Zap className="w-5 h-5 text-primary" /> : <BatteryCharging className="w-5 h-5 text-primary" />}
        </div>
      </div>

      {badge && (
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          <Sparkles className="w-3 h-3" />
          {badge}
        </div>
      )}

      <div className="space-y-2">
        <div className="h-2 w-full rounded-full bg-border overflow-hidden">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${gradient}`}
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="text-xs text-muted-foreground">
          {percent.toFixed(0)}% of monthly quota
        </div>
      </div>

      {highlight && (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-background/60 px-3 py-2 text-sm text-primary">
          <Sparkles className="w-4 h-4" />
          <span>{highlight}</span>
          <a
            className="ml-auto text-primary underline-offset-4 hover:underline"
            href="/pricing"
          >
            Upgrade
          </a>
        </div>
      )}
    </div>
  )
}

function UpgradeCallout({ title, message, cta }: { title: string; message: string; cta: string }) {
  return (
    <div className="rounded-2xl border border-primary/40 bg-primary/10 p-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3">
        <Sparkles className="w-5 h-5 text-primary" />
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
      </div>
      <a
        href="/pricing"
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
      >
        <Zap className="w-4 h-4" />
        {cta}
      </a>
    </div>
  )
}

function HistoryList({ title, data }: { title: string; data: HistoryPoint[] }) {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-background/40 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">{title}</p>
        <span className="text-xs text-muted-foreground">{data.length} points</span>
      </div>

      <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
        {data.map((point) => (
          <div
            key={`${title}-${point.date}`}
            className="grid grid-cols-4 gap-3 items-center rounded-lg bg-card/70 border border-border px-3 py-2"
          >
            <div className="text-sm text-muted-foreground flex flex-col">
              <span>{point.label}</span>
              {point.range && <span className="text-[11px] text-muted-foreground/80">{point.range}</span>}
            </div>
            <div className="text-sm font-semibold flex items-center gap-2">
              <span className="inline-flex h-2 w-2 rounded-full bg-primary" />
              {point.tasks} task{point.tasks === 1 ? '' : 's'}
            </div>
            <div className="text-sm font-semibold flex items-center gap-2">
              <span className="inline-flex h-2 w-2 rounded-full bg-secondary" />
              {formatTokens(point.tokens)}
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-full rounded-full bg-border overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary/80"
                  style={{ width: `${Math.min(point.tasks * 8, 100)}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
