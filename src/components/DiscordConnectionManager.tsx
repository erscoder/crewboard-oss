'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Loader2, Plus, RefreshCw, Trash2 } from 'lucide-react'

type DiscordChannel = { id: string; channelId: string; name: string }
type DiscordGuild = { id: string; guildId: string; guildName: string; channels: DiscordChannel[] }

export default function DiscordConnectionManager() {
  const [guilds, setGuilds] = useState<DiscordGuild[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchGuilds = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/discord/guilds')
      const data = await res.json()
      setGuilds(data.guilds ?? [])
    } catch {
      setError('Failed to load Discord servers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGuilds()
    const handler = (e: MessageEvent) => {
      if (e.origin === window.location.origin && e.data?.type === 'oauth-complete') {
        if (!e.data.error) fetchGuilds()
        else setError('Authorization failed. Check your credentials.')
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  const handleConnect = () => {
    window.open('/api/discord/authorize', 'discord-oauth', 'width=520,height=700')
  }

  const handleSync = async () => {
    setSyncing(true)
    setError(null)
    try {
      const res = await fetch('/api/discord/sync', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Sync failed')
      await fetchGuilds()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSyncing(false)
    }
  }

  const handleDisconnect = async (guild: DiscordGuild) => {
    setDeleting(guild.id)
    try {
      await fetch(`/api/discord/disconnect?id=${guild.id}`, { method: 'DELETE' })
      setGuilds((prev) => prev.filter((g) => g.id !== guild.id))
    } catch {
      setError('Failed to disconnect')
    } finally {
      setDeleting(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-500">{error}</p>}

      {guilds.length > 0 && (
        <div className="space-y-2">
          {guilds.map((guild) => (
            <div key={guild.id} className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-sm font-medium">{guild.guildName}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {guild.channels.length} channel{guild.channels.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleDisconnect(guild)}
                disabled={deleting === guild.id}
                className="flex items-center gap-1.5 rounded-lg border border-red-500/30 px-2.5 py-1.5 text-xs text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
              >
                {deleting === guild.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                Disconnect
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={handleConnect}
          className="inline-flex items-center gap-2 rounded-xl btn btn-primary px-4 py-2 text-sm"
        >
          <Plus className="h-4 w-4" />
          Add Discord Server
        </button>
        <button
          onClick={handleSync}
          disabled={syncing}
          title="Sync servers from bot token (use if OAuth callback doesn't redirect back)"
          className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm hover:bg-card transition-colors disabled:opacity-50"
        >
          {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Sync
        </button>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Add the server via OAuth, then click <strong>Sync</strong> if it doesn't appear automatically.
        Requires <code className="font-mono">DISCORD_BOT_TOKEN</code> in <code className="font-mono">.env</code>.
      </p>
    </div>
  )
}
