'use client'

type TaskStatus = 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE'

const statusConfig: Record<TaskStatus, { label: string; className: string }> = {
  BACKLOG: {
    label: 'Backlog',
    className: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  },
  TODO: {
    label: 'To Do',
    className: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  },
  REVIEW: {
    label: 'Review',
    className: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  },
  DONE: {
    label: 'Done',
    className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  },
}

interface StatusBadgeProps {
  status: TaskStatus
  size?: 'sm' | 'md'
}

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.BACKLOG
  
  const sizeClasses = size === 'sm' 
    ? 'px-1.5 py-0.5 text-xs' 
    : 'px-2 py-1 text-xs'

  return (
    <span
      className={`inline-flex items-center rounded-md border font-medium ${config.className} ${sizeClasses}`}
    >
      {config.label}
    </span>
  )
}
