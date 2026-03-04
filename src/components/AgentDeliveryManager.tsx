'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Loader2, Save } from 'lucide-react'

type SlackChannel = {
  id: string
  channelId: string
  name: string
  workspace: { teamName: string }
}

type DiscordChannel = { id: string; channelId: string; name: string }
type DiscordGuild = { id: string; guildId: string; guildName: string; channels: DiscordChannel[] }

type DeliveryConfig = {
  agentDeliveryEnabled: boolean
  agentDeliveryChannel: string | null
  agentDeliveryTo: string | null
  agentDeliveryBestEffort: boolean
}

export default function AgentDeliveryManager() {
  const [config, setConfig] = useState<DeliveryConfig>({
    agentDeliveryEnabled: false,
    agentDeliveryChannel: null,
    agentDeliveryTo: null,
    agentDeliveryBestEffort: true,
  })
  const [slackChannels, setSlackChannels] = useState<SlackChannel[]>([])
  const [discordGuilds, setDiscordGuilds] = useState<DiscordGuild[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [configRes, slackRes, discordRes] = await Promise.all([
          fetch('/api/settings/agent-delivery'),
          fetch('/api/slack/channels'),
          fetch('/api/discord/guilds'),
        ])
        setConfig(await configRes.json())
        setSlackChannels((await slackRes.json()).channels ?? [])
        setDiscordGuilds((await discordRes.json()).guilds ?? [])
      } catch {
        setError('Failed to load settings')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res = await fetch('/api/settings/agent-delivery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Save failed')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const channel = config.agentDeliveryChannel
  const allDiscordChannels = discordGuilds.flatMap((g) =>
    g.channels.map((c) => ({ ...c, guildName: g.guildName }))
  )

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Enable toggle */}
      <label className="flex items-center gap-3 cursor-pointer">
        <div className="relative">
          <input
            type="checkbox"
            className="sr-only"
            checked={config.agentDeliveryEnabled}
            onChange={(e) => setConfig((c) => ({ ...c, agentDeliveryEnabled: e.target.checked }))}
          />
          <div className={`h-5 w-9 rounded-full transition-colors ${config.agentDeliveryEnabled ? 'bg-primary' : 'bg-border'}`} />
          <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${config.agentDeliveryEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
        </div>
        <span className="text-sm font-medium">Enable agent delivery</span>
      </label>

      {config.agentDeliveryEnabled && (
        <div className="space-y-4 pl-1">
          {/* Channel selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Delivery channel</label>
            <div className="flex gap-2">
              {(['discord', 'slack', 'telegram'] as const).map((ch) => (
                <button
                  key={ch}
                  onClick={() => setConfig((c) => ({ ...c, agentDeliveryChannel: ch, agentDeliveryTo: null }))}
                  className={`rounded-lg border px-3 py-1.5 text-sm capitalize transition-colors ${
                    channel === ch
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background hover:bg-card text-foreground'
                  }`}
                >
                  {ch}
                </button>
              ))}
            </div>
          </div>

          {/* Discord channel picker */}
          {channel === 'discord' && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Discord channel</label>
              {allDiscordChannels.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No Discord servers connected.{' '}
                  <a href="/settings" className="text-primary underline">Connect a server</a> in the Discord section above.
                </p>
              ) : (
                <select
                  value={config.agentDeliveryTo ?? ''}
                  onChange={(e) => setConfig((c) => ({ ...c, agentDeliveryTo: e.target.value || null }))}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-primary"
                >
                  <option value="">Select a channel...</option>
                  {discordGuilds.map((guild) => (
                    <optgroup key={guild.id} label={guild.guildName}>
                      {guild.channels.map((ch) => (
                        <option key={ch.id} value={ch.channelId}>#{ch.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Slack channel picker */}
          {channel === 'slack' && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Slack channel</label>
              {slackChannels.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No Slack channels found. Connect a workspace in the Slack section above.
                </p>
              ) : (
                <select
                  value={config.agentDeliveryTo ?? ''}
                  onChange={(e) => setConfig((c) => ({ ...c, agentDeliveryTo: e.target.value || null }))}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-primary"
                >
                  <option value="">Select a channel...</option>
                  {slackChannels.map((ch) => (
                    <option key={ch.id} value={ch.channelId}>#{ch.name} ({ch.workspace.teamName})</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Telegram */}
          {channel === 'telegram' && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Telegram chat ID</label>
              <input
                type="text"
                value={config.agentDeliveryTo ?? ''}
                onChange={(e) => setConfig((c) => ({ ...c, agentDeliveryTo: e.target.value || null }))}
                placeholder="e.g. -1001234567890"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-primary placeholder:text-muted-foreground"
              />
              <p className="text-[11px] text-muted-foreground">Use @userinfobot on Telegram to get your chat ID.</p>
            </div>
          )}

          {/* Best effort toggle */}
          {channel && (
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={config.agentDeliveryBestEffort}
                  onChange={(e) => setConfig((c) => ({ ...c, agentDeliveryBestEffort: e.target.checked }))}
                />
                <div className={`h-5 w-9 rounded-full transition-colors ${config.agentDeliveryBestEffort ? 'bg-primary' : 'bg-border'}`} />
                <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${config.agentDeliveryBestEffort ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
              <div>
                <span className="text-sm font-medium">Best effort</span>
                <p className="text-[11px] text-muted-foreground">If delivery fails, the agent run still succeeds.</p>
              </div>
            </label>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving}
        className="inline-flex items-center gap-2 rounded-xl btn btn-primary px-4 py-2 text-sm disabled:opacity-50"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
        {saved ? 'Saved' : 'Save settings'}
      </button>
    </div>
  )
}
