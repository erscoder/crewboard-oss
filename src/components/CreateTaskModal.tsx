'use client'

import { useState, useTransition } from 'react'
import { Paperclip, X } from 'lucide-react'
import { createTask } from '@/app/actions'
import { useRouter } from 'next/navigation'

interface CreateTaskModalProps {
  projects: any[]
  users: any[]
  onClose: () => void
}

const STATUS_OPTIONS = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'] as const
type TaskStatus = (typeof STATUS_OPTIONS)[number]

export default function CreateTaskModal({ projects, users, onClose }: CreateTaskModalProps) {
  const router = useRouter()
  const [isRefreshing, startTransition] = useTransition()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [projectId, setProjectId] = useState(projects[0]?.id || '')
  const [assigneeId, setAssigneeId] = useState('')
  const [status, setStatus] = useState<TaskStatus>('BACKLOG')
  const [attachments, setAttachments] = useState<{ url: string; filename: string }[]>([
    { url: '', filename: '' },
  ])
  const [loading, setLoading] = useState(false)

  const updateAttachment = (index: number, key: 'url' | 'filename', value: string) => {
    setAttachments((prev) =>
      prev.map((att, i) => (i === index ? { ...att, [key]: value } : att)),
    )
  }

  const addAttachmentField = () => {
    setAttachments((prev) => [...prev, { url: '', filename: '' }])
  }

  const removeAttachmentField = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !description.trim()) return

    setLoading(true)
    try {
      await createTask({
        title: title.trim(),
        description: description.trim(),
        projectId,
        assigneeId: assigneeId || undefined,
        status,
        attachments: attachments
          .filter((att) => att.url.trim())
          .map((att) => ({
            url: att.url.trim(),
            filename: att.filename.trim() || undefined,
          })),
      })

      // Refresh the current route so the Kanban board picks up the new task
      startTransition(() => {
        router.refresh()
      })

      setTitle('')
      setDescription('')
      setAssigneeId('')
      setStatus('BACKLOG')
      setAttachments([{ url: '', filename: '' }])
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
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more details..."
              rows={6}
              className="w-full px-3 py-3.5 rounded-xl bg-background border border-border focus:border-primary focus:outline-none resize-none"
              required
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
              className="w-full px-3 py-2.5 rounded-xl bg-background border border-border focus:border-primary focus:outline-none cursor-pointer"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          {/* Attachments */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Paperclip className="w-4 h-4 text-muted-foreground" />
              <label className="text-sm text-muted-foreground">Attachments (URLs only for now)</label>
            </div>
            <div className="space-y-3">
              {attachments.map((attachment, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-2 items-start">
                  <div className="md:col-span-4">
                    <input
                      type="url"
                      value={attachment.url}
                      onChange={(e) => updateAttachment(index, 'url', e.target.value)}
                      placeholder="https://link-to-file"
                      className="w-full px-3 py-2.5 rounded-xl bg-background border border-border focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div className="md:col-span-2 flex gap-2">
                    <input
                      type="text"
                      value={attachment.filename}
                      onChange={(e) => updateAttachment(index, 'filename', e.target.value)}
                      placeholder="Label"
                      className="w-full px-3 py-2.5 rounded-xl bg-background border border-border focus:border-primary focus:outline-none"
                    />
                    {attachments.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeAttachmentField(index)}
                        className="px-3 py-2 rounded-xl border border-border text-sm hover:bg-card-hover transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addAttachmentField}
              className="mt-3 inline-flex items-center gap-2 text-sm text-primary font-medium"
            >
              <Paperclip className="w-4 h-4" />
              Add another
            </button>
          </div>

          {/* Project & Assignee Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Project */}
            <div>
              <label className="block text-sm text-muted-foreground mb-1.5">Project</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-background border border-border focus:border-primary focus:outline-none cursor-pointer"
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Assignee */}
            <div>
              <label className="block text-sm text-muted-foreground mb-1.5">Assign to</label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-background border border-border focus:border-primary focus:outline-none cursor-pointer"
              >
                <option value="">Unassigned</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.isBot ? '🤖 ' : '👤 '}{user.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || !description.trim() || loading}
              className="flex-1 py-3 rounded-xl btn btn-primary"
            >
              {loading || isRefreshing ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
