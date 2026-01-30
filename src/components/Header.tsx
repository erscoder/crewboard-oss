'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Rocket, Plus, Users, FolderKanban, ChevronDown, Filter } from 'lucide-react'
import CreateTaskModal from './CreateTaskModal'

interface HeaderProps {
  projects: any[]
  users: any[]
  botStatus: any
}

export default function Header({ projects, users, botStatus }: HeaderProps) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedProject, setSelectedProject] = useState<string | null>(null)

  const isHarvisWorking = botStatus?.isWorking && 
    botStatus?.lastPing && 
    new Date(botStatus.lastPing).getTime() > Date.now() - 5 * 60 * 1000

  return (
    <>
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center justify-between px-6 py-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20">
              <Rocket className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">MoltBoard</h1>
              <p className="text-xs text-muted-foreground">Moltbot task management</p>
            </div>
          </div>

          {/* Center: Project Filter Dropdown */}
          <div className="relative">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <select
                value={selectedProject || ''}
                onChange={(e) => setSelectedProject(e.target.value || null)}
                className="appearance-none bg-card border border-border rounded-xl px-4 py-2 pr-10 text-sm font-medium focus:border-primary focus:outline-none cursor-pointer min-w-[180px]"
              >
                <option value="">All Projects</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Right: Actions & Users */}
          <div className="flex items-center gap-4">
            {/* Harvis Live Indicator */}
            {isHarvisWorking && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/30">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-sm text-primary font-medium">Harvis working</span>
              </div>
            )}

            {/* Users */}
            <div className="flex items-center -space-x-2">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="w-8 h-8 rounded-full border-2 border-background flex items-center justify-center text-xs font-bold"
                  style={{ 
                    backgroundColor: user.isBot ? 'hsl(142, 71%, 45%)' : 'hsl(262, 83%, 58%)',
                  }}
                  title={user.name}
                >
                  {user.name.charAt(0)}
                </div>
              ))}
            </div>

            <Link
              href="/projects"
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-card-hover transition-colors"
            >
              <FolderKanban className="w-4 h-4" />
              Projects
            </Link>

            <Link
              href="/people"
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-card-hover transition-colors"
            >
              <Users className="w-4 h-4" />
              People
            </Link>

            {/* New Task Button */}
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Task
            </button>
          </div>
        </div>
      </header>

      {showCreateModal && (
        <CreateTaskModal 
          projects={projects}
          users={users}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </>
  )
}
