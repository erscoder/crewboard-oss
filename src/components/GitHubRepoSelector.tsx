'use client'

import { useEffect, useState } from 'react'
import { FolderGit2, Link2, Loader2, Lock, Unlock } from 'lucide-react'
import { GitHubRepo } from '@/types/github'

type Props = {
  projectId: string
  onLinked?: (repo: GitHubRepo) => void
  initialLinked?: GitHubRepo | null
}

export default function GitHubRepoSelector({ projectId, onLinked, initialLinked }: Props) {
  const [loading, setLoading] = useState(false)
  const [repos, setRepos] = useState<GitHubRepo[]>([])
  const [error, setError] = useState<string | null>(null)
  const [linked, setLinked] = useState<GitHubRepo | null>(initialLinked ?? null)

  const fetchRepos = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/github/repos')
      if (!res.ok) {
        const detail = res.status === 400 ? 'Connect with GitHub first (sign in with GitHub).' : 'Could not load repos'
        throw new Error(detail)
      }
      const data = (await res.json()) as GitHubRepo[]
      setRepos(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load repositories')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setLinked(initialLinked ?? null)
  }, [initialLinked])

  useEffect(() => {
    // Auto-load when modal opens
    fetchRepos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const linkRepo = async (repo: GitHubRepo) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/github/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, repo }),
      })
      if (!res.ok) throw new Error('Could not link repo')
      setLinked(repo)
      onLinked?.(repo)
    } catch (err: any) {
      setError(err.message || 'Failed to link repository')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderGit2 className="w-4 h-4 text-primary" />
          <p className="text-sm font-medium">GitHub Repository</p>
        </div>
        <button
          onClick={fetchRepos}
          disabled={loading}
          className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-card-hover disabled:opacity-60"
        >
          {loading ? 'Loading...' : 'Load repos'}
        </button>
      </div>

      {linked && (
        <div className="flex items-center gap-2 text-xs text-emerald-400">
          <Link2 className="w-3.5 h-3.5" />
          Linked to {linked.full_name}
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="max-h-60 overflow-auto rounded-xl border border-border bg-card/50 divide-y divide-border">
        {loading && (
          <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Fetching repositories...
          </div>
        )}

        {!loading && repos.length === 0 && (
          <div className="px-3 py-2 text-sm text-muted-foreground">Click "Load repos" to fetch your GitHub repositories.</div>
        )}

        {repos.map((repo) => (
          <button
            key={repo.id}
            onClick={() => linkRepo(repo)}
            className={`w-full text-left px-3 py-2 hover:bg-primary/5 transition flex items-center gap-2 ${
              linked?.id === repo.id ? 'bg-primary/10 border-l-2 border-primary' : ''
            }`}
            disabled={loading}
          >
            <FolderGit2 className="w-4 h-4 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-medium">{repo.full_name}</p>
              <p className="text-xs text-muted-foreground">{repo.private ? 'Private' : 'Public'}</p>
            </div>
            {repo.private ? <Lock className="w-3 h-3 text-muted-foreground" /> : <Unlock className="w-3 h-3 text-muted-foreground" />}
          </button>
        ))}
      </div>
    </div>
  )
}
