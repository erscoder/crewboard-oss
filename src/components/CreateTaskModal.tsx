'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { createTask } from '@/app/actions'

interface CreateTaskModalProps {
  projects: any[]
  users: any[]
  onClose: () => void
}

export default function CreateTaskModal({ projects, users, onClose }: CreateTaskModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [projectId, setProjectId] = useState(projects[0]?.id || '')
  const [assigneeId, setAssigneeId] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setLoading(true)
    try {
      await createTask({
        title: title.trim(),
        description: description.trim() || undefined,
        projectId,
        assigneeId: assigneeId || undefined,
      })
      onClose()
    } catch (error) {
      console.error('Failed to create task:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">New Task</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-card-hover transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              className="w-full px-3 py-2.5 rounded-xl bg-background border border-border focus:border-primary focus:outline-none"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more details..."
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl bg-background border border-border focus:border-primary focus:outline-none resize-none"
            />
          </div>

          {/* Project */}
          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">Project</label>
            <div className="flex flex-wrap gap-2">
              {projects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => setProjectId(project.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                    projectId === project.id
                      ? 'bg-primary/20 text-primary border border-primary/30'
                      : 'bg-background border border-border hover:border-primary/30'
                  }`}
                >
                  <span 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: project.color }}
                  />
                  {project.name}
                </button>
              ))}
            </div>
          </div>

          {/* Assignee */}
          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">Assign to</label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setAssigneeId('')}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                  !assigneeId
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : 'bg-background border border-border hover:border-primary/30'
                }`}
              >
                Unassigned
              </button>
              {users.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => setAssigneeId(user.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                    assigneeId === user.id
                      ? 'bg-primary/20 text-primary border border-primary/30'
                      : 'bg-background border border-border hover:border-primary/30'
                  }`}
                >
                  <div 
                    className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ 
                      backgroundColor: user.isBot ? 'hsl(142, 71%, 45%)' : 'hsl(262, 83%, 58%)',
                    }}
                  >
                    {user.name.charAt(0)}
                  </div>
                  {user.name}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-background border border-border hover:bg-card-hover transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || loading}
              className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
