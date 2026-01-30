import Link from 'next/link'
import { ArrowLeft, FolderKanban } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { getProjectFolders } from '@/lib/projects'
import ProjectsManager from '@/components/ProjectsManager'
import { syncProjects } from './actions'

export const dynamic = 'force-dynamic'

export default async function ProjectsPage() {
  // Sync filesystem with DB
  const projects = await syncProjects()
  const folders = await getProjectFolders()

  // Map folder info to projects
  const projectsWithFolders = projects.map(project => {
    const folder = folders.find(f => f.name.toLowerCase() === project.name.toLowerCase())
    return {
      ...project,
      hasFolder: !!folder,
      hasGit: folder?.hasGit ?? false,
      path: folder?.path,
    }
  })

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="mx-auto max-w-5xl px-6 py-8 space-y-8">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center">
              <FolderKanban className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Workspace</p>
              <h1 className="text-2xl font-bold">Projects</h1>
              <p className="text-sm text-muted-foreground">
                Manage projects. Each project has a folder in ~/clawd/projects/
              </p>
            </div>
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium hover:bg-card transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to board
          </Link>
        </header>

        <ProjectsManager initialProjects={projectsWithFolders} />
      </div>
    </main>
  )
}
