'use client'

import { useState, useTransition } from 'react'
import { Check, FolderGit2, FolderOpen, Plus, X, Slack } from 'lucide-react'
import { createProject, disconnectSlackWorkspace, linkProjectSlackChannel, toggleProjectSlackNotifications } from '@/app/projects/actions'
import GitHubRepoSelector from './GitHubRepoSelector'
import type { GitHubRepo } from '@/types/github'
import { PlanId, getPlanById } from '@/lib/plans'
import UpgradeModal from './UpgradeModal'

type Project = {
  id: string
  name: string
  color: string
  hasFolder: boolean
  hasGit: boolean
  githubRepo?: {
    fullName: string
    htmlUrl: string
  } | null
  slackChannel?: {
    id: string
    channelId: string
    name: string
  } | null
  slackWorkspaceId?: string | null
  notifySlackOnDone: boolean
  path?: string
  _count: { tasks: number }
}

type SlackWorkspace = {
  id: string
  teamId: string
  teamName: string
}

type SlackChannelOption = {
  id: string
  name: string
  is_private?: boolean | null
}

const PROJECT_COLORS = [
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Violet', value: '#8b5cf6' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Blue', value: '#3b82f6' },
]

const emptyForm = { name: '', description: '', color: '#6366f1' }

export default function ProjectsManager({
  initialProjects,
  slackWorkspace,
  slackChannels,
  planId = 'free',
}: {
  initialProjects: Project[]
  slackWorkspace: SlackWorkspace | null
  slackChannels: SlackChannelOption[]
  planId?: PlanId
}) {
  const [projects, setProjects] = useState<Project[]>(initialProjects)
  const [connectedWorkspace, setConnectedWorkspace] = useState<SlackWorkspace | null>(
    slackWorkspace || null,
  )
  const [availableChannels] = useState<SlackChannelOption[]>(slackChannels || [])
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isSlackPending, startSlackTransition] = useTransition()
  const [linkingProjectId, setLinkingProjectId] = useState<string | null>(null)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  const plan = getPlanById(planId)
  const projectLimit = plan.limits.projects ?? Infinity
  const projectLimitReached = Number.isFinite(projectLimit) && projects.length >= projectLimit

  const resetForm = () => {
    setForm(emptyForm)
    setError(null)
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.name.trim()) {
      setError('Name is required')
      return
    }
    if (projectLimitReached) {
      setShowUpgradeModal(true)
      return
    }

    setError(null)
    startTransition(async () => {
      try {
        const created = await createProject({
          name: form.name,
          description: form.description || undefined,
          color: form.color,
        })
        setProjects((prev) => [...prev, { 
          ...created, 
          hasFolder: true, 
          hasGit: true,
          _count: { tasks: 0 }
        }])
        resetForm()
      } catch (err: any) {
        setError(err.message || 'Failed to create project')
      }
    })
  }

  const handleChannelSelect = (projectId: string, channelId: string) => {
    if (!connectedWorkspace) return
    const channel = availableChannels.find((ch) => ch.id === channelId)

    startSlackTransition(async () => {
      const saved = await linkProjectSlackChannel({
        projectId,
        workspaceId: connectedWorkspace.id,
        channelId,
        channelName: channel?.name,
      })

      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId
            ? {
                ...p,
                slackWorkspaceId: connectedWorkspace.id,
                slackChannel: {
                  id: saved.id,
                  channelId: saved.channelId,
                  name: saved.name,
                },
              }
            : p,
        ),
      )
    })
  }

  const handleNotifyToggle = (projectId: string, enabled: boolean) => {
    startSlackTransition(async () => {
      await toggleProjectSlackNotifications(projectId, enabled)
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, notifySlackOnDone: enabled } : p)),
      )
    })
  }

  const handleDisconnectSlack = () => {
    if (!connectedWorkspace) return
    startSlackTransition(async () => {
      await disconnectSlackWorkspace(connectedWorkspace.id)
      setConnectedWorkspace(null)
      setProjects((prev) =>
        prev.map((p) => ({
          ...p,
          slackWorkspaceId: null,
          slackChannel: null,
          notifySlackOnDone: false,
        })),
      )
    })
  }

  return (
    <div className="space-y-8">
      {/* Slack Workspace */}
      <section className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center">
              <Slack className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Slack
              </p>
              <h2 className="text-xl font-semibold">Workspace connection</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Connect Slack to send DONE notifications to a channel.
              </p>
            </div>
          </div>

          {connectedWorkspace ? (
            <button
              onClick={handleDisconnectSlack}
              disabled={isSlackPending}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium hover:bg-destructive/10 hover:border-destructive/50 transition-colors disabled:opacity-60"
            >
              {isSlackPending ? 'Disconnecting...' : 'Disconnect'}
            </button>
          ) : (
            <a
              href="/api/slack/authorize?redirect=/projects"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Connect Slack
            </a>
          )}
        </div>

        {connectedWorkspace ? (
          <div className="mt-4 rounded-xl border border-border bg-background/50 p-4 text-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground">Connected workspace</p>
                <p className="font-semibold">{connectedWorkspace.teamName}</p>
                <p className="text-xs text-muted-foreground">Team ID: {connectedWorkspace.teamId}</p>
              </div>
              <div className="text-xs text-muted-foreground text-right">
                Channels are loaded from Slack. Pick one per project below and enable DONE alerts.
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 text-sm text-muted-foreground">
            You need to connect a workspace before choosing channels per project.
          </div>
        )}
      </section>

      {/* Create Project Form */}
      <section className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <div className="mb-4">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">New Project</p>
          <h2 className="text-xl font-semibold">Create a project</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Creates a folder with README.md and initializes git.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Plan: {plan.name} — {projects.length}/{Number.isFinite(projectLimit) ? projectLimit : '∞'} projects
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground">Project Name</label>
              <input
                className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2.5 focus:border-primary focus:outline-none"
                placeholder="e.g. my-awesome-app"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground">Description (optional)</label>
              <input
                className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2.5 focus:border-primary focus:outline-none"
                placeholder="A brief description..."
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-muted-foreground">Color</label>
            <div className="flex gap-2 mt-2">
              {PROJECT_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, color: color.value }))}
                  className={`w-8 h-8 rounded-full transition-all ${
                    form.color === color.value 
                      ? 'ring-2 ring-offset-2 ring-offset-background ring-primary scale-110' 
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          {error && (
            <div className="text-sm text-destructive font-medium">{error}</div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isPending || projectLimitReached}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {isPending ? (
                'Creating...'
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Create Project
                </>
              )}
            </button>
          </div>
          {projectLimitReached && (
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <Check className="w-4 h-4 text-primary" />
              Project limit reached for this plan. Upgrade to Pro or Team for more projects.
            </p>
          )}
        </form>
      </section>

      {/* Projects List */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <p className="text-sm text-muted-foreground">
            {projects.length} project{projects.length === 1 ? '' : 's'}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <article
              key={project.id}
              className="group relative rounded-2xl border border-border bg-card/70 p-4 transition hover:border-primary/40"
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${project.color}20` }}
                >
                  {project.hasGit ? (
                    <FolderGit2 className="w-5 h-5" style={{ color: project.color }} />
                  ) : (
                    <FolderOpen className="w-5 h-5" style={{ color: project.color }} />
                  )}
                </div>
                <div>
                  <p className="font-semibold">{project.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {project._count.tasks} task{project._count.tasks === 1 ? '' : 's'}
                  </p>
                  {project.githubRepo && (
                    <a
                      href={project.githubRepo.htmlUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300"
                    >
                      <FolderGit2 className="w-3.5 h-3.5" />
                      {project.githubRepo.fullName}
                    </a>
                  )}
                </div>
              </div>

              {project.path && (
                <p className="text-xs text-muted-foreground font-mono truncate">
                  {project.path.replace('/Users/kike', '~')}
                </p>
              )}

            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {project.hasGit && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-500">
                  <Check className="w-3 h-3" />
                  Git
                  </span>
                )}
                {project.hasFolder && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-xs text-blue-500">
                    <FolderOpen className="w-3 h-3" />
                    Folder
                  </span>
                )}
                {project.githubRepo && (
                  <a
                    href={project.githubRepo.htmlUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                  >
                    <FolderGit2 className="w-3 h-3" />
                    {project.githubRepo.fullName}
                  </a>
                )}
              </div>

              {!project.githubRepo && (
                <button
                  onClick={() => setLinkingProjectId(project.id)}
                  className="mt-3 inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium hover:bg-card-hover transition-colors"
                >
                  <FolderGit2 className="w-4 h-4" />
                  Link GitHub repo
                </button>
              )}

              {connectedWorkspace && (
                <div className="mt-4 space-y-2">
                  <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Slack channel
                  </label>
                  <select
                    value={project.slackChannel?.channelId || ''}
                    onChange={(e) => handleChannelSelect(project.id, e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  >
                    <option value="">Select a channel</option>
                    {availableChannels.map((channel) => (
                      <option key={channel.id} value={channel.id}>
                        {channel.name} {channel.is_private ? '(private)' : ''}
                      </option>
                    ))}
                  </select>
                  <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      className="rounded border-border bg-background"
                      disabled={!project.slackChannel}
                      checked={project.notifySlackOnDone && !!project.slackChannel}
                      onChange={(e) => handleNotifyToggle(project.id, e.target.checked)}
                    />
                    Notify Slack when tasks hit DONE
                  </label>
                </div>
              )}
            </article>
          ))}

          {projects.length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed border-border p-6 text-center text-muted-foreground">
              No projects yet. Create one above to get started.
            </div>
          )}
        </div>
      </section>

      {linkingProjectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">GitHub</p>
                <h3 className="text-lg font-semibold">Link a repository</h3>
              </div>
              <button
                onClick={() => setLinkingProjectId(null)}
                className="p-2 rounded-lg hover:bg-card-hover transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <GitHubRepoSelector
              projectId={linkingProjectId}
              onLinked={(repo: GitHubRepo) => {
                setProjects((prev) =>
                  prev.map((p) =>
                    p.id === linkingProjectId
                      ? {
                          ...p,
                          githubRepo: { fullName: repo.full_name, htmlUrl: repo.html_url },
                        }
                      : p,
                  ),
                )
                setLinkingProjectId(null)
              }}
            />
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <UpgradeModal
          currentPlanId={planId}
          limitType="projects"
          onClose={() => setShowUpgradeModal(false)}
        />
      )}
    </div>
  )
}
