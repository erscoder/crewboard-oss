'use client'

import { useEffect, useState } from 'react'
import {
  Github,
  Loader2,
  CheckCircle2,
  XCircle,
  FolderGit2,
  Lock,
  Unlock,
  Plus,
  ExternalLink,
  RefreshCw,
} from 'lucide-react'
import type { GitHubRepo } from '@/types/github'

type GitHubUser = {
  login: string
  name: string | null
  avatar_url: string
  html_url: string
}

type GitHubStatus = {
  connected: boolean
  user?: GitHubUser
  error?: string
}

export default function GitHubConnectionManager() {
  const [status, setStatus] = useState<GitHubStatus | null>(null)
  const [repos, setRepos] = useState<GitHubRepo[]>([])
  const [linkedRepoIds, setLinkedRepoIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [loadingRepos, setLoadingRepos] = useState(false)
  const [creatingProject, setCreatingProject] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/github/status')
      const data = await res.json()
      setStatus(data)
    } catch {
      setStatus({ connected: false, error: 'Failed to check status' })
    } finally {
      setLoading(false)
    }
  }

  const fetchRepos = async () => {
    setLoadingRepos(true)
    setError(null)
    try {
      const res = await fetch('/api/github/repos')
      if (!res.ok) throw new Error('Failed to fetch repos')
      const data = await res.json()
      setRepos(data)

      // Fetch which repos are already linked
      const projectsRes = await fetch('/api/projects')
      if (projectsRes.ok) {
        const projects = await projectsRes.json()
        const linked = new Set<string>()
        for (const p of projects) {
          if (p.githubRepo?.repoId) {
            linked.add(p.githubRepo.repoId)
          }
        }
        setLinkedRepoIds(linked)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load repositories')
    } finally {
      setLoadingRepos(false)
    }
  }

  const createProjectFromRepo = async (repo: GitHubRepo) => {
    setCreatingProject(String(repo.id))
    setError(null)
    setSuccessMessage(null)
    try {
      const res = await fetch('/api/projects/from-repo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo }),
      })
      const data = await res.json()

      if (!res.ok) {
        if (res.status === 409) {
          setError(`${repo.name} is already linked to a project`)
        } else {
          throw new Error(data.error || 'Failed to create project')
        }
        return
      }

      setSuccessMessage(`Project "${data.project.name}" created!`)
      setLinkedRepoIds((prev) => new Set([...Array.from(prev), String(repo.id)]))

      // Clear success message after 3s
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to create project')
    } finally {
      setCreatingProject(null)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [])

  useEffect(() => {
    if (status?.connected) {
      fetchRepos()
    }
  }, [status?.connected])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        Checking GitHub connection...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {status?.connected ? (
            <>
              <img
                src={status.user?.avatar_url}
                alt={status.user?.login}
                className="w-10 h-10 rounded-full border border-border"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{status.user?.name || status.user?.login}</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </div>
                <a
                  href={status.user?.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                >
                  @{status.user?.login}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </>
          ) : (
            <>
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <XCircle className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Not connected</span>
                <p className="text-xs text-muted-foreground">Sign in with GitHub to link repositories</p>
              </div>
            </>
          )}
        </div>

        {!status?.connected && (
          <button
            className="inline-flex items-center gap-2 rounded-xl bg-[#24292f] px-4 py-2 text-sm font-medium text-white hover:bg-[#24292f]/90 transition-colors"
          >
            <Github className="w-4 h-4" />
            Connect GitHub
          </button>
        )}
      </div>

      {/* Repositories */}
      {status?.connected && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">
              Select a repository to create a project
            </p>
            <button
              onClick={fetchRepos}
              disabled={loadingRepos}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-card-hover disabled:opacity-60 transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${loadingRepos ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
          )}

          {successMessage && (
            <p className="text-sm text-emerald-500 bg-emerald-500/10 px-3 py-2 rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {successMessage}
            </p>
          )}

          <div className="max-h-80 overflow-auto rounded-xl border border-border bg-card/50 divide-y divide-border">
            {loadingRepos && repos.length === 0 && (
              <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading repositories...
              </div>
            )}

            {!loadingRepos && repos.length === 0 && (
              <div className="px-4 py-3 text-sm text-muted-foreground">
                No repositories found. Make sure you have access to repositories on GitHub.
              </div>
            )}

            {repos.map((repo) => {
              const isLinked = linkedRepoIds.has(String(repo.id))
              const isCreating = creatingProject === String(repo.id)

              return (
                <div
                  key={repo.id}
                  className={`flex items-center justify-between px-4 py-3 ${
                    isLinked ? 'bg-primary/5' : 'hover:bg-card-hover'
                  } transition-colors`}
                >
                  <div className="flex items-center gap-3">
                    <FolderGit2 className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{repo.full_name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {repo.private ? (
                          <span className="flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Private
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Unlock className="w-3 h-3" /> Public
                          </span>
                        )}
                        {repo.language && <span>• {repo.language}</span>}
                      </div>
                    </div>
                  </div>

                  {isLinked ? (
                    <span className="text-xs text-emerald-500 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Linked
                    </span>
                  ) : (
                    <button
                      onClick={() => createProjectFromRepo(repo)}
                      disabled={isCreating}
                      className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
                    >
                      {isCreating ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Plus className="w-3 h-3" />
                      )}
                      Create Project
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
