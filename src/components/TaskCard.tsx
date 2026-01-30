'use client'

import { formatDistanceToNow } from 'date-fns'
import { MoreHorizontal, User, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { deleteTask } from '@/app/actions'

interface TaskCardProps {
  task: any
  projects: any[]
  users: any[]
}

export default function TaskCard({ task, projects, users }: TaskCardProps) {
  const [showMenu, setShowMenu] = useState(false)

  const handleDelete = async () => {
    if (confirm('Delete this task?')) {
      await deleteTask(task.id)
    }
    setShowMenu(false)
  }

  return (
    <div className="group relative bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-all cursor-grab active:cursor-grabbing">
      {/* Project Badge */}
      {task.project && (
        <div 
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium mb-2"
          style={{ 
            backgroundColor: `${task.project.color}20`,
            color: task.project.color,
          }}
        >
          <span 
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: task.project.color }}
          />
          {task.project.name}
        </div>
      )}

      {/* Title */}
      <h3 className="font-medium text-sm mb-2 line-clamp-2">{task.title}</h3>

      {/* Description Preview */}
      {task.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
          {task.description}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-2 border-t border-border">
        {/* Assignee */}
        {task.assignee ? (
          <div className="flex items-center gap-2">
            <div 
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ 
                backgroundColor: task.assignee.isBot ? 'hsl(142, 71%, 45%)' : 'hsl(262, 83%, 58%)',
              }}
            >
              {task.assignee.name.charAt(0)}
            </div>
            <span className="text-xs text-muted-foreground">
              {task.assignee.name}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="w-4 h-4" />
            <span className="text-xs">Unassigned</span>
          </div>
        )}

        {/* Time & Actions */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
          </span>
          
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowMenu(!showMenu)
              }}
              className="p-1 rounded hover:bg-card-hover opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-full mt-1 py-1 bg-card border border-border rounded-lg shadow-xl z-10 min-w-[120px]">
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 w-full text-left"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
