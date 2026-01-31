import { redirect } from 'next/navigation'
import { Shield, Sparkles, Github, MessageSquare } from 'lucide-react'

import { getAuthSession } from '@/auth'
import ApiKeyManager from '@/components/ApiKeyManager'
import GitHubConnectionManager from '@/components/GitHubConnectionManager'
import SlackConnectionManager from '@/components/SlackConnectionManager'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const session = await getAuthSession()
  if (!session) {
    redirect('/api/auth/signin')
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10">
      <div className="mx-auto max-w-5xl px-6 py-10 space-y-8">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Crewboard</p>
              <h1 className="text-2xl font-bold">Settings</h1>
              <p className="text-sm text-muted-foreground">Manage integrations, API keys, and connections.</p>
            </div>
          </div>

          <a
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium hover:bg-card transition-colors"
          >
            Back to board
          </a>
        </header>

        {/* GitHub Connection */}
        <section className="rounded-2xl border border-border bg-card/60 p-6 space-y-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-2xl bg-[#24292f]/10 border border-[#24292f]/30 flex items-center justify-center">
              <Github className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Source Control</p>
              <h2 className="text-xl font-semibold">GitHub</h2>
              <p className="text-sm text-muted-foreground">
                Connect your GitHub account to create projects from repositories and track commits.
              </p>
            </div>
          </div>

          <GitHubConnectionManager />
        </section>

        {/* Slack Connection */}
        <section className="rounded-2xl border border-border bg-card/60 p-6 space-y-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-2xl bg-[#4A154B]/10 border border-[#4A154B]/30 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-[#4A154B]" />
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Notifications</p>
              <h2 className="text-xl font-semibold">Slack</h2>
              <p className="text-sm text-muted-foreground">
                Connect Slack workspaces to receive task notifications and updates in your channels.
              </p>
            </div>
          </div>

          <SlackConnectionManager />
        </section>

        {/* AI Providers (BYOK) */}
        <section className="rounded-2xl border border-border bg-card/60 p-6 space-y-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-2xl bg-secondary/10 border border-secondary/30 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-secondary" />
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">AI Providers</p>
              <h2 className="text-xl font-semibold">Bring your own key</h2>
              <p className="text-sm text-muted-foreground">
                Store encrypted API keys for OpenAI and Claude. Keys are validated on save and fall back to platform defaults if not present.
              </p>
            </div>
          </div>

          <ApiKeyManager />
        </section>
      </div>
    </main>
  )
}
