'use client'

import { useState } from 'react'
import { Rocket, Plus, Filter, RefreshCw } from 'lucide-react'
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
              <h1 className="text-xl font-bold">Mission Control</h1>
              <p className="text-xs text-muted-foreground">Kike & Harvis</p>
            </div>
          </div>

          {/* Center: Project Filter */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedProject(null)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                !selectedProject 
                  ? 'bg-primary/20 text-primary' 
                  : 'bg-card hover:bg-card-hover text-muted-foreground'
              }`}
            >
              All
            </button>
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => setSelectedProject(project.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  selectedProject === project.id 
                    ? 'bg-card-hover text-foreground' 
                    : 'bg-card hover:bg-card-hover text-muted-foreground'
                }`}
              >
                <span 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: project.color }}
                />
                {project.name}
              </button>
            ))}
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
