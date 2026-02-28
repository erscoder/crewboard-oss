import { Bot, Plus, Zap, Clock, DollarSign } from 'lucide-react'

import { prisma } from '@/lib/prisma'
import AgentCard from '@/components/AgentCard'
import CreateAgentButton from '@/components/CreateAgentButton'

export const dynamic = 'force-dynamic'

export default async function AgentsPage() {
  const session = { user: { id: 'oss-user', name: 'User' } }

  const agents = await prisma.agentProfile.findMany({
    include: {
      _count: {
        select: { runs: true },
      },
      runs: {
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          status: true,
          totalTokens: true,
          cost: true,
          createdAt: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  })

  // Calculate stats
  const totalRuns = agents.reduce((sum, a) => sum + a._count.runs, 0)
  const activeAgents = agents.filter((a) => a.isActive).length

  // Get aggregated stats
  const stats = await prisma.agentRun.aggregate({
    _sum: {
      totalTokens: true,
      cost: true,
    },
    _count: true,
  })

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10">
      <div className="mx-auto max-w-6xl px-6 py-10 space-y-8">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Crewboard</p>
              <h1 className="text-2xl font-bold">Agents</h1>
              <p className="text-sm text-muted-foreground">Configure and manage your AI agents.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/"
              className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium hover:bg-card transition-colors"
            >
              Back to board
            </a>
            <CreateAgentButton />
          </div>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-border bg-card/60 p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Bot className="w-4 h-4" />
              <span className="text-xs">Active Agents</span>
            </div>
            <p className="text-2xl font-bold">{activeAgents}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card/60 p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Zap className="w-4 h-4" />
              <span className="text-xs">Total Runs</span>
            </div>
            <p className="text-2xl font-bold">{stats._count}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card/60 p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-xs">Total Tokens</span>
            </div>
            <p className="text-2xl font-bold">{((stats._sum.totalTokens || 0) / 1000).toFixed(1)}K</p>
          </div>
          <div className="rounded-2xl border border-border bg-card/60 p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="w-4 h-4" />
              <span className="text-xs">Total Cost</span>
            </div>
            <p className="text-2xl font-bold">${(stats._sum.cost || 0).toFixed(2)}</p>
          </div>
        </div>

        {/* Agent Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}

          {agents.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No agents configured yet.</p>
              <p className="text-sm">Create your first agent to get started.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
