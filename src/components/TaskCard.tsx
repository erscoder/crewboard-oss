'use client'

import { formatDistanceToNow } from 'date-fns'
import { MoreHorizontal, Paperclip, Trash2, User } from 'lucide-react'
import { useState } from 'react'
import { deleteTask } from '@/app/actions'
import ConfirmDialog from './ConfirmDialog'
import UserAvatar from './UserAvatar'

interface TaskCardProps {
  task: any
  onSelect?: () => void
}

export default function TaskCard({ task, onSelect }: TaskCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    await deleteTask(task.id)
    setDeleting(false)
    setShowDeleteConfirm(false)
    setShowMenu(false)
  }

  return (
    <div
      className="group relative bg-card border border-border rounded-2xl p-4 md:p-5 hover:border-primary/30 transition-all cursor-grab active:cursor-grabbing touch-pan-y"
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onSelect?.()
      }}
    >
      {/* Task ID & Project Badge */}
      <div className="flex items-center gap-2 mb-2">
        {task.shortId && (
          <span className="text-xs font-mono text-muted-foreground">
            {task.shortId}
          </span>
        )}
        {task.project && (
          <div
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
            style={{
              backgroundColor: `${task.project.color}20`,
              color: task.project.color,
            }}
          >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: task.project.color }}
          />
          <span className="flex items-center gap-1">
            {task.project.name}
            {task.project.githubRepo && (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-3 h-3 opacity-80"
                aria-label="GitHub linked"
              >
                <path d="M12 2C6.477 2 2 6.486 2 12.021c0 4.425 2.865 8.18 6.839 9.504.5.091.682-.217.682-.483 0-.237-.009-.868-.014-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.156-1.11-1.465-1.11-1.465-.908-.622.069-.61.069-.61 1.004.071 1.531 1.033 1.531 1.033.892 1.53 2.341 1.088 2.91.833.091-.648.35-1.088.636-1.338-2.22-.253-4.555-1.114-4.555-4.957 0-1.095.39-1.99 1.029-2.69-.103-.254-.446-1.274.098-2.656 0 0 .84-.27 2.75 1.027a9.564 9.564 0 0 1 2.5-.337 9.54 9.54 0 0 1 2.5.337c1.909-1.297 2.748-1.027 2.748-1.027.545 1.382.202 2.402.1 2.656.64.7 1.028 1.595 1.028 2.69 0 3.853-2.338 4.701-4.566 4.95.359.31.678.92.678 1.855 0 1.339-.012 2.419-.012 2.747 0 .268.18.58.688.481C19.138 20.198 22 16.444 22 12.02 22 6.486 17.523 2 12 2Z" />
              </svg>
            )}
          </span>
        </div>
        )}
      </div>

      {/* Title */}
      <h3 className="font-medium text-sm md:text-base mb-2 line-clamp-2">{task.title}</h3>

      {/* Description Preview */}
      {task.description && (
        <p className="text-xs md:text-sm text-muted-foreground line-clamp-2 mb-3">
          {task.description}
        </p>
      )}

      {/* Attachments */}
      {task.attachments?.length > 0 && (
        <div className="flex items-center gap-1 text-xs md:text-sm text-muted-foreground mb-3">
          <Paperclip className="w-3.5 h-3.5 md:w-4 md:h-4" />
          <span>{task.attachments.length} attachment{task.attachments.length > 1 ? 's' : ''}</span>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-2 md:pt-3 border-t border-border">
        {/* Assignee */}
        {task.assignee ? (
          <div className="flex items-center gap-2">
            <UserAvatar user={task.assignee} size={32} />
            <span className="text-xs md:text-sm text-muted-foreground">
              {task.assignee.name}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="w-4 h-4 md:w-5 md:h-5" />
            <span className="text-xs md:text-sm">Unassigned</span>
          </div>
        )}

        {/* Time & Actions */}
        <div className="flex items-center gap-2">
          <span className="text-xs md:text-sm text-muted-foreground">
            {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
          </span>
          
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowMenu(!showMenu)
              }}
              className="p-2 md:p-1.5 rounded-lg hover:bg-card-hover opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="w-5 h-5 md:w-4 md:h-4 text-muted-foreground" />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-full mt-1 py-1 bg-card border border-border rounded-lg shadow-xl z-10 min-w-[140px]">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowDeleteConfirm(true)
                    setShowMenu(false)
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 w-full text-left"
                >
                  <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <ConfirmDialog
          title="Delete Task"
          message={`Are you sure you want to delete "${task.title}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          variant="danger"
          loading={deleting}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  )
}
