'use client'

import { useMemo, useState, type ComponentType } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  ActivitySquare,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  MoveRight,
  PlusCircle,
  Trash2,
  UserCheck,
} from 'lucide-react'

type ActivityItem = {
  id: string
  type: string
  message: string
  createdAt: string | Date
  user?: { name?: string | null } | null
  task?: { title?: string | null } | null
}

const ACTION_LABEL: Record<string, string> = {
  created: 'creó',
  moved: 'movió',
  completed: 'completó',
  deleted: 'eliminó',
  assigned: 'asignó',
}

const ACTION_ICON: Record<string, ComponentType<{ className?: string }>> = {
  created: PlusCircle,
  moved: MoveRight,
  completed: CheckCircle2,
  deleted: Trash2,
  assigned: UserCheck,
}

export default function ActivityPanel({ activities }: { activities: ActivityItem[] }) {
  const [isOpen, setIsOpen] = useState(true)

  const items = useMemo(
    () =>
      activities.map((activity) => {
        const action = ACTION_LABEL[activity.type] ?? 'actualizó'
        const user = activity.user?.name || 'Alguien'
        const taskName =
          activity.task?.title ??
          activity.message.replace(/Task\\s*\"?/, '').replace(/\"?\\s*$/, '')

        return {
          ...activity,
          displayText: `${user} ${action} ${taskName}`.trim(),
        }
      }),
    [activities]
  )

  return (
    <aside
      className={`relative hidden md:block border-l border-border bg-card/70 backdrop-blur-sm transition-all duration-300 overflow-hidden ${
        isOpen ? 'w-80' : 'w-12'
      }`}
    >
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? 'Ocultar panel de actividad' : 'Mostrar panel de actividad'}
        className="absolute -left-3 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card hover:bg-card-hover transition-colors"
      >
        {isOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>

      <div className={`flex items-center gap-2 px-4 py-3 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <ActivitySquare className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold tracking-tight">Actividad reciente</h3>
        <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
          {activities.length}
        </span>
      </div>

      <div className={`${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'} transition-opacity duration-200`}>
        <div className="h-[calc(100vh-160px)] overflow-y-auto px-4 pb-6 space-y-3">
          {items.map((activity) => {
            const Icon = ACTION_ICON[activity.type] ?? ActivitySquare
            const when = formatDistanceToNow(new Date(activity.createdAt), {
              addSuffix: true,
              locale: es,
            })

            return (
              <div
                key={activity.id}
                className="rounded-xl border border-border bg-gradient-to-br from-card/60 to-card/30 p-3 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-card-hover/60">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm leading-snug text-foreground">{activity.displayText}</p>
                    <p className="text-xs text-muted-foreground">{when}</p>
                  </div>
                </div>
              </div>
            )
          })}

          {items.length === 0 && (
            <div className="mt-6 rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
              Aún no hay actividad registrada.
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
