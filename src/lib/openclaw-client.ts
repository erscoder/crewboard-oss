// OpenClaw Integration Client
//
// Primary data source: Gateway WebSocket RPC (agents, ping, agent triggering)
// Fallback: openclaw.json config file (used only if no gateway token)
// Agent triggering: sessions.send via WS — sends message directly to agent session, no cron created

import { readFile } from 'fs/promises'
import { join } from 'path'

export interface OpenClawAgent {
  id: string
  name: string
  model?: string | { primary: string; fallbacks?: string[] }
  workspace?: string
}

export interface UsageCostTotals {
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
  totalTokens: number
  totalCost: number
  inputCost: number
  outputCost: number
  cacheReadCost: number
  cacheWriteCost: number
}

export interface UsageAggregates {
  messages: { total: number; user: number; assistant: number; toolCalls: number; errors: number }
  byAgent: Array<{ agentId: string; totals: UsageCostTotals }>
  byModel: Array<{ provider: string; model: string; count: number; totals: UsageCostTotals }>
  daily: Array<{ date: string; tokens: number; cost: number; messages: number; toolCalls: number; errors: number }>
  tools: { totalCalls: number; uniqueTools: number; tools: Array<{ name: string; count: number }> }
  latency: { count: number; avgMs: number; minMs: number; maxMs: number; p95Ms: number }
}

export interface UsageStatsResult {
  aggregates: UsageAggregates
  totals: UsageCostTotals
  sessionCount: number
}

export class OpenClawClient {
  private gatewayUrl: string
  private gatewayToken: string | undefined
  private configPath: string

  constructor(configPath?: string) {
    this.gatewayUrl = process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:18789'
    this.gatewayToken = process.env.OPENCLAW_GATEWAY_TOKEN
    this.configPath =
      configPath ||
      process.env.OPENCLAW_CONFIG_PATH ||
      join(process.env.HOME || '', '.openclaw', 'openclaw.json')
  }

  // ── WebSocket RPC ──────────────────────────────────────────────────────────

  private wsUrl(): string {
    return this.gatewayUrl.replace(/^http/, 'ws') + '/'
  }

  /**
   * Open a short-lived WS connection, authenticate, call one RPC method, return payload.
   * Uses mode=cli which does not require device keypair signing.
   */
  private wsRequest<T>(method: string, params: Record<string, unknown> = {}, scopes = ['operator.read']): Promise<T> {
    const token = this.gatewayToken!
    const origin = this.gatewayUrl

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { ws.close(); reject(new Error('Gateway WS timeout')) }, 5_000)

      // Node.js 18+ native WebSocket — headers option is a Node-only extension
      const ws = new WebSocket(this.wsUrl(), { headers: { Origin: origin } } as any)
      let resolved = false

      const done = (fn: () => void) => {
        if (resolved) return
        resolved = true
        clearTimeout(timer)
        ws.close()
        fn()
      }

      ws.addEventListener('error', e => done(() => reject(new Error((e as any).message ?? 'WS error'))))
      ws.addEventListener('close', e => {
        if (!resolved) done(() => reject(new Error(`WS closed: ${(e as any).code} ${(e as any).reason}`)))
      })

