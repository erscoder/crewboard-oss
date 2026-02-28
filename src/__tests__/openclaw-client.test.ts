import { OpenClawClient, createOpenClawClient } from '../lib/openclaw-client'

const mockFetch = jest.fn()
globalThis.fetch = mockFetch as any

const mockOk = (body: unknown) =>
  Promise.resolve({ ok: true, status: 200, statusText: 'OK', json: () => Promise.resolve(body) } as Response)

const mockErr = (status: number, text: string) =>
  Promise.resolve({ ok: false, status, statusText: text, json: () => Promise.resolve({ error: text }) } as Response)

beforeEach(() => {
  jest.clearAllMocks()
  delete process.env.OPENCLAW_GATEWAY_URL
  delete process.env.OPENCLAW_GATEWAY_TOKEN
})

describe('constructor', () => {
  it('defaults to localhost:18789', () => {
    const c = new OpenClawClient()
    expect(c['baseUrl']).toBe('http://localhost:18789')
    expect(c['token']).toBe('')
  })

  it('uses env vars when no args', () => {
    process.env.OPENCLAW_GATEWAY_URL = 'http://gw'
    process.env.OPENCLAW_GATEWAY_TOKEN = 'mytoken'
    const c = new OpenClawClient()
    expect(c['baseUrl']).toBe('http://gw')
    expect(c['token']).toBe('mytoken')
  })

  it('explicit args override env vars', () => {
    const c = new OpenClawClient('http://custom', 'other')
    expect(c['baseUrl']).toBe('http://custom')
    expect(c['token']).toBe('other')
  })
})

describe('createOpenClawClient', () => {
  it('returns OpenClawClient instance', () => {
    expect(createOpenClawClient()).toBeInstanceOf(OpenClawClient)
  })

  it('passes args through', () => {
    const c = createOpenClawClient('http://x', 'tok')
    expect(c['baseUrl']).toBe('http://x')
    expect(c['token']).toBe('tok')
  })
})

describe('getAgents', () => {
  it('parses agents from agents.list', async () => {
    mockFetch.mockReturnValueOnce(mockOk({ agents: { list: [{ id: '1', name: 'Codex' }] } }))
    expect(await new OpenClawClient().getAgents()).toEqual([{ id: '1', name: 'Codex' }])
  })

  it('parses agents from agents array fallback', async () => {
    mockFetch.mockReturnValueOnce(mockOk({ agents: [{ id: '2', name: 'Harvis' }] }))
    expect(await new OpenClawClient().getAgents()).toEqual([{ id: '2', name: 'Harvis' }])
  })

  it('returns empty array when agents missing', async () => {
    mockFetch.mockReturnValueOnce(mockOk({}))
    expect(await new OpenClawClient().getAgents()).toEqual([])
  })

  it('sets Authorization header when token provided', async () => {
    mockFetch.mockReturnValueOnce(mockOk({ agents: [] }))
    await new OpenClawClient('http://x', 'tok').getAgents()
    expect(mockFetch).toHaveBeenCalledWith('http://x/api/config', expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer tok' }),
    }))
  })

  it('throws on 401', async () => {
    mockFetch.mockReturnValueOnce(mockErr(401, 'Unauthorized'))
    await expect(new OpenClawClient().getAgents()).rejects.toThrow('401')
  })

  it('throws on connection error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'))
    await expect(new OpenClawClient().getAgents()).rejects.toThrow('ECONNREFUSED')
  })
})

describe('getSessions', () => {
  it('returns sessions array', async () => {
    const sessions = [{ sessionKey: 'sk1', status: 'active' }]
    mockFetch.mockReturnValueOnce(mockOk(sessions))
    expect(await new OpenClawClient().getSessions()).toEqual(sessions)
  })

  it('handles sessions wrapped in object', async () => {
    const sessions = [{ sessionKey: 'sk1', status: 'active' }]
    mockFetch.mockReturnValueOnce(mockOk({ sessions }))
    expect(await new OpenClawClient().getSessions()).toEqual(sessions)
  })

  it('passes activeMinutes as query param', async () => {
    mockFetch.mockReturnValueOnce(mockOk([]))
    await new OpenClawClient('http://x').getSessions({ activeMinutes: 30 })
    expect(mockFetch).toHaveBeenCalledWith('http://x/api/sessions?activeMinutes=30', expect.anything())
  })

  it('throws on 404', async () => {
    mockFetch.mockReturnValueOnce(mockErr(404, 'Not Found'))
    await expect(new OpenClawClient().getSessions()).rejects.toThrow('404')
  })
})

