import { OpenClawClient, createOpenClawClient } from '../lib/openclaw-client'
import { readFile } from 'fs/promises'

jest.mock('fs/promises')
const mockReadFile = readFile as jest.MockedFunction<typeof readFile>

// ── WebSocket mock ─────────────────────────────────────────────────────────

type WsHandler = (event: any) => void

class MockWebSocket {
  static instance: MockWebSocket | null = null
  handlers: Record<string, WsHandler[]> = {}
  sent: string[] = []
  closed = false

  constructor(public url: string, public opts?: any) {
    MockWebSocket.instance = this
  }

  addEventListener(event: string, handler: WsHandler) {
    if (!this.handlers[event]) this.handlers[event] = []
    this.handlers[event].push(handler)
  }

  send(data: string) { this.sent.push(data) }

  close() { this.closed = true }

  emit(event: string, payload: any) {
    this.handlers[event]?.forEach(h => h(payload))
  }

  /** Simulate normal connect+RPC sequence */
  simulateSuccess(payload: any) {
    this.emit('message', { data: JSON.stringify({ type: 'event', event: 'connect.challenge', payload: { nonce: 'n', ts: 1 } }) })
    this.emit('message', { data: JSON.stringify({ type: 'res', id: 'c', ok: true, payload: {} }) })
    this.emit('message', { data: JSON.stringify({ type: 'res', id: 'r', ok: true, payload }) })
  }

  simulateConnectFail(message: string) {
    this.emit('message', { data: JSON.stringify({ type: 'event', event: 'connect.challenge', payload: {} }) })
    this.emit('message', { data: JSON.stringify({ type: 'res', id: 'c', ok: false, error: { message } }) })
  }

  simulateRpcFail(message: string) {
    this.emit('message', { data: JSON.stringify({ type: 'event', event: 'connect.challenge', payload: {} }) })
    this.emit('message', { data: JSON.stringify({ type: 'res', id: 'c', ok: true, payload: {} }) })
    this.emit('message', { data: JSON.stringify({ type: 'res', id: 'r', ok: false, error: { message } }) })
  }

  /** Simulate cron.add success (used by sendMessage/chat) */
  simulateCronAdd(jobId: string, agentId = 'harvis') {
    this.emit('message', { data: JSON.stringify({ type: 'event', event: 'connect.challenge', payload: {} }) })
    this.emit('message', { data: JSON.stringify({ type: 'res', id: 'c', ok: true, payload: {} }) })
    this.emit('message', { data: JSON.stringify({ type: 'res', id: 'add', ok: true, payload: { id: jobId } }) })
    // Simulate the chat.final event (for chat tests that need a response)
    const sessionKey = `agent:${agentId}:cron:${jobId}`
    this.emit('message', { data: JSON.stringify({ type: 'event', event: 'chat', payload: { state: 'final', sessionKey, message: { role: 'assistant', content: [{ type: 'text', text: 'done' }] } } }) })
  }
}

globalThis.WebSocket = MockWebSocket as any

// ── Helpers ────────────────────────────────────────────────────────────────

const sampleConfig = {
  agents: { list: [{ id: 'harvis', name: 'Harvis', model: 'anthropic/claude-sonnet-4-6' }] },
}

beforeEach(() => {
  jest.clearAllMocks()
  MockWebSocket.instance = null
  delete process.env.OPENCLAW_GATEWAY_URL
  delete process.env.OPENCLAW_GATEWAY_TOKEN
  delete process.env.OPENCLAW_CONFIG_PATH
})

// ── constructor ─────────────────────────────────────────────────────────────

describe('constructor', () => {
  it('defaults to HOME/.openclaw/openclaw.json', () => {
    process.env.HOME = '/home/test'
    const c = new OpenClawClient()
    expect(c['configPath']).toBe('/home/test/.openclaw/openclaw.json')
  })

  it('uses OPENCLAW_CONFIG_PATH env var', () => {
    process.env.OPENCLAW_CONFIG_PATH = '/custom/path.json'
    expect(new OpenClawClient()['configPath']).toBe('/custom/path.json')
  })

  it('explicit arg overrides env var', () => {
    process.env.OPENCLAW_CONFIG_PATH = '/env/path.json'
    expect(new OpenClawClient('/explicit/path.json')['configPath']).toBe('/explicit/path.json')
  })
})

// ── createOpenClawClient ────────────────────────────────────────────────────

