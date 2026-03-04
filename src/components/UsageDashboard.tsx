'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  MessageSquare, Wrench, AlertTriangle, Monitor,
  Coins, Hash, Percent, WifiOff,
} from 'lucide-react'

// ─── Types (mirrors gateway sessions.usage response) ─────────────────────────

interface CostTotals {
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
  totalTokens: number
  totalCost: number
}

interface UsageStats {
  aggregates: {
    messages: { total: number; user: number; assistant: number; toolCalls: number; errors: number }
    byAgent: Array<{ agentId: string; totals: CostTotals }>
    byModel: Array<{ provider: string; model: string; count: number; totals: CostTotals }>
    daily: Array<{ date: string; tokens: number; cost: number; messages: number; toolCalls: number; errors: number }>
    tools: { totalCalls: number; uniqueTools: number; tools: Array<{ name: string; count: number }> }
    latency: { avgMs: number; p95Ms: number }
  }
  totals: CostTotals
  sessionCount: number
  range: string
}

type Range = 'today' | '7d' | '30d'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number | undefined | null): string {
  if (n == null) return '0'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

function fmtCost(n: number | undefined | null): string {
  if (n == null || n === 0) return '$0.00'
  if (n >= 1) return `$${n.toFixed(2)}`
  if (n >= 0.01) return `$${n.toFixed(3)}`
  return `$${n.toFixed(4)}`
}

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, subtitle }: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  subtitle?: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-4 space-y-1">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="w-4 h-4" />
        <span className="text-xs uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
    </div>
  )
}

// ─── Activity Chart ──────────────────────────────────────────────────────────

function ActivityChart({ data }: { data: UsageStats['aggregates']['daily'] }) {
  if (data.length === 0) return null
  const maxCost = Math.max(...data.map(d => d.cost), 0.01)

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-muted-foreground">
        Daily Activity
      </h2>
      <div className="rounded-2xl border border-border bg-card/60 p-5">
        <div className="flex items-end gap-1 h-40">
          {data.map((day, i) => {
            const height = Math.max((day.cost / maxCost) * 100, 2)
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="relative w-full flex justify-center" style={{ height: '100%' }}>
                  <div
                    className="w-full max-w-10 bg-primary/70 rounded-t hover:bg-primary transition-colors cursor-default self-end"
                    style={{ height: `${height}%`, minHeight: '2px' }}
                    title={`${fmtDate(day.date)}: ${fmtCost(day.cost)} · ${fmt(day.tokens)} tokens · ${day.messages} msgs`}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground tabular-nums truncate w-full text-center">
                  {fmtDate(day.date)}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export default function UsageDashboard() {
  const [range, setRange] = useState<Range>('today')
  const [stats, setStats] = useState<UsageStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async (r: Range) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/usage/stats?range=${r}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Failed to fetch stats (${res.status})`)
      }
      setStats(await res.json())
    } catch (err: any) {
      setError(err.message)
      setStats(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchStats(range) }, [range, fetchStats])

  if (!loading && error) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <WifiOff className="w-12 h-12 mx-auto mb-4 opacity-40" />
        <p className="font-medium">Could not load usage data</p>
        <p className="text-sm mt-1">{error}</p>
        <button
          onClick={() => fetchStats(range)}
          className="mt-4 px-4 py-2 rounded-xl border border-border text-sm hover:bg-card transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  const agg = stats?.aggregates
  const totals = stats?.totals
  const errorRate = agg && agg.messages.total > 0
    ? ((agg.messages.errors / agg.messages.total) * 100).toFixed(1)
    : '0.0'

  return (
    <div className="space-y-6">
      {/* Range selector */}
      <div className="flex gap-2">
        {(['today', '7d', '30d'] as Range[]).map(r => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              range === r
                ? 'bg-primary text-primary-foreground'
                : 'border border-border hover:bg-card'
            }`}
          >
            {r === 'today' ? 'Today' : r === '7d' ? '7 days' : '30 days'}
          </button>
        ))}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card/60 p-4 h-24 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && stats && (
        <>
          {/* Stats header */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <StatCard icon={MessageSquare} label="Messages" value={fmt(agg!.messages.total)} />
            <StatCard icon={Wrench} label="Tool Calls" value={fmt(agg!.messages.toolCalls)} />
            <StatCard icon={AlertTriangle} label="Errors" value={fmt(agg!.messages.errors)} />
            <StatCard icon={Monitor} label="Sessions" value={fmt(stats.sessionCount)} />
            <StatCard icon={Coins} label="Total Cost" value={fmtCost(totals!.totalCost)} />
            <StatCard icon={Hash} label="Tokens" value={fmt(totals!.totalTokens)} subtitle={`${fmt(totals!.input)} in · ${fmt(totals!.output)} out`} />
            <StatCard icon={Percent} label="Error Rate" value={`${errorRate}%`} />
          </div>

          {/* Two-column: Cost by Model + Cost by Agent */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Cost by Model */}
            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                Cost by Model
              </h2>
              <div className="rounded-2xl border border-border bg-card/60 overflow-hidden">
                {agg!.byModel.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wide">
                        <th className="text-left px-5 py-3">Model</th>
                        <th className="text-right px-4 py-3">Tokens</th>
                        <th className="text-right px-5 py-3">Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {[...agg!.byModel]
                        .sort((a, b) => b.totals.totalCost - a.totals.totalCost)
                        .map(row => (
                          <tr key={`${row.provider}/${row.model}`} className="hover:bg-card/80 transition-colors">
                            <td className="px-5 py-3">
                              <p className="font-medium">{row.model}</p>
                              <p className="text-xs text-muted-foreground">{row.provider} · {fmt(row.count)} calls</p>
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{fmt(row.totals.totalTokens)}</td>
                            <td className="px-5 py-3 text-right tabular-nums">{fmtCost(row.totals.totalCost)}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="px-5 py-8 text-sm text-muted-foreground text-center">No model data</p>
                )}
              </div>
            </section>

            {/* Cost by Agent */}
            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                Cost by Agent
              </h2>
              <div className="rounded-2xl border border-border bg-card/60 overflow-hidden">
                {agg!.byAgent.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wide">
                        <th className="text-left px-5 py-3">Agent</th>
                        <th className="text-right px-4 py-3">Tokens</th>
                        <th className="text-right px-5 py-3">Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {[...agg!.byAgent]
                        .sort((a, b) => b.totals.totalCost - a.totals.totalCost)
                        .map(row => (
                          <tr key={row.agentId} className="hover:bg-card/80 transition-colors">
                            <td className="px-5 py-3 font-medium capitalize">{row.agentId}</td>
                            <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{fmt(row.totals.totalTokens)}</td>
                            <td className="px-5 py-3 text-right tabular-nums">{fmtCost(row.totals.totalCost)}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="px-5 py-8 text-sm text-muted-foreground text-center">No agent data</p>
                )}
              </div>
            </section>
          </div>

          {/* Activity chart — only for multi-day ranges */}
          {range !== 'today' && agg!.daily.length > 0 && (
            <ActivityChart data={agg!.daily} />
          )}
        </>
      )}
    </div>
  )
}
