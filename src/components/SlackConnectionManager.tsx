'use client'

import { useEffect, useState } from 'react'
import {
  Loader2,
  CheckCircle2,
  Trash2,
  Plus,
  MessageSquare,
  ExternalLink,
} from 'lucide-react'

type SlackWorkspace = {
  id: string
  teamId: string
  teamName: string
  createdAt: string
}

export default function SlackConnectionManager() {
  const [workspaces, setWorkspaces] = useState<SlackWorkspace[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchWorkspaces = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/slack/workspaces')
      if (!res.ok) throw new Error('Failed to fetch workspaces')
      const data = await res.json()
      setWorkspaces(data.workspaces || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load workspaces')
    } finally {
      setLoading(false)
    }
  }

  const disconnectWorkspace = async (id: string) => {
    if (!confirm('Disconnect this Slack workspace? Projects using it will lose notifications.')) {
      return
    }

    setDeleting(id)
    setError(null)
    try {
      const res = await fetch(`/api/slack/workspaces?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to disconnect workspace')
      setWorkspaces((prev) => prev.filter((w) => w.id !== id))
    } catch (err: any) {
      setError(err.message || 'Failed to disconnect')
    } finally {
      setDeleting(null)
    }
  }

  const connectSlack = () => {
    const popup = window.open('/api/slack/authorize?redirect=/oauth/success', 'slack-oauth', 'width=520,height=700')
    const timer = setInterval(() => {
      if (popup?.closed) { clearInterval(timer); fetchWorkspaces() }
    }, 500)
  }

  useEffect(() => {
    fetchWorkspaces()
    const handler = (e: MessageEvent) => {
      if (e.origin === window.location.origin && e.data?.type === 'oauth-complete' && !e.data.error) {
        fetchWorkspaces()
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading...
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      {workspaces.length > 0 && (
        <div className="space-y-2">
          {workspaces.map((workspace) => (
            <div
              key={workspace.id}
              className="flex items-center justify-between rounded-xl border border-border bg-background/60 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                <div>
                  <p className="text-sm font-medium">{workspace.teamName}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Connected {new Date(workspace.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => disconnectWorkspace(workspace.id)}
                disabled={deleting === workspace.id}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:text-red-500 hover:border-red-500/30 transition-colors disabled:opacity-50"
              >
                {deleting === workspace.id ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Trash2 className="w-3 h-3" />
                )}
                Disconnect
              </button>
            </div>
          ))}
        </div>
      )}

      {workspaces.length === 0 ? (
        <div className="text-center py-6 rounded-xl border border-dashed border-border">
          <MessageSquare className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground mb-4">
            No Slack workspaces connected yet
          </p>
          <button
            onClick={connectSlack}
            className="inline-flex items-center gap-2 rounded-xl btn btn-primary px-4 py-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Connect Slack Workspace
          </button>
        </div>
      ) : (
        <button
          onClick={connectSlack}
          className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-xl border border-border hover:bg-card transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add another workspace
        </button>
      )}

      <p className="text-[11px] text-muted-foreground">
        Connect Slack to receive task notifications in your channels.{' '}
        <a
          href="https://api.slack.com/apps"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline inline-flex items-center gap-1"
        >
          Manage apps
          <ExternalLink className="w-3 h-3" />
        </a>
      </p>
    </div>
  )
}
