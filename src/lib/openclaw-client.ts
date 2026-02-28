// OpenClaw Gateway Client
// Config via env vars:
// OPENCLAW_GATEWAY_URL=http://localhost:18789
// OPENCLAW_GATEWAY_TOKEN=<token>

export interface OpenClawAgent {
  id: string
  name: string
  model?: string
  workspace?: string
}

export interface OpenClawSession {
  sessionKey: string
  label?: string
  status: string
  model?: string
  lastActive?: string
}

export interface OpenClawSessionStatus {
  sessionKey: string
  model: string
  tokensUsed?: number
  lastActive?: string
}

export class OpenClawClient {
  private baseUrl: string
  private token: string

  constructor(baseUrl?: string, token?: string) {
    this.baseUrl = baseUrl || process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:18789'
    this.token = token || process.env.OPENCLAW_GATEWAY_TOKEN || ''
  }

  private async fetch(path: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${path}`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    const response = await globalThis.fetch(url, { ...options, headers })

    if (!response.ok) {
      throw new Error(`OpenClaw API error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  async getAgents(): Promise<OpenClawAgent[]> {
    const data = await this.fetch('/api/config')
    const agentsList = data?.agents?.list || data?.agents || []
    return Array.isArray(agentsList) ? agentsList : []
  }

  async getSessions(filters?: { activeMinutes?: number }): Promise<OpenClawSession[]> {
    const params = new URLSearchParams()
    if (filters?.activeMinutes !== undefined) {
      params.set('activeMinutes', String(filters.activeMinutes))
    }
    const query = params.toString() ? `?${params.toString()}` : ''
    const data = await this.fetch(`/api/sessions${query}`)
    return Array.isArray(data) ? data : data?.sessions || []
  }

  async sendTask(sessionKey: string, message: string): Promise<{ reply: string; status: string }> {
    return this.fetch('/api/sessions/send', {
      method: 'POST',
      body: JSON.stringify({ sessionKey, message }),
    })
  }

  async spawnTask(task: string, agentId?: string): Promise<{ sessionKey: string; reply: string }> {
    return this.fetch('/api/sessions/spawn', {
      method: 'POST',
      body: JSON.stringify({ task, ...(agentId ? { agentId } : {}) }),
    })
  }

  async getSessionStatus(sessionKey: string): Promise<OpenClawSessionStatus> {
    return this.fetch(`/api/sessions/${encodeURIComponent(sessionKey)}/status`)
  }

  async ping(): Promise<boolean> {
    try {
      await this.fetch('/api/config')
      return true
    } catch {
      return false
    }
  }
}

export function createOpenClawClient(baseUrl?: string, token?: string): OpenClawClient {
  return new OpenClawClient(baseUrl, token)
}
