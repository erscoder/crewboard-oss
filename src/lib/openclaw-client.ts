// OpenClaw Integration Client
// Reads agent config from openclaw.json (server-side)
// Future: WebSocket RPC when gateway exposes a simpler auth flow

import { readFile } from 'fs/promises'
import { join } from 'path'

export interface OpenClawAgent {
  id: string
  name: string
  model?: string | { primary: string; fallbacks?: string[] }
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
  private configPath: string

  constructor(configPath?: string) {
    this.configPath = configPath 
      || process.env.OPENCLAW_CONFIG_PATH 
      || join(process.env.HOME || '', '.openclaw', 'openclaw.json')
  }

  /**
   * Read and parse the openclaw.json config file
   */
  private async readConfig(): Promise<any> {
    const raw = await readFile(this.configPath, 'utf-8')
    return JSON.parse(raw)
  }

  /**
   * Get the full config
   */
  async getConfig(): Promise<any> {
    return this.readConfig()
  }

  /**
   * Get all agents from the config
   */
  async getAgents(): Promise<OpenClawAgent[]> {
    const config = await this.readConfig()
    const agentsList = config?.agents?.list || []
    return Array.isArray(agentsList) ? agentsList : []
  }

  /**
   * Send a task message to a session (placeholder — requires gateway WebSocket RPC)
   */
  async sendTask(sessionKey: string, message: string): Promise<any> {
    // TODO: Implement via gateway WebSocket RPC when simpler auth is available
    throw new Error('sendTask requires gateway WebSocket connection (not yet implemented)')
  }

  /**
   * Spawn an isolated task session (placeholder — requires gateway WebSocket RPC)
   */
  async spawnTask(task: string, agentId?: string): Promise<any> {
    // TODO: Implement via gateway WebSocket RPC when simpler auth is available
    throw new Error('spawnTask requires gateway WebSocket connection (not yet implemented)')
  }

  /**
   * Check if the config file is readable
   */
  async ping(): Promise<boolean> {
    try {
      await this.readConfig()
      return true
    } catch {
      return false
    }
  }
}

export function createOpenClawClient(configPath?: string): OpenClawClient {
  return new OpenClawClient(configPath)
}