describe('createOpenClawClient', () => {
  it('returns OpenClawClient instance', () => {
    expect(createOpenClawClient()).toBeInstanceOf(OpenClawClient)
  })

  it('passes configPath through', () => {
    expect(createOpenClawClient('/p.json')['configPath']).toBe('/p.json')
  })
})

// ── getConfig ───────────────────────────────────────────────────────────────

describe('getConfig', () => {
  it('reads and parses the config file', async () => {
    mockReadFile.mockResolvedValueOnce(JSON.stringify(sampleConfig) as any)
    expect(await new OpenClawClient('/p.json').getConfig()).toEqual(sampleConfig)
    expect(mockReadFile).toHaveBeenCalledWith('/p.json', 'utf-8')
  })

  it('returns null when file not found', async () => {
    mockReadFile.mockRejectedValueOnce(new Error('ENOENT'))
    expect(await new OpenClawClient().getConfig()).toBeNull()
  })
})

// ── getAgents (no gateway token) ────────────────────────────────────────────

describe('getAgents without gateway token', () => {
  it('reads agents from config file', async () => {
    mockReadFile.mockResolvedValueOnce(JSON.stringify(sampleConfig) as any)
    expect(await new OpenClawClient().getAgents()).toEqual(sampleConfig.agents.list)
  })

  it('returns empty array when file missing', async () => {
    mockReadFile.mockRejectedValueOnce(new Error('ENOENT'))
    expect(await new OpenClawClient().getAgents()).toEqual([])
  })

  it('returns empty array when agents.list is not an array', async () => {
    mockReadFile.mockResolvedValueOnce(JSON.stringify({ agents: { list: 'bad' } }) as any)
    expect(await new OpenClawClient().getAgents()).toEqual([])
  })
})

// ── getAgents (with gateway token — WS) ────────────────────────────────────

describe('getAgents with gateway token (WS)', () => {
  beforeEach(() => {
    process.env.OPENCLAW_GATEWAY_TOKEN = 'tok'
    process.env.OPENCLAW_GATEWAY_URL = 'http://gw:18789'
  })

  it('returns agents from WS agents.list', async () => {
    const agents = [{ id: 'harvis', name: 'Harvis' }]
    const promise = new OpenClawClient().getAgents()
    MockWebSocket.instance!.simulateSuccess({ agents })
    expect(await promise).toEqual(agents)
  })

  it('sends connect with cli mode and token', async () => {
    const promise = new OpenClawClient().getAgents()
    const ws = MockWebSocket.instance!
    ws.simulateSuccess({ agents: [] })
    await promise
    const connectMsg = JSON.parse(ws.sent[0])
    expect(connectMsg.method).toBe('connect')
    expect(connectMsg.params.client.mode).toBe('cli')
    expect(connectMsg.params.auth.token).toBe('tok')
  })

  it('sends agents.list RPC after connect', async () => {
    const promise = new OpenClawClient().getAgents()
    const ws = MockWebSocket.instance!
    ws.simulateSuccess({ agents: [] })
    await promise
    const rpcMsg = JSON.parse(ws.sent[1])
    expect(rpcMsg.method).toBe('agents.list')
  })

  it('falls back to file when WS connect fails', async () => {
    mockReadFile.mockResolvedValueOnce(JSON.stringify(sampleConfig) as any)
    const promise = new OpenClawClient().getAgents()
    MockWebSocket.instance!.simulateConnectFail('no auth')
    expect(await promise).toEqual(sampleConfig.agents.list)
  })

  it('falls back to [] when WS and file both fail', async () => {
    mockReadFile.mockRejectedValueOnce(new Error('ENOENT'))
    const promise = new OpenClawClient().getAgents()
    MockWebSocket.instance!.simulateConnectFail('no auth')
    expect(await promise).toEqual([])
  })

  it('returns empty array on WS RPC error', async () => {
    mockReadFile.mockRejectedValueOnce(new Error('ENOENT'))
    const promise = new OpenClawClient().getAgents()
    MockWebSocket.instance!.simulateRpcFail('agents not found')
    expect(await promise).toEqual([])
  })
})

// ── sendMessage ─────────────────────────────────────────────────────────────

