'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  Plus,
  Bot,
  FolderKanban,
  ChevronDown,
  Filter,
  Menu,
  X,
  Settings,
  BarChart3,
} from 'lucide-react'
import CreateTaskModal from './CreateTaskModal'
import UserAvatar from './UserAvatar'

interface HeaderProps {
  projects: any[]
  users: any[]
  botStatus: any
}

export default function Header({ projects, users, botStatus }: HeaderProps) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)

  const isHarvisWorking = botStatus?.isWorking && 
    botStatus?.lastPing && 
    new Date(botStatus.lastPing).getTime() > Date.now() - 5 * 60 * 1000

  const currentUser = { name: 'User', image: null as string | null }
  const avatarUser = currentUser
    ? {
        name: currentUser.name || 'User',
        avatar: currentUser.image,
      }
    : {
        name: 'Guest',
      }

  const navLinks = [
    {
      href: '/projects',
      label: 'Projects',
      Icon: FolderKanban,
    },
    {
      href: '/agents',
      label: 'Agents',
      Icon: Bot,
    },
  ]

  const accountLinks = [
    { href: '/settings', label: 'Settings', Icon: Settings },
    { href: '/usage', label: 'Usage', Icon: BarChart3 },
  ]

  return (
    <>
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center justify-between gap-3 px-4 py-3 md:py-4">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-11 h-11 md:w-12 md:h-12">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                width={80}
                height={80}
                alt="CrewBoard"
                className="w-10 h-10 md:w-12 md:h-12 object-contain"
              />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg md:text-xl font-bold leading-tight">CrewBoard</h1>
              <p className="text-xs text-muted-foreground">AI Task management</p>
            </div>
          </div>

          {/* Desktop navigation */}
          <div className="hidden md:flex items-center gap-3 flex-1 justify-end">
            <div className="relative w-[240px] lg:w-[260px]">
              <Filter className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <select
                value={selectedProject || ''}
                onChange={(e) => setSelectedProject(e.target.value || null)}
                className="appearance-none bg-card border border-border rounded-xl pl-9 pr-10 py-2.5 text-sm font-medium focus:border-primary focus:outline-none cursor-pointer w-full"
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

            {navLinks.map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-card-hover transition-colors"
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}

            {isHarvisWorking && (
              <div className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10 border border-primary/30 min-h-[44px]">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-sm text-primary font-medium">Harvis working</span>
              </div>
            )}

            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl btn btn-primary min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              New Task
            </button>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((open) => !open)}
              className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg border border-border hover:bg-card-hover transition-colors"
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setIsUserMenuOpen((open) => !open)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-full hover:bg-card-hover transition-colors border border-border"
              >
                <UserAvatar user={avatarUser} size={36} showBadge={false} />
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-card shadow-lg overflow-hidden z-50">
                  <div className="py-1">
                    {accountLinks.map(({ href, label, Icon }) => (
                      <Link
                        key={href}
                        href={href}
                        className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-card-hover"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <Icon className="w-4 h-4" />
                        {label}
                      </Link>
                    ))}

                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-card px-4 pb-4 pt-2 space-y-3">
            <div className="relative">
              <Filter className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <select
                value={selectedProject || ''}
                onChange={(e) => setSelectedProject(e.target.value || null)}
                className="appearance-none bg-card border border-border rounded-xl pl-9 pr-10 py-2.5 text-sm font-medium focus:border-primary focus:outline-none cursor-pointer w-full"
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

            <div className="flex flex-col gap-2">
              {navLinks.map(({ href, label, Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-card-hover transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              ))}

              {accountLinks.map(({ href, label, Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-card-hover transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              ))}

              <button
                onClick={() => {
                  setIsMobileMenuOpen(false)
                  setShowCreateModal(true)
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl btn btn-primary min-h-[44px] justify-center"
              >
                <Plus className="w-4 h-4" />
                New Task
              </button>

              {isHarvisWorking && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10 border border-primary/30 min-h-[44px]">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-sm text-primary font-medium">Harvis working</span>
                </div>
              )}

            </div>
          </div>
        )}
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
