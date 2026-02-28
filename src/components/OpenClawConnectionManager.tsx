'use client'

import { useState, useEffect, useCallback } from 'react'

interface Agent {
  id: string
  name: string
  model: string
  workspace?: string | null
}

interface StatusResponse {
  connected: boolean
  agentCount: number
}

export default function OpenClawConnectionManager() {
  const [status, setStatus] = useState<StatusResponse | null>(null)
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  const checkStatus = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/openclaw/status')
      const data = await res.json()
      setStatus(data)
    } catch {
      setStatus({ connected: false, agentCount: 0 })
    } finally {
      setLoading(false)
    }
  }, [])

  const syncAgents = async () => {
    setSyncing(true)
    setMessage(null)
    try {
      const res = await fetch('/api/openclaw/sync')
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setAgents(data.agents || [])
      setMessage({ text: `Synced ${data.count} agent(s).`, type: 'success' })
      await checkStatus()
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : 'Sync failed', type: 'error' })
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => { checkStatus() }, [checkStatus])

  const connected = status?.connected ?? false

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-sm">
          {loading ? (
            <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground animate-pulse" />
          ) : (
            <span className={`h-2.5 w-2.5 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
          )}
          <span className="text-muted-foreground">
            {loading
              ? 'Checking…'
              : connected
              ? `Connected · ${status?.agentCount ?? 0} agent(s)`
              : 'Not connected'}
          </span>
        </div>
        <button
          onClick={checkStatus}
          disabled={loading}
          className="inline-flex items-center rounded-xl border border-border px-3 py-1.5 text-sm font-medium hover:bg-card transition-colors disabled:opacity-50"
        >
          Check Status
        </button>
        <button
          onClick={syncAgents}
          disabled={syncing || loading}
          className="inline-flex items-center rounded-xl bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {syncing ? 'Syncing…' : 'Sync Agents'}
        </button>
      </div>

      {message && (
        <p className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
          {message.text}
        </p>
      )}

      {agents.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Synced Agents</p>
          <ul className="space-y-1.5">
            {agents.map((a) => (
              <li key={a.id} className="flex items-center justify-between rounded-xl border border-border bg-card/40 px-3 py-2 text-sm">
                <span className="font-medium">{a.name}</span>
                <span className="text-xs text-muted-foreground">{a.model}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
