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
    // Redirect to Slack OAuth with settings as return path
    window.location.href = '/api/slack/authorize?redirect=/settings'
  }

  useEffect(() => {
    fetchWorkspaces()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading Slack workspaces...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
      )}

      {/* Connected Workspaces */}
      {workspaces.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Connected workspaces</p>
          <div className="rounded-xl border border-border bg-card/50 divide-y divide-border">
            {workspaces.map((workspace) => (
              <div
                key={workspace.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#4A154B] flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-white"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{workspace.teamName}</span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Connected {new Date(workspace.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => disconnectWorkspace(workspace.id)}
                  disabled={deleting === workspace.id}
                  className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-destructive hover:border-destructive/50 disabled:opacity-60 transition-colors"
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
        </div>
      )}

      {/* Empty State / Add Button */}
      {workspaces.length === 0 ? (
        <div className="text-center py-6 rounded-xl border border-dashed border-border">
          <MessageSquare className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground mb-4">
            No Slack workspaces connected yet
          </p>
          <button
            onClick={connectSlack}
            className="inline-flex items-center gap-2 rounded-xl bg-[#4A154B] px-4 py-2 text-sm font-medium text-white hover:bg-[#4A154B]/90 transition-colors"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
            </svg>
            Connect Slack Workspace
          </button>
        </div>
      ) : (
        <button
          onClick={connectSlack}
          className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-xl border border-border hover:bg-card-hover transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add another workspace
        </button>
      )}

      <p className="text-xs text-muted-foreground">
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
