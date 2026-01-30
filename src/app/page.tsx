import { prisma } from '@/lib/prisma'
import KanbanBoard from '@/components/KanbanBoard'
import StatsBar from '@/components/StatsBar'
import Header from '@/components/Header'
import { Suspense } from 'react'

async function getInitialData() {
  const [tasks, projects, users, botStatus] = await Promise.all([
    prisma.task.findMany({
      include: { project: true, assignee: true },
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

export default async function Home() {
  const { tasks, projects, users, botStatus } = await getInitialData()
  const stats = await getStats()

  return (
    <main className="min-h-screen flex flex-col">
      <Header 
        projects={projects} 
        users={users} 
        botStatus={botStatus}
      />
      <StatsBar stats={stats} />
      <div className="flex-1 p-6">
        <Suspense fallback={<div className="text-muted-foreground">Loading board...</div>}>
          <KanbanBoard 
            initialTasks={tasks} 
            projects={projects}
            users={users}
          />
        </Suspense>
      </div>
    </main>
  )
}

export const dynamic = 'force-dynamic'
