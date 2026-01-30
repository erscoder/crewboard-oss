import { prisma } from '@/lib/prisma'
import KanbanBoard from '@/components/KanbanBoard'
import StatsBar from '@/components/StatsBar'
import Header from '@/components/Header'
import ActivityPanel from '@/components/ActivityPanel'
import { Suspense } from 'react'

async function getInitialData() {
  const [tasks, projects, users, botStatus] = await Promise.all([
    prisma.task.findMany({
      include: { project: true, assignee: true, attachments: true },
      orderBy: [{ status: 'asc' }, { order: 'asc' }],
    }),
    prisma.project.findMany(),
    prisma.user.findMany(),
    prisma.botStatus.findFirst({ where: { id: 'harvis' } }),
  ])

  return { tasks, projects, users, botStatus }
}

async function getStats() {
  const [total, done, inProgress] = await Promise.all([
    prisma.task.count(),
    prisma.task.count({ where: { status: 'DONE' } }),
    prisma.task.count({ where: { status: 'IN_PROGRESS' } }),
  ])

  const thisWeek = await prisma.task.count({
    where: {
      status: 'DONE',
      completedAt: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
    },
  })

  return {
    total,
    done,
    inProgress,
    thisWeek,
    completionRate: total > 0 ? Math.round((done / total) * 100) : 0,
  }
}

async function getActivities() {
  return prisma.activity.findMany({
    take: 40,
    orderBy: { createdAt: 'desc' },
    include: { user: true, task: true },
  })
}

export default async function Home() {
  const [{ tasks, projects, users, botStatus }, stats, activities] = await Promise.all([
    getInitialData(),
    getStats(),
    getActivities(),
  ])

  return (
    <main className="min-h-screen flex flex-col">
      <Header 
        projects={projects} 
        users={users} 
        botStatus={botStatus}
      />
      <StatsBar stats={stats} />
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 p-6 overflow-auto">
          <Suspense fallback={<div className="text-muted-foreground">Loading board...</div>}>
            <KanbanBoard 
              initialTasks={tasks}
              users={users}
              currentUserId={users.find(u => !u.isBot)?.id || users[0]?.id || ''}
            />
          </Suspense>
        </div>
        <ActivityPanel activities={activities} />
      </div>
    </main>
  )
}

export const dynamic = 'force-dynamic'
