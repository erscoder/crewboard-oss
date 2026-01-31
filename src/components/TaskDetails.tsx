'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { format } from 'date-fns'
import { CalendarClock, FolderKanban, Loader2, Paperclip, User2, X } from 'lucide-react'
import TaskComments from './TaskComments'
import StatusBadge from './StatusBadge'

type User = {
  id: string
  name: string
  avatar: string | null
  isBot: boolean
}

type TaskStatus = 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE'

type TaskDetailsProps = {
  task: any
  users: User[]
  currentUserId: string
  onClose: () => void
  onStatusChange: (status: TaskStatus) => void
  onAssigneeChange: (assigneeId: string | null) => void | Promise<void>
  onUpdate: (title: string, description: string) => void | Promise<void>
}

export default function TaskDetails({
  task,
  users,
  currentUserId,
  onClose,
  onStatusChange,
  onAssigneeChange,
  onUpdate,
}: TaskDetailsProps) {
  const [selectedAssignee, setSelectedAssignee] = useState(task.assignee?.id ?? '')
  const [isChangingAssignee, startTransition] = useTransition()
  const [isSaving, startSaveTransition] = useTransition()
  const [isEditing, setIsEditing] = useState(false)
  const [titleDraft, setTitleDraft] = useState(task.title ?? '')
  const [descriptionDraft, setDescriptionDraft] = useState(task.description ?? '')
  const statusSelectRef = useRef<HTMLSelectElement>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setSelectedAssignee(task.assignee?.id ?? '')
  }, [task.assignee?.id, task.id])

  useEffect(() => {
    setTitleDraft(task.title ?? '')
    setDescriptionDraft(task.description ?? '')
    setIsEditing(false)
  }, [task.description, task.id, task.title])

  useEffect(() => {
    if (isEditing) {
      titleInputRef.current?.focus()
    }
  }, [isEditing])

  const handleAssigneeChange = (value: string) => {
    setSelectedAssignee(value)
    startTransition(() => {
      Promise.resolve(onAssigneeChange(value || null)).catch((error) =>
        console.error('Failed to update assignee', error)
      )
    })
  }

  const handleStartEditing = () => {
    if (isEditing) return
    setTitleDraft(task.title ?? '')
    setDescriptionDraft(task.description ?? '')
    setIsEditing(true)
  }

  const handleCancel = () => {
    setTitleDraft(task.title ?? '')
    setDescriptionDraft(task.description ?? '')
    setIsEditing(false)
  }

  const handleSave = () => {
    const nextTitle = titleDraft.trim()
    startSaveTransition(() => {
      Promise.resolve(onUpdate(nextTitle, descriptionDraft ?? ''))
        .then(() => setIsEditing(false))
        .catch((error) => console.error('Failed to update task', error))
    })
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[85vh] bg-card border border-border rounded-2xl shadow-2xl overflow-y-auto mx-4 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">
              Task Detail
            </p>
            {isEditing ? (
              <input
                ref={titleInputRef}
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-lg font-semibold leading-tight focus:border-primary focus:outline-none"
              />
            ) : (
              <h3
                className="text-xl font-semibold leading-tight flex items-center gap-3 cursor-text hover:text-primary transition-colors"
                onClick={handleStartEditing}
              >
                {task.title}
              </h3>
            )}
            {task.project && (
              <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs">
                <FolderKanban className="w-3.5 h-3.5" />
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: task.project.color }}
                />
                {task.project.name}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-border p-2 hover:bg-card-hover transition-colors"
            aria-label="Close task details"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-6 px-6 py-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Status</p>
            <div className="inline-flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const select = statusSelectRef.current
                  if (select?.showPicker) {
                    select.showPicker()
                  } else {
                    select?.focus()
                    select?.click()
                  }
                }}
                className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm hover:border-primary/50 transition-colors"
                aria-haspopup="listbox"
                aria-label="Change status"
              >
                <StatusBadge status={task.status} />
                <span className="font-medium capitalize">{task.status.replace('_', ' ')}</span>
              </button>
              <select
                ref={statusSelectRef}
                value={task.status}
                onChange={(e) => onStatusChange(e.target.value as TaskStatus)}
                className="sr-only"
              >
                {['BACKLOG', 'TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'].map((status) => (
                  <option key={status} value={status}>
                    {status.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
              Description
            </p>
            {isEditing ? (
              <textarea
                value={descriptionDraft}
                onChange={(e) => setDescriptionDraft(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm leading-relaxed focus:border-primary focus:outline-none"
              />
            ) : (
              <div
                className="rounded-lg border border-transparent px-2 py-1 text-sm leading-relaxed text-foreground/90 hover:border-border cursor-text"
                onClick={handleStartEditing}
              >
                {task.description?.trim() ? (
                  <p>{task.description}</p>
                ) : (
                  <p className="text-muted-foreground">Añade una descripción</p>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <InfoRow
              icon={<CalendarClock className="w-4 h-4" />}
              label="Created"
              value={format(new Date(task.createdAt), 'PPP')}
            />
            <div className="rounded-xl border border-border px-3 py-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <User2 className="w-4 h-4" />
                <span>Assign to</span>
                {isChangingAssignee && (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground ml-auto" />
                )}
              </div>
              <select
                value={selectedAssignee}
                onChange={(e) => handleAssigneeChange(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-background border border-border focus:border-primary focus:outline-none cursor-pointer"
              >
                <option value="">Unassigned</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.isBot ? '🤖 ' : '👤 '}
                    {user.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
              Attachments
            </p>
            {task.attachments?.length ? (
              <div className="space-y-2">
                {task.attachments.map((file: any) => (
                  <a
                    key={file.id}
                    href={file.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 rounded-xl border border-border px-3 py-2 text-sm hover:border-primary/40 hover:text-primary transition-colors"
                  >
                    <Paperclip className="w-4 h-4" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{file.filename || 'Attachment'}</p>
                      <p className="text-xs text-muted-foreground truncate">{file.url}</p>
                    </div>
                    {file.mimeType && (
                      <span className="text-[11px] text-muted-foreground">{file.mimeType}</span>
                    )}
                  </a>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                No attachments yet.
              </div>
            )}
          </div>

          {isEditing && (
            <div className="flex justify-end gap-3 pt-2 border-t border-border">
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-card-hover transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!titleDraft.trim() || isSaving}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed hover:bg-primary/90"
              >
                {isSaving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          )}

          {/* Comments Section */}
          <div className="pt-4 border-t border-border">
            <TaskComments
              taskId={task.id}
              users={users}
              currentUserId={currentUserId}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border px-3 py-2">
      <div className="text-muted-foreground">{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  )
}
