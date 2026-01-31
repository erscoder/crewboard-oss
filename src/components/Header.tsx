'use client'

import Link from 'next/link'
import { useState } from 'react'
import { signIn, signOut, useSession } from 'next-auth/react'
import { Rocket, Plus, Users, FolderKanban, ChevronDown, Filter, FolderGit2, Sparkles } from 'lucide-react'
import CreateTaskModal from './CreateTaskModal'
import UserAvatar from './UserAvatar'

interface HeaderProps {
  projects: any[]
  users: any[]
  botStatus: any
}

export default function Header({ projects, users, botStatus }: HeaderProps) {
  const { data: session, status } = useSession()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedProject, setSelectedProject] = useState<string | null>(null)

  const isHarvisWorking = botStatus?.isWorking && 
    botStatus?.lastPing && 
    new Date(botStatus.lastPing).getTime() > Date.now() - 5 * 60 * 1000

  const currentUser = session?.user

  return (
    <>
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex flex-col gap-3 md:gap-4 lg:flex-row lg:items-center lg:justify-between px-4 py-3 md:py-4">
          <div className="flex flex-col gap-3 w-full lg:flex-row lg:items-center lg:gap-5">
            {/* Logo & Title */}
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-11 h-11 md:w-12 md:h-12">
                <img src="/logo.png" width={80} height={80} alt="CreawBoard" className="w-10 h-10 md:w-12 md:h-12 object-contain" />
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-bold leading-tight">CreawBoard</h1>
                <p className="text-xs text-muted-foreground">AI Task management</p>
              </div>
            </div>

            {/* Center: Project Filter Dropdown */}
            <div className="relative w-full md:w-auto md:min-w-[240px]">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <select
                  value={selectedProject || ''}
                  onChange={(e) => setSelectedProject(e.target.value || null)}
                  className="appearance-none bg-card border border-border rounded-xl px-4 py-2.5 pr-10 text-sm font-medium focus:border-primary focus:outline-none cursor-pointer w-full md:w-[240px] lg:w-[260px]"
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
          </div>

          {/* Right: Actions & Users */}
          <div className="flex flex-col gap-2 md:gap-3 w-full lg:w-auto">
            <div className="flex items-center gap-3 justify-between">
              {/* Harvis Live Indicator */}
              {isHarvisWorking && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10 border border-primary/30 min-h-[44px]">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-sm text-primary font-medium">Harvis working</span>
                </div>
              )}

              {/* Users */}
              <div className="hidden md:flex items-center gap-1 flex-wrap max-w-[240px]">
                {users.map((user) => (
                  <UserAvatar
                    key={user.id}
                    user={user}
                    size={32}
                    className=""
                  />
                ))}
              </div>

              {/* New Task Button */}
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl btn btn-primary min-h-[44px]"
              >
                <Plus className="w-4 h-4" />
                New Task
              </button>
            </div>

            <div className="flex items-center gap-2 md:gap-3 overflow-x-auto pb-1 -mx-1 px-1 lg:overflow-visible">
              <Link
                href="/projects"
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-card-hover transition-colors min-h-[44px] flex-shrink-0"
              >
                <FolderKanban className="w-4 h-4" />
                Projects
              </Link>

              <Link
                href="/people"
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-card-hover transition-colors min-h-[44px] flex-shrink-0"
              >
                <Users className="w-4 h-4" />
                People
              </Link>

            <Link
              href="/pricing"
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-card-hover transition-colors min-h-[44px] flex-shrink-0"
            >
              <Sparkles className="w-4 h-4" />
              Pricing
            </Link>

            <Link
              href="/usage"
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-card-hover transition-colors min-h-[44px] flex-shrink-0"
            >
              <Sparkles className="w-4 h-4" />
              Usage
            </Link>

              {/* Auth state */}
              {status === 'authenticated' && currentUser ? (
                <div className="flex items-center gap-3 px-3 py-2 rounded-xl border border-border bg-card/60 min-h-[44px] flex-shrink-0">
                  <UserAvatar
                    user={{
                      name: currentUser.name || 'User',
                      avatar: currentUser.image,
                    }}
                    size={36}
                    showBadge={false}
                  />
                  <div className="hidden sm:block leading-tight">
                    <p className="text-sm font-medium">{currentUser.name || 'Signed in'}</p>
                    {currentUser.email && (
                      <p className="text-xs text-muted-foreground">{currentUser.email}</p>
                    )}
                    {session.user?.planId && (
                      <p className="text-[11px] text-primary font-semibold flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        {session.user.planId.toUpperCase()} plan
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="px-3 py-1.5 rounded-lg border border-border text-sm font-medium hover:bg-card-hover transition-colors"
                  >
                    Sign out
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => signIn('google', { callbackUrl: '/' })}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-sm font-medium hover:bg-card-hover transition-colors min-h-[44px]"
                  >
                    <Rocket className="w-4 h-4" />
                    Google
                  </button>
                  <button
                    onClick={() => signIn('github', { callbackUrl: '/' })}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-sm font-medium hover:bg-card-hover transition-colors min-h-[44px]"
                  >
                    <FolderGit2 className="w-4 h-4" />
                    GitHub
                  </button>
                </div>
              )}
            </div>
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