describe('sendMessage', () => {
  beforeEach(() => {
    process.env.OPENCLAW_GATEWAY_TOKEN = 'tok'
    process.env.OPENCLAW_GATEWAY_URL = 'http://gw:18789'
  })

  it('returns error when gateway token not configured', async () => {
    delete process.env.OPENCLAW_GATEWAY_TOKEN
    const result = await new OpenClawClient().sendMessage('harvis', 'do work')
    expect(result).toEqual({ ok: false, error: 'OPENCLAW_GATEWAY_TOKEN not configured' })
  })

  it('returns ok after cron.add succeeds (fire-and-forget)', async () => {
    const promise = new OpenClawClient().sendMessage('harvis', 'build feature')
    const ws = MockWebSocket.instance!
    ws.simulateCronAdd('job-1')
    expect(await promise).toEqual({ ok: true })
  })

  it('sends cron.add with correct agentId and message', async () => {
    const promise = new OpenClawClient().sendMessage('codex', 'do the task')
    const ws = MockWebSocket.instance!
    ws.simulateCronAdd('job-2')
    await promise
    const addMsg = ws.sent.map(s => JSON.parse(s)).find((m: any) => m.method === 'cron.add')
    expect(addMsg?.params).toMatchObject({ agentId: 'codex', payload: { kind: 'agentTurn', message: 'do the task' } })
  })

  it('requests operator.admin scope for cron.add', async () => {
    const promise = new OpenClawClient().sendMessage('harvis', 'hi')
    const ws = MockWebSocket.instance!
    ws.simulateCronAdd('job-3')
    await promise
    const connectMsg = JSON.parse(ws.sent[0])
    expect(connectMsg.params.scopes).toContain('operator.admin')
  })

  it('returns error when cron.add fails', async () => {
    const promise = new OpenClawClient().sendMessage('harvis', 'msg')
    const ws = MockWebSocket.instance!
    ws.emit('message', { data: JSON.stringify({ type: 'event', event: 'connect.challenge', payload: {} }) })
    ws.emit('message', { data: JSON.stringify({ type: 'res', id: 'c', ok: true, payload: {} }) })
    ws.emit('message', { data: JSON.stringify({ type: 'res', id: 'add', ok: false, error: { message: 'missing scope' } }) })
    const result = await promise
    expect(result.ok).toBe(false)
    expect(result.error).toContain('missing scope')
  })

  it('returns error when WS connect fails', async () => {
    const promise = new OpenClawClient().sendMessage('harvis', 'msg')
    MockWebSocket.instance!.simulateConnectFail('bad token')
    const result = await promise
    expect(result.ok).toBe(false)
  })

  it('includes delivery in cron.add params when provided', async () => {
    const delivery = { channel: 'discord', to: '123456789', bestEffort: false }
    const promise = new OpenClawClient().sendMessage('harvis', 'hi', delivery)
    const ws = MockWebSocket.instance!
    ws.simulateCronAdd('job-4')
    await promise
    const addMsg = ws.sent.map(s => JSON.parse(s)).find((m: any) => m.method === 'cron.add')
    expect(addMsg?.params.delivery).toMatchObject({ mode: 'announce', channel: 'discord', to: '123456789', bestEffort: false })
  })

  it('omits delivery in cron.add params when not provided', async () => {
    const promise = new OpenClawClient().sendMessage('harvis', 'hi')
    const ws = MockWebSocket.instance!
    ws.simulateCronAdd('job-5')
    await promise
    const addMsg = ws.sent.map(s => JSON.parse(s)).find((m: any) => m.method === 'cron.add')
    expect(addMsg?.params.delivery).toBeUndefined()
  })
})

// ── ping ────────────────────────────────────────────────────────────────────

describe('ping without gateway token', () => {
  it('returns true when config file is readable', async () => {
    mockReadFile.mockResolvedValueOnce(JSON.stringify(sampleConfig) as any)
    expect(await new OpenClawClient().ping()).toBe(true)
  })

  it('returns false when file not readable', async () => {
    mockReadFile.mockRejectedValueOnce(new Error('ENOENT'))
    expect(await new OpenClawClient().ping()).toBe(false)
  })
})

describe('ping with gateway token (WS)', () => {
  beforeEach(() => {
    process.env.OPENCLAW_GATEWAY_TOKEN = 'tok'
  })

  it('returns true when gateway responds to health', async () => {
    const promise = new OpenClawClient().ping()
    MockWebSocket.instance!.simulateSuccess({})
    expect(await promise).toBe(true)
  })

  it('returns false when gateway connect fails', async () => {
    const promise = new OpenClawClient().ping()
    MockWebSocket.instance!.simulateConnectFail('bad token')
    expect(await promise).toBe(false)
  })
})
