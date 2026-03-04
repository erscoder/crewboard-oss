import { Shield, Github, Zap, Send, MessageSquare } from 'lucide-react'

import GitHubConnectionManager from '@/components/GitHubConnectionManager'
import SlackConnectionManager from '@/components/SlackConnectionManager'
import OpenClawConnectionManager from '@/components/OpenClawConnectionManager'
import AgentDeliveryManager from '@/components/AgentDeliveryManager'
import DiscordConnectionManager from '@/components/DiscordConnectionManager'
import TelegramConnectionManager from '@/components/TelegramConnectionManager'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const session = { user: { id: 'oss-user', name: 'User' } }

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10">
      <div className="mx-auto max-w-6xl px-6 py-10 space-y-8">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Crewboard</p>
              <h1 className="text-2xl font-bold">Settings</h1>
            </div>
          </div>

          <a
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium hover:bg-card transition-colors"
          >
            Back to board
          </a>
        </header>

        {/* Source Control & AI Agents — full-width row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* GitHub */}
          <section className="rounded-2xl border border-border bg-card/60 p-5 space-y-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-[#24292f]/10 border border-[#24292f]/30 flex items-center justify-center">
                <Github className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-semibold">GitHub</h2>
                <p className="text-xs text-muted-foreground">Repositories & commits</p>
              </div>
            </div>
            <GitHubConnectionManager />
          </section>

          {/* OpenClaw */}
          <section className="rounded-2xl border border-border bg-card/60 p-5 space-y-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center">
                <Zap className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h2 className="text-base font-semibold">OpenClaw</h2>
                <p className="text-xs text-muted-foreground">AI agent gateway</p>
              </div>
            </div>
            <OpenClawConnectionManager />
          </section>
        </div>

        {/* Notifications — 3-column grid */}
        <div>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-4">Notifications</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Discord */}
            <section className="rounded-2xl border border-border bg-card/60 p-5 space-y-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-[#5865F2]/10 border border-[#5865F2]/30 flex items-center justify-center">
                  <svg className="w-4 h-4 text-[#5865F2]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-base font-semibold">Discord</h2>
                  <p className="text-xs text-muted-foreground">Bot notifications</p>
                </div>
              </div>
              <DiscordConnectionManager />
            </section>

            {/* Slack */}
            <section className="rounded-2xl border border-border bg-card/60 p-5 space-y-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-[#4A154B]/10 border border-[#4A154B]/30 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-[#4A154B]" />
                </div>
                <div>
                  <h2 className="text-base font-semibold">Slack</h2>
                  <p className="text-xs text-muted-foreground">Workspace channels</p>
                </div>
              </div>
              <SlackConnectionManager />
            </section>

            {/* Telegram */}
            <section className="rounded-2xl border border-border bg-card/60 p-5 space-y-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-[#229ED9]/10 border border-[#229ED9]/30 flex items-center justify-center">
                  <Send className="w-4 h-4 text-[#229ED9]" />
                </div>
                <div>
                  <h2 className="text-base font-semibold">Telegram</h2>
                  <p className="text-xs text-muted-foreground">Bot messages</p>
                </div>
              </div>
              <TelegramConnectionManager />
            </section>
          </div>
        </div>

        {/* Agent Delivery — full-width */}
        <section className="rounded-2xl border border-border bg-card/60 p-5 space-y-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center">
              <Send className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Agent Delivery</h2>
              <p className="text-xs text-muted-foreground">Route agent responses to Discord, Slack, or Telegram</p>
            </div>
          </div>
          <AgentDeliveryManager />
        </section>
      </div>
    </main>
  )
}