describe('sendTask', () => {
  it('sends message and returns reply', async () => {
    const res = { reply: 'Done', status: 'completed' }
    mockFetch.mockReturnValueOnce(mockOk(res))
    expect(await new OpenClawClient('http://x').sendTask('sk1', 'do work')).toEqual(res)
    expect(mockFetch).toHaveBeenCalledWith('http://x/api/sessions/send', expect.objectContaining({ method: 'POST' }))
  })

  it('throws on error response', async () => {
    mockFetch.mockReturnValueOnce(mockErr(500, 'Server Error'))
    await expect(new OpenClawClient().sendTask('sk', 'msg')).rejects.toThrow('500')
  })
})

describe('spawnTask', () => {
  it('spawns task without agentId', async () => {
    const res = { sessionKey: 'new-session', reply: 'started' }
    mockFetch.mockReturnValueOnce(mockOk(res))
    expect(await new OpenClawClient('http://x').spawnTask('build feature')).toEqual(res)
    expect(mockFetch).toHaveBeenCalledWith('http://x/api/sessions/spawn', expect.objectContaining({ method: 'POST' }))
  })

  it('spawns task with agentId in body', async () => {
    mockFetch.mockReturnValueOnce(mockOk({ sessionKey: 's2', reply: 'ok' }))
    await new OpenClawClient('http://x').spawnTask('task', 'agent-1')
    const call = mockFetch.mock.calls[0]
    expect(JSON.parse(call[1].body)).toMatchObject({ task: 'task', agentId: 'agent-1' })
  })

  it('throws on connection refused', async () => {
    mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'))
    await expect(new OpenClawClient().spawnTask('task')).rejects.toThrow('ECONNREFUSED')
  })
})

describe('getSessionStatus', () => {
  it('returns session status', async () => {
    const res = { sessionKey: 'sk1', model: 'claude', tokensUsed: 100 }
    mockFetch.mockReturnValueOnce(mockOk(res))
    expect(await new OpenClawClient('http://x').getSessionStatus('sk1')).toEqual(res)
    expect(mockFetch).toHaveBeenCalledWith('http://x/api/sessions/sk1/status', expect.anything())
  })

  it('encodes sessionKey in URL', async () => {
    mockFetch.mockReturnValueOnce(mockOk({ sessionKey: 'sk:x', model: 'gpt' }))
    await new OpenClawClient('http://x').getSessionStatus('sk:x')
    expect(mockFetch).toHaveBeenCalledWith('http://x/api/sessions/sk%3Ax/status', expect.anything())
  })

  it('throws on 401 unauthorized', async () => {
    mockFetch.mockReturnValueOnce(mockErr(401, 'Unauthorized'))
    await expect(new OpenClawClient().getSessionStatus('sk1')).rejects.toThrow('401')
  })
})

describe('edge cases', () => {
  it('returns empty array when agents.list is not an array', async () => {
    mockFetch.mockReturnValueOnce(mockOk({ agents: { list: 'not-array' } }))
    expect(await new OpenClawClient().getAgents()).toEqual([])
  })

  it('getSessions no filters produces no query string', async () => {
    mockFetch.mockReturnValueOnce(mockOk([]))
    await new OpenClawClient('http://x').getSessions()
    expect(mockFetch).toHaveBeenCalledWith('http://x/api/sessions', expect.anything())
  })
})

describe('ping', () => {
  it('returns true when gateway is reachable', async () => {
    mockFetch.mockReturnValueOnce(mockOk({ agents: [] }))
    expect(await new OpenClawClient().ping()).toBe(true)
  })

  it('returns false when gateway is unreachable', async () => {
    mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'))
    expect(await new OpenClawClient().ping()).toBe(false)
  })

  it('returns false on HTTP error', async () => {
    mockFetch.mockReturnValueOnce(mockErr(500, 'Server Error'))
    expect(await new OpenClawClient().ping()).toBe(false)
  })
})
