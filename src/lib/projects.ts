import 'server-only'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { readdir, stat } from 'fs/promises'
import { join } from 'path'
import { execSync } from 'child_process'

export const PROJECTS_DIR = '/Users/kike/clawd/projects'

export interface ProjectFolder {
  name: string
  path: string
  hasGit: boolean
  createdAt: Date
}

/**
 * Get all project folders from the filesystem
 */
export async function getProjectFolders(): Promise<ProjectFolder[]> {
  if (!existsSync(PROJECTS_DIR)) {
    mkdirSync(PROJECTS_DIR, { recursive: true })
    return []
  }

  const entries = await readdir(PROJECTS_DIR, { withFileTypes: true })
  const folders: ProjectFolder[] = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    if (entry.name.startsWith('.')) continue // Skip hidden folders
    
    const folderPath = join(PROJECTS_DIR, entry.name)
    const stats = await stat(folderPath)
    const hasGit = existsSync(join(folderPath, '.git'))

    folders.push({
      name: entry.name,
      path: folderPath,
      hasGit,
      createdAt: stats.birthtime,
    })
  }

  return folders.sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Create a new project folder with README and git init
 */
export function createProjectFolder(name: string, description?: string): ProjectFolder {
  const safeName = name
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  const folderPath = join(PROJECTS_DIR, safeName)

  if (existsSync(folderPath)) {
    throw new Error(`Project folder "${safeName}" already exists`)
  }

  // Create directory
  mkdirSync(folderPath, { recursive: true })

  // Create README.md
  const readme = `# ${name}

${description || 'A new project.'}

## Getting Started

TODO: Add setup instructions.

## Structure

TODO: Document project structure.

---
*Created with Mission Control*
`
  writeFileSync(join(folderPath, 'README.md'), readme)

  // Initialize git
  try {
    execSync('git init', { cwd: folderPath, stdio: 'ignore' })
    execSync('git add README.md', { cwd: folderPath, stdio: 'ignore' })
    execSync('git commit -m "Initial commit"', { cwd: folderPath, stdio: 'ignore' })
  } catch (err) {
    console.error('Git init failed:', err)
  }

  return {
    name: safeName,
    path: folderPath,
    hasGit: true,
    createdAt: new Date(),
  }
}
