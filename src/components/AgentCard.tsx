'use client'

import { useState } from 'react'
import { Bot, Settings, Zap, Clock, MoreVertical, Power, PowerOff, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toggleAgentStatus, deleteAgent } from '@/app/agents/actions'

type AgentRun = {
  id: string
  status: string
  totalTokens: number | null
  cost: number | null
  createdAt: Date
}

type Agent = {
  id: string
  name: string
  description: string | null
  model: string
  systemPrompt: string
  skills: string[]
  tools: string[]
  maxTokens: number
  temperature: number
  isActive: boolean
  _count: { runs: number }
  runs: AgentRun[]
}

export default function AgentCard({ agent }: { agent: Agent }) {
  const [showMenu, setShowMenu] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleToggle = async () => {
    setLoading(true)
    await toggleAgentStatus(agent.id, !agent.isActive)
    setLoading(false)
    setShowMenu(false)
  }

  const handleDelete = async () => {
    if (!confirm(`Delete agent "${agent.name}"? This cannot be undone.`)) return
    setLoading(true)
    await deleteAgent(agent.id)
    setLoading(false)
  }

  const recentRuns = agent.runs.slice(0, 3)
  const successRate = agent._count.runs > 0
    ? Math.round((recentRuns.filter(r => r.status === 'COMPLETED').length / recentRuns.length) * 100)
    : null

  return (
    <div className="relative rounded-2xl border border-border bg-card/60 p-5 hover:border-primary/30 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            agent.isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
          }`}>
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold">{agent.name}</h3>
            <p className="text-xs text-muted-foreground">{agent.model}</p>
          </div>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <MoreVertical className="w-4 h-4 text-muted-foreground" />
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1 z-20 w-40 rounded-xl border border-border bg-card shadow-lg py-1">
                <a
                  href={`/agents/${agent.id}`}
                  className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Edit
                </a>
                <button
                  onClick={handleToggle}
                  disabled={loading}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors disabled:opacity-50"
                >
                  {agent.isActive ? (
                    <>
                      <PowerOff className="w-4 h-4" />
                      Disable
                    </>
                  ) : (
                    <>
                      <Power className="w-4 h-4" />
                      Enable
                    </>
                  )}
                </button>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Description */}
      {agent.description && (
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {agent.description}
        </p>
      )}

      {/* Skills & Tools */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {agent.skills.slice(0, 3).map((skill) => (
          <span
            key={skill}
            className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary"
          >
            {skill}
          </span>
        ))}
        {agent.tools.slice(0, 3).map((tool) => (
          <span
            key={tool}
            className="px-2 py-0.5 text-xs rounded-full bg-secondary/10 text-secondary"
          >
            {tool}
          </span>
        ))}
        {(agent.skills.length + agent.tools.length) > 6 && (
          <span className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground">
            +{agent.skills.length + agent.tools.length - 6}
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground pt-4 border-t border-border">
        <div className="flex items-center gap-1">
          <Zap className="w-3.5 h-3.5" />
          {agent._count.runs} runs
        </div>
        {successRate !== null && (
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${
              successRate >= 80 ? 'bg-emerald-500' : successRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'
            }`} />
            {successRate}% success
          </div>
        )}
        {recentRuns[0] && (
          <div className="flex items-center gap-1 ml-auto">
            <Clock className="w-3.5 h-3.5" />
            {formatDistanceToNow(new Date(recentRuns[0].createdAt), { addSuffix: true })}
          </div>
        )}
      </div>

      {/* Status Badge */}
      <div className={`absolute top-4 right-12 px-2 py-0.5 text-xs rounded-full ${
        agent.isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'
      }`}>
        {agent.isActive ? 'Active' : 'Disabled'}
      </div>
    </div>
  )
}