      ws.addEventListener('message', event => {
        let msg: any
        try { msg = JSON.parse(String((event as any).data)) } catch { return }

        if (msg.event === 'connect.challenge') {
          ws.send(JSON.stringify({
            type: 'req', id: 'c', method: 'connect',
            params: {
              minProtocol: 3, maxProtocol: 3,
              client: { id: 'cli', version: '1.0.0', platform: 'node', mode: 'cli' },
              role: 'operator', scopes,
              auth: { token },
            },
          }))
        } else if (msg.id === 'c') {
          if (!msg.ok) done(() => reject(new Error(msg.error?.message ?? 'Connect failed')))
          else ws.send(JSON.stringify({ type: 'req', id: 'r', method, params }))
        } else if (msg.id === 'r') {
          if (msg.ok) done(() => resolve(msg.payload as T))
          else done(() => reject(new Error(msg.error?.message ?? `${method} failed`)))
        }
      })
    })
  }

  /**
   * Trigger an agent by sending a message to its session via sessions.send.
   * No cron job is created — the message goes directly to the agent session.
   * Fire-and-forget. Uses operator.write scope.
   */
  private wsRunAgent(
    agentId: string,
    message: string,
  ): Promise<{ ok: boolean; error?: string }> {
    if (!this.gatewayToken) return Promise.resolve({ ok: false, error: 'OPENCLAW_GATEWAY_TOKEN not configured' })

    const token = this.gatewayToken
    const origin = this.gatewayUrl

    return new Promise(resolve => {
      const timer = setTimeout(() => { ws.close(); resolve({ ok: false, error: 'Gateway WS timeout' }) }, 30_000)

      const ws = new WebSocket(this.wsUrl(), { headers: { Origin: origin } } as any)
      let done = false

      const finish = (result: { ok: boolean; error?: string }) => {
        if (done) return
        done = true
        clearTimeout(timer)
        ws.close()
        resolve(result)
      }

      ws.addEventListener('error', () => finish({ ok: false, error: 'WS error' }))
      ws.addEventListener('close', () => { if (!done) finish({ ok: true }) })

      ws.addEventListener('message', event => {
        let msg: any
        try { msg = JSON.parse(String((event as any).data)) } catch { return }

        if (msg.event === 'connect.challenge') {
          ws.send(JSON.stringify({
            type: 'req', id: 'c', method: 'connect',
            params: {
              minProtocol: 3, maxProtocol: 3,
              client: { id: 'cli', version: '1.0.0', platform: 'node', mode: 'cli' },
              role: 'operator', scopes: ['operator.read', 'operator.write', 'operator.admin'],
              auth: { token },
            },
          }))
        } else if (msg.id === 'c') {
          if (!msg.ok) { finish({ ok: false, error: msg.error?.message ?? 'Connect failed' }); return }

          // Send directly to the agent session — no cron job created
          const params: Record<string, unknown> = {
            agentId,
            message,
          }

          console.log('[openclaw] sessions.send params:', JSON.stringify(params))
          ws.send(JSON.stringify({ type: 'req', id: 'send', method: 'sessions.send', params }))
        } else if (msg.id === 'send') {
          console.log('[openclaw] sessions.send response:', JSON.stringify(msg))
          finish(msg.ok ? { ok: true } : { ok: false, error: msg.error?.message ?? 'Failed to send message to agent' })
        }
      })
    })
  }

  // ── File fallback ──────────────────────────────────────────────────────────

  private async readConfigFile(): Promise<any> {
    const raw = await readFile(this.configPath, 'utf-8')
    return JSON.parse(raw)
  }

  // ── Config mutation ────────────────────────────────────────────────────────

  /**
   * Add a new agent to openclaw.json via the gateway config.get → config.set flow.
   * Uses operator.write scope. Does not set workspace (OpenClaw uses defaults).
   */
  async addAgentToConfig(
    id: string,
    name: string,
    primaryModel: string,
  ): Promise<{ ok: boolean; error?: string }> {
    if (!this.gatewayToken) return { ok: false, error: 'OPENCLAW_GATEWAY_TOKEN not configured' }
    const token = this.gatewayToken
    const origin = this.gatewayUrl

    return new Promise(resolve => {
      const timer = setTimeout(() => { ws.close(); resolve({ ok: false, error: 'Gateway WS timeout' }) }, 10_000)
      const ws = new WebSocket(this.wsUrl(), { headers: { Origin: origin } } as any)

      ws.addEventListener('error', () => { clearTimeout(timer); resolve({ ok: false, error: 'WS error' }) })

      ws.addEventListener('message', event => {
        let msg: any
        try { msg = JSON.parse(String((event as any).data)) } catch { return }

        if (msg.event === 'connect.challenge') {
          ws.send(JSON.stringify({
            type: 'req', id: 'c', method: 'connect',
            params: {
              minProtocol: 3, maxProtocol: 3,
              client: { id: 'cli', version: '1.0.0', platform: 'node', mode: 'cli' },
              role: 'operator', scopes: ['operator.read', 'operator.write'],
              auth: { token },
            },
          }))
        } else if (msg.id === 'c') {
          if (!msg.ok) { clearTimeout(timer); ws.close(); resolve({ ok: false, error: msg.error?.message }) }
          else ws.send(JSON.stringify({ type: 'req', id: 'get', method: 'config.get', params: {} }))
        } else if (msg.id === 'get') {
          if (!msg.ok) { clearTimeout(timer); ws.close(); resolve({ ok: false, error: msg.error?.message }); return }

          let config: any
          try { config = JSON.parse(msg.payload.raw) } catch { clearTimeout(timer); ws.close(); resolve({ ok: false, error: 'Failed to parse config' }); return }

          const hash: string = msg.payload.hash
          if (!config.agents) config.agents = {}
          if (!Array.isArray(config.agents.list)) config.agents.list = []

          if (config.agents.list.some((a: any) => a.id === id)) {
            clearTimeout(timer); ws.close(); resolve({ ok: false, error: `Agent '${id}' already exists in OpenClaw` }); return
          }

          config.agents.list.push({ id, name, model: { primary: primaryModel } })

          ws.send(JSON.stringify({
            type: 'req', id: 'set', method: 'config.set',
            params: { raw: JSON.stringify(config, null, 2), baseHash: hash },
          }))
        } else if (msg.id === 'set') {
          clearTimeout(timer)
          ws.close()
          resolve(msg.ok ? { ok: true } : { ok: false, error: msg.error?.message ?? 'config.set failed' })
        }
      })
    })
  }

  /**
   * Write a file in an agent's workspace via agents.files.set.
   * Used to set SOUL.md and other agent files.
   */
  async setAgentFile(agentId: string, name: string, content: string): Promise<{ ok: boolean; error?: string }> {
    if (!this.gatewayToken) return { ok: false, error: 'OPENCLAW_GATEWAY_TOKEN not configured' }
    try {
      await this.wsRequest('agents.files.set', { agentId, name, content }, ['operator.read', 'operator.write', 'operator.admin'])
      return { ok: true }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  }

  /**
   * Remove an agent from openclaw.json via the gateway config.get → config.set flow.
   */
  async removeAgentFromConfig(id: string): Promise<{ ok: boolean; error?: string }> {
    if (!this.gatewayToken) return { ok: false, error: 'OPENCLAW_GATEWAY_TOKEN not configured' }
    const token = this.gatewayToken
    const origin = this.gatewayUrl

    return new Promise(resolve => {
      const timer = setTimeout(() => { ws.close(); resolve({ ok: false, error: 'Gateway WS timeout' }) }, 10_000)
      const ws = new WebSocket(this.wsUrl(), { headers: { Origin: origin } } as any)

      ws.addEventListener('error', () => { clearTimeout(timer); resolve({ ok: false, error: 'WS error' }) })

      ws.addEventListener('message', event => {
        let msg: any
        try { msg = JSON.parse(String((event as any).data)) } catch { return }

        if (msg.event === 'connect.challenge') {
          ws.send(JSON.stringify({
            type: 'req', id: 'c', method: 'connect',
            params: {
              minProtocol: 3, maxProtocol: 3,
              client: { id: 'cli', version: '1.0.0', platform: 'node', mode: 'cli' },
              role: 'operator', scopes: ['operator.read', 'operator.write'],
              auth: { token },
            },
          }))
        } else if (msg.id === 'c') {
          if (!msg.ok) { clearTimeout(timer); ws.close(); resolve({ ok: false, error: msg.error?.message }) }
          else ws.send(JSON.stringify({ type: 'req', id: 'get', method: 'config.get', params: {} }))
        } else if (msg.id === 'get') {
          if (!msg.ok) { clearTimeout(timer); ws.close(); resolve({ ok: false, error: msg.error?.message }); return }

          let config: any
          try { config = JSON.parse(msg.payload.raw) } catch { clearTimeout(timer); ws.close(); resolve({ ok: false, error: 'Failed to parse config' }); return }

          const hash: string = msg.payload.hash
          if (!Array.isArray(config.agents?.list)) { clearTimeout(timer); ws.close(); resolve({ ok: true }); return }

          config.agents.list = config.agents.list.filter((a: any) => a.id !== id)

          ws.send(JSON.stringify({
            type: 'req', id: 'set', method: 'config.set',
            params: { raw: JSON.stringify(config, null, 2), baseHash: hash },
          }))
        } else if (msg.id === 'set') {
          clearTimeout(timer)
          ws.close()
          resolve(msg.ok ? { ok: true } : { ok: false, error: msg.error?.message ?? 'config.set failed' })
        }
      })
    })
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Get all agents.
   * - With gateway token → WS agents.list
   * - Without → reads openclaw.json
   * Never throws; returns [] if both fail.
   */
  async getAgents(): Promise<OpenClawAgent[]> {
    if (this.gatewayToken) {
      try {
        const result = await this.wsRequest<{ agents: OpenClawAgent[] }>('agents.list')
        return Array.isArray(result?.agents) ? result.agents : []
      } catch { /* fall through */ }
    }
    try {
      const config = await this.readConfigFile()
      const list = config?.agents?.list ?? []
      return Array.isArray(list) ? list : []
    } catch {
      return []
    }
  }

  /**
   * Get the full config from openclaw.json (for model pricing etc).
   * Returns null if file not found or not configured.
   */
  async getConfig(): Promise<any> {
    try {
      return await this.readConfigFile()
    } catch {
      return null
    }
  }

  /**
   * Fire-and-forget: send a message directly to an agent session via sessions.send.
   * No cron job is created. Never throws. Used for task assignment triggers.
   */
  async sendMessage(
    agentId: string,
    message: string,
  ): Promise<{ ok: boolean; error?: string }> {
    return this.wsRunAgent(agentId, message)
  }

  /**
   * Get usage stats from the gateway for a date range.
   * Calls sessions.usage with date-only strings (YYYY-MM-DD).
   * Returns null if no gateway token or RPC fails.
   */
  async getUsageStats(startDate: string, endDate: string): Promise<UsageStatsResult | null> {
    if (!this.gatewayToken) return null

    try {
      const offsetMin = new Date().getTimezoneOffset()
      const sign = offsetMin <= 0 ? '+' : '-'
      const abs = Math.abs(offsetMin)
      const h = Math.floor(abs / 60)
      const m = abs % 60
      const utcOffset = m > 0 ? `UTC${sign}${h}:${String(m).padStart(2, '0')}` : `UTC${sign}${h}`

      const result = await this.wsRequest<UsageStatsResult>('sessions.usage', {
        startDate, endDate,
        mode: 'specific', utcOffset,
        limit: 1000, includeContextWeight: true,
      }, ['operator.read', 'operator.admin'])
      return result
    } catch (err: any) {
      console.error('[openclaw] sessions.usage failed:', err.message)
      return null
    }
  }

  /**
   * Check connectivity.
   * - With gateway token → WS health RPC
   * - Without → tries to read config file
   */
  async ping(): Promise<boolean> {
    if (this.gatewayToken) {
      try {
        await this.wsRequest('health', {})
        return true
      } catch {
        return false
      }
    }
    try {
      await this.readConfigFile()
      return true
    } catch {
      return false
    }
  }
}

export function createOpenClawClient(configPath?: string): OpenClawClient {
  return new OpenClawClient(configPath)
}
