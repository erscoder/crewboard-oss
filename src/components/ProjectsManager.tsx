'use client'

import { useState, useTransition } from 'react'
import { Check, FolderGit2, FolderOpen, Plus, X } from 'lucide-react'
import { createProject } from '@/app/projects/actions'

type Project = {
  id: string
  name: string
  color: string
  hasFolder: boolean
  hasGit: boolean
  path?: string
  _count: { tasks: number }
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

export default function ProjectsManager({ initialProjects }: { initialProjects: Project[] }) {
  const [projects, setProjects] = useState<Project[]>(initialProjects)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

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

  return (
    <div className="space-y-8">
      {/* Create Project Form */}
      <section className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <div className="mb-4">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">New Project</p>
          <h2 className="text-xl font-semibold">Create a project</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Creates a folder with README.md and initializes git.
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
              disabled={isPending}
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
                </div>
              </div>

              {project.path && (
                <p className="text-xs text-muted-foreground font-mono truncate">
                  {project.path.replace('/Users/kike', '~')}
                </p>
              )}

              <div className="flex items-center gap-2 mt-3">
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
              </div>
            </article>
          ))}

          {projects.length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed border-border p-6 text-center text-muted-foreground">
              No projects yet. Create one above to get started.
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
