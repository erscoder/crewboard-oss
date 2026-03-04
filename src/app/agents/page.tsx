'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { Bot, Plus, Trash2, Wifi, WifiOff, ArrowLeft, Loader2 } from 'lucide-react'
import CreateAgentModal from '@/components/CreateAgentModal'
import { deleteAgent } from '@/app/agents/actions'

interface Agent {
  id: string
  name: string
  model?: string | { primary: string; fallbacks?: string[] }
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const fetchAgents = () => {
    setLoading(true)
    fetch('/api/openclaw/agents')
      .then(r => r.json())
      .then(data => {
        setAgents(data.agents ?? [])
        setConnected(data.connected ?? false)
      })
      .catch(() => setConnected(false))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchAgents() }, [])

  const handleDelete = (agent: Agent) => {
    if (!confirm(`Remove agent "${agent.name}" from OpenClaw? This cannot be undone.`)) return
    setDeletingId(agent.id)
    startTransition(async () => {
      await deleteAgent(agent.id, agent.name)
      fetchAgents()
      setDeletingId(null)
    })
  }

  const primaryModel = (a: Agent) =>
    typeof a.model === 'string' ? a.model : (a.model as any)?.primary ?? '—'

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10">
      <div className="mx-auto max-w-5xl px-6 py-8 space-y-8">

        {/* Header */}
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">OpenClaw</p>
              <h1 className="text-2xl font-bold">Agents</h1>
              <p className="text-sm text-muted-foreground">
                {connected ? `${agents.length} agent${agents.length !== 1 ? 's' : ''} configured` : 'Not connected to gateway'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm">
              {connected
                ? <><Wifi className="w-4 h-4 text-green-500" /><span className="text-green-500">Connected</span></>
                : <><WifiOff className="w-4 h-4 text-red-500" /><span className="text-red-500">Disconnected</span></>
              }
            </div>
            {connected && (
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl btn btn-primary text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                New Agent
              </button>
            )}
            <Link href="/" className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium hover:bg-card transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>
          </div>
        </header>

        {/* Agents grid */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {agents.map(agent => (
              <div key={agent.id} className="group rounded-2xl border border-border bg-card/60 p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center">
                      <Bot className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{agent.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{agent.id}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(agent)}
                    disabled={deletingId === agent.id}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 disabled:opacity-50"
                    title="Remove agent"
                  >
                    {deletingId === agent.id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Trash2 className="w-3.5 h-3.5" />
                    }
                  </button>
                </div>
                <div className="text-xs text-muted-foreground font-mono bg-background/60 rounded-lg px-2.5 py-1.5 truncate">
                  {primaryModel(agent)}
                </div>
              </div>
            ))}

            {!connected && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                <WifiOff className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">Cannot connect to OpenClaw Gateway</p>
                <p className="text-sm mt-1">
                  Set <code className="bg-card px-1.5 py-0.5 rounded text-xs">OPENCLAW_GATEWAY_URL</code> and{' '}
                  <code className="bg-card px-1.5 py-0.5 rounded text-xs">OPENCLAW_GATEWAY_TOKEN</code> in your .env
                </p>
              </div>
            )}

            {connected && agents.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No agents configured</p>
                <p className="text-sm mt-1">Click "New Agent" to create your first OpenClaw agent</p>
              </div>
            )}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateAgentModal
          onClose={() => { setShowCreate(false); fetchAgents() }}
        />
      )}
    </main>
  )
}
