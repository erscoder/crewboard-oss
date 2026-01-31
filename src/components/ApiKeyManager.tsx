"use client"

import { useEffect, useMemo, useState, useTransition } from 'react'
import { KeyRound, Loader2, RefreshCw, ShieldCheck, ShieldOff, Trash2 } from 'lucide-react'

type ApiProvider = 'OPENAI' | 'ANTHROPIC'
type ApiKeyStatus = 'PENDING' | 'VALID' | 'INVALID'

type ApiKeySummary = {
  provider: ApiProvider
  status: ApiKeyStatus
  last4: string | null
  lastCheckedAt: string | null
  errorMessage: string | null
}

type ApiKeyOverview = {
  provider: ApiProvider
  label: string
  userKey: ApiKeySummary | null
  platformKey: { available: boolean; last4: string | null }
  inUse: 'user' | 'platform' | 'missing'
}

type ApiKeysResponse = {
  overview: ApiKeyOverview[]
  labels: Record<ApiProvider, string>
  providers: ApiProvider[]
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) } })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data?.error || `Request failed: ${res.status}`)
  }
  return res.json() as Promise<T>
}

function formatDate(value: string | null) {
  if (!value) return 'Never'
  const date = new Date(value)
  return date.toLocaleString()
}

function statusTone(status: ApiKeyStatus) {
  switch (status) {
    case 'VALID':
      return 'text-green-500 bg-green-500/10 border-green-500/30'
    case 'INVALID':
      return 'text-red-500 bg-red-500/10 border-red-500/30'
    default:
      return 'text-amber-500 bg-amber-500/10 border-amber-500/30'
  }
}

function statusLabel(status: ApiKeyStatus) {
  switch (status) {
    case 'VALID':
      return 'Valid'
    case 'INVALID':
      return 'Invalid'
    default:
      return 'Pending'
  }
}

export default function ApiKeyManager() {
  const [data, setData] = useState<ApiKeysResponse | null>(null)
  const [formValues, setFormValues] = useState<Record<ApiProvider, string>>({ OPENAI: '', ANTHROPIC: '' })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isValidating, startValidate] = useTransition()
  const [isDeleting, setIsDeleting] = useState<Record<ApiProvider, boolean>>({ OPENAI: false, ANTHROPIC: false })

  const loadData = async () => {
    const response = await fetchJson<ApiKeysResponse>('/api/api-keys')
    setData(response)
  }

  useEffect(() => {
    loadData().catch((err) => setError(err.message))
  }, [])

  const providers = data?.providers || ['OPENAI', 'ANTHROPIC']

  const handleSave = (provider: ApiProvider) => {
    const value = formValues[provider]?.trim()
    if (!value) {
      setError('Please enter an API key before saving')
      return
    }
    setError(null)
    setSuccess(null)

    startTransition(async () => {
      try {
        await fetchJson(`/api/api-keys`, {
          method: 'POST',
          body: JSON.stringify({ provider, key: value }),
        })
        setFormValues((prev) => ({ ...prev, [provider]: '' }))
        await loadData()
        setSuccess(`${provider} key saved and validated`)
      } catch (err: any) {
        setError(err.message || 'Failed to save key')
      }
    })
  }

  const handleValidate = (provider: ApiProvider) => {
    setError(null)
    setSuccess(null)
    startValidate(async () => {
      try {
        await fetchJson(`/api/api-keys`, {
          method: 'PUT',
          body: JSON.stringify({ provider }),
        })
        await loadData()
        setSuccess(`${provider} key revalidated`)
      } catch (err: any) {
        setError(err.message || 'Validation failed')
      }
    })
  }

  const handleDelete = (provider: ApiProvider) => {
    setError(null)
    setSuccess(null)
    setIsDeleting((prev) => ({ ...prev, [provider]: true }))

    fetchJson(`/api/api-keys`, {
      method: 'DELETE',
      body: JSON.stringify({ provider }),
    })
      .then(async () => {
        await loadData()
        setSuccess(`${provider} key deleted`)
      })
      .catch((err: any) => {
        setError(err.message || 'Failed to delete key')
      })
      .finally(() => {
        setIsDeleting((prev) => ({ ...prev, [provider]: false }))
      })
  }

  const activeProvider = useMemo(() => {
    return data?.overview?.reduce<Record<ApiProvider, 'user' | 'platform' | 'missing'>>((acc, item) => {
      acc[item.provider] = item.inUse
      return acc
    }, { OPENAI: 'missing', ANTHROPIC: 'missing' })
  }, [data])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <KeyRound className="w-4 h-4" />
        <span>Bring your own API keys. They are encrypted at rest. We will use your key if present; otherwise the platform key (if configured).</span>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 text-red-100 px-4 py-2 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-100 px-4 py-2 text-sm">
          {success}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {providers.map((provider) => {
          const meta = data?.overview?.find((o) => o.provider === provider)
          const userKey = meta?.userKey
          const usingUser = meta?.inUse === 'user'
          const platformAvailable = meta?.platformKey?.available
          const status = userKey?.status ?? 'PENDING'

          return (
            <div key={provider} className="rounded-2xl border border-border bg-card/60 p-4 space-y-3 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">{provider}</p>
                  <h3 className="text-lg font-semibold">{meta?.label || provider}</h3>
                  <p className="text-xs text-muted-foreground">{usingUser ? 'Using your key' : meta?.inUse === 'platform' ? 'Using platform key' : 'No key available'}</p>
                </div>
                <div className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium ${statusTone(status)}`}>
                  {status === 'VALID' ? <ShieldCheck className="w-4 h-4" /> : status === 'INVALID' ? <ShieldOff className="w-4 h-4" /> : <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{userKey ? statusLabel(status) : 'Not set'}</span>
                </div>
              </div>

              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>User key</span>
                  <span className="font-medium text-foreground">{userKey ? `•••• ${userKey.last4}` : 'Not set'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Platform key</span>
                  <span className="font-medium text-foreground">{platformAvailable ? `Available •••• ${meta?.platformKey.last4}` : 'Not configured'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Last checked</span>
                  <span className="text-foreground">{userKey ? formatDate(userKey.lastCheckedAt) : 'Never'}</span>
                </div>
                {userKey?.errorMessage && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-50 px-3 py-2 text-xs">
                    {userKey.errorMessage}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={formValues[provider] || ''}
                    onChange={(e) => setFormValues((prev) => ({ ...prev, [provider]: e.target.value }))}
                    placeholder={`Enter ${meta?.label || provider} API key`}
                    className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  />
                  <button
                    onClick={() => handleSave(provider)}
                    disabled={isPending}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                  >
                    {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                    Save
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 text-sm">
                  <button
                    onClick={() => handleValidate(provider)}
                    disabled={isValidating}
                    className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 hover:bg-card-hover transition-colors disabled:opacity-60"
                  >
                    {isValidating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    Revalidate
                  </button>
                  <button
                    onClick={() => handleDelete(provider)}
                    disabled={isDeleting[provider]}
                    className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-red-400 hover:border-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-60"
                  >
                    {isDeleting[provider] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    Delete user key
                  </button>
                  {activeProvider?.[provider] === 'platform' && (
                    <span className="inline-flex items-center gap-2 rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1 text-xs text-blue-100">
                      Using platform default
                    </span>
                  )}
                  {activeProvider?.[provider] === 'missing' && (
                    <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs text-amber-100">
                      No key available
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

