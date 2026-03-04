'use client'

import { useState, useTransition } from 'react'
import { X, Bot, Loader2 } from 'lucide-react'
import { createAgent } from '@/app/agents/actions'

const SUGGESTED_MODELS = [
  'anthropic/claude-haiku-4-5',
  'anthropic/claude-sonnet-4-6',
  'anthropic/claude-opus-4-6',
]

function toAgentId(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export default function CreateAgentModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('')
  const [agentId, setAgentId] = useState('')
  const [idManual, setIdManual] = useState(false)
  const [model, setModel] = useState('anthropic/claude-sonnet-4-6')
  const [soul, setSoul] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleNameChange = (v: string) => {
    setName(v)
    if (!idManual) setAgentId(toAgentId(v))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !agentId.trim() || !model.trim()) return

    setError(null)
    startTransition(async () => {
      const result = await createAgent({ id: agentId.trim(), name: name.trim(), primaryModel: model.trim(), soul: soul.trim() })
      if (result.ok) {
        onClose()
      } else {
        setError(result.error ?? 'Failed to create agent')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-primary" />
            <h2 className="font-semibold">New Agent</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Name</label>
            <input
              type="text"
              value={name}
              onChange={e => handleNameChange(e.target.value)}
              placeholder="e.g. Nova"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Agent ID</label>
            <input
              type="text"
              value={agentId}
              onChange={e => { setIdManual(true); setAgentId(e.target.value) }}
              placeholder="e.g. nova"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-primary"
            />
            <p className="text-xs text-muted-foreground">Used to reference the agent in OpenClaw and task assignments</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Primary Model</label>
            <input
              type="text"
              list="model-suggestions"
              value={model}
              onChange={e => setModel(e.target.value)}
              placeholder="anthropic/claude-sonnet-4-6"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-primary"
            />
            <datalist id="model-suggestions">
              {SUGGESTED_MODELS.map(m => <option key={m} value={m} />)}
            </datalist>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Soul <span className="normal-case font-normal">(SOUL.md — optional)</span>
            </label>
            <textarea
              value={soul}
              onChange={e => setSoul(e.target.value)}
              placeholder={"# Who you are\n\nDescribe the agent's personality, mission, and behavior..."}
              rows={5}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-mono resize-none focus:outline-none focus:border-primary"
            />
            <p className="text-xs text-muted-foreground">Written to SOUL.md in the agent's workspace</p>
          </div>

          {error && (
            <p className="text-xs text-red-500 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-card-hover transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !name.trim() || !agentId.trim()}
              className="flex-1 rounded-xl btn btn-primary py-2.5 text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Create Agent
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
