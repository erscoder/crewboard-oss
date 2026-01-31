'use client'

import { CheckCircle2, Clock, ListTodo, TrendingUp } from 'lucide-react'

interface StatsBarProps {
  stats: {
    total: number
    done: number
    inProgress: number
    thisWeek: number
    completionRate: number
  }
}

export default function StatsBar({ stats }: StatsBarProps) {
  return (
    <div className="border-b border-border bg-card/30">
      <div className="flex flex-wrap items-center justify-center gap-6 md:gap-8 lg:gap-12 px-4 md:px-6 py-3">
        <StatItem 
          icon={<CheckCircle2 className="w-4 h-4" />}
          label="This Week"
          value={stats.thisWeek}
          color="text-primary"
        />
        <div className="w-px h-8 bg-border" />
        <StatItem 
          icon={<Clock className="w-4 h-4" />}
          label="In Progress"
          value={stats.inProgress}
          color="text-yellow-500"
        />
        <div className="w-px h-8 bg-border" />
        <StatItem 
          icon={<ListTodo className="w-4 h-4" />}
          label="Total Tasks"
          value={stats.total}
          color="text-blue-500"
        />
        <div className="w-px h-8 bg-border" />
        <StatItem 
          icon={<TrendingUp className="w-4 h-4" />}
          label="Completion"
          value={`${stats.completionRate}%`}
          color="text-purple-500"
        />
      </div>
    </div>
  )
}

function StatItem({ 
  icon, 
  label, 
  value, 
  color 
}: { 
  icon: React.ReactNode
  label: string
  value: number | string
  color: string 
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={`${color}`}>{icon}</div>
      <div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  )
}
