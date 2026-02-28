import { Bot, Zap, Wifi, WifiOff } from 'lucide-react'
import { createOpenClawClient } from '@/lib/openclaw-client'

export const dynamic = 'force-dynamic'

export default async function AgentsPage() {
  const client = createOpenClawClient()
  let agents: Array<{ id: string; name: string; model?: string; workspace?: string }> = []
  let connected = false

  try {
    connected = await client.ping()
    if (connected) {
      agents = await client.getAgents()
    }
  } catch {
    // Gateway not reachable
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10">
      <div className="mx-auto max-w-6xl px-6 py-10 space-y-8">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">CrewBoard</p>
              <h1 className="text-2xl font-bold">Agents</h1>
              <p className="text-sm text-muted-foreground">
                {connected ? `Connected to OpenClaw · ${agents.length} agent(s)` : 'Not connected to OpenClaw Gateway'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm">
              {connected ? (
                <><Wifi className="w-4 h-4 text-green-500" /><span className="text-green-500">Connected</span></>
              ) : (
                <><WifiOff className="w-4 h-4 text-red-500" /><span className="text-red-500">Disconnected</span></>
              )}
            </div>
            <a
              href="/"
              className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium hover:bg-card transition-colors"
            >
              Back to board
            </a>
          </div>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-border bg-card/60 p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Bot className="w-4 h-4" />
              <span className="text-xs">Agents</span>
            </div>
            <p className="text-2xl font-bold">{agents.length}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card/60 p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Zap className="w-4 h-4" />
              <span className="text-xs">Gateway</span>
            </div>
            <p className="text-2xl font-bold">{connected ? 'Online' : 'Offline'}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card/60 p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Bot className="w-4 h-4" />
              <span className="text-xs">Source</span>
            </div>
            <p className="text-2xl font-bold">OpenClaw</p>
          </div>
        </div>

        {/* Agent Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => {
            const model = typeof agent.model === 'string' 
              ? agent.model 
              : (agent.model as any)?.primary || 'unknown'
            
            return (
              <div key={agent.id} className="rounded-2xl border border-border bg-card/60 p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center">
                      <Bot className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{agent.name}</h3>
                      <p className="text-xs text-muted-foreground">{agent.id}</p>
                    </div>
                  </div>
                  <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p><span className="font-medium text-foreground">Model:</span> {model}</p>
                  {agent.workspace && (
                    <p><span className="font-medium text-foreground">Workspace:</span> {agent.workspace}</p>
                  )}
                </div>
              </div>
            )
          })}

          {!connected && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <WifiOff className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Cannot connect to OpenClaw Gateway</p>
              <p className="text-sm mt-1">Set <code className="bg-card px-1.5 py-0.5 rounded text-xs">OPENCLAW_GATEWAY_URL</code> and <code className="bg-card px-1.5 py-0.5 rounded text-xs">OPENCLAW_GATEWAY_TOKEN</code> in your .env</p>
            </div>
          )}

          {connected && agents.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No agents configured in OpenClaw</p>
              <p className="text-sm mt-1">Add agents to your openclaw.json to see them here.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
