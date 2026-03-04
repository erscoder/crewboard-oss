'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Loader2, Send, Trash2 } from 'lucide-react'

type BotStatus = {
  connected: boolean
  disabled?: boolean
  bot?: { username: string; firstName: string }
  error?: string
}

export default function TelegramConnectionManager() {
  const [status, setStatus] = useState<BotStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [testChatId, setTestChatId] = useState('')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null)
  const [disconnecting, setDisconnecting] = useState(false)
  const [reconnecting, setReconnecting] = useState(false)

  const fetchStatus = () => {
    setLoading(true)
    fetch('/api/telegram/status')
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus({ connected: false, error: 'Failed to check' }))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchStatus() }, [])

  const handleTest = async () => {
    if (!testChatId.trim()) return
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/telegram/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: testChatId.trim() }),
      })
      const data = await res.json()
      setTestResult(res.ok ? { ok: true } : { ok: false, error: data.error })
    } catch {
      setTestResult({ ok: false, error: 'Request failed' })
    } finally {
      setTesting(false)
    }
  }

  const handleDisconnect = async () => {
    setDisconnecting(true)
    try {
      await fetch('/api/telegram/disconnect', { method: 'POST' })
      setStatus({ connected: false, disabled: true, error: 'Disconnected' })
    } catch {
      // ignore
    } finally {
      setDisconnecting(false)
    }
  }

  const handleReconnect = async () => {
    setReconnecting(true)
    try {
      await fetch('/api/telegram/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reconnect: true }),
      })
      fetchStatus()
    } catch {
      // ignore
    } finally {
      setReconnecting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Checking bot...
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 text-sm">
        <div className="flex items-center gap-2">
          {status?.connected ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>
                Bot connected: <strong>@{status.bot?.username}</strong>
              </span>
            </>
          ) : (
            <>
              <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
              <span className="text-muted-foreground">
                {status?.error || 'Not configured'}
              </span>
            </>
          )}
        </div>
        {status?.connected && (
          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="flex items-center gap-1.5 rounded-lg border border-red-500/30 px-2.5 py-1.5 text-xs text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
          >
            {disconnecting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
            Disconnect
          </button>
        )}
      </div>

      {status?.connected && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={testChatId}
            onChange={(e) => setTestChatId(e.target.value)}
            placeholder="Chat ID to test"
            className="w-48 rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:border-primary placeholder:text-muted-foreground"
          />
          <button
            onClick={handleTest}
            disabled={testing || !testChatId.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-card transition-colors disabled:opacity-50"
          >
            {testing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
            Test
          </button>
          {testResult && (
            <span className={`text-xs ${testResult.ok ? 'text-emerald-500' : 'text-red-500'}`}>
              {testResult.ok ? 'Sent!' : testResult.error}
            </span>
          )}
        </div>
      )}

      {!status?.connected && status?.disabled && (
        <button
          onClick={handleReconnect}
          disabled={reconnecting}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-card transition-colors disabled:opacity-50"
        >
          {reconnecting ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
          Reconnect
        </button>
      )}

      {!status?.connected && !status?.disabled && (
        <p className="text-[11px] text-muted-foreground">
          Add <code className="font-mono">TELEGRAM_BOT_TOKEN</code> to your <code className="font-mono">.env</code> file.
          Create a bot via <strong>@BotFather</strong> on Telegram.
        </p>
      )}
    </div>
  )
}
