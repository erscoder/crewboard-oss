/**
 * Script to link existing projects with their GitHub repos
 * Run with: npx tsx scripts/link-existing-repos.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const GITHUB_API = 'https://api.github.com'

// Manual mapping: project name (lowercase) -> repo name
const PROJECT_TO_REPO: Record<string, string> = {
  'hypersignals-backend': 'hypersignals-backend',
  'hypersignals backend': 'hypersignals-backend',
  'hypersignals-frontend': 'hypersignals-frontend',
  'hypersignals frontend': 'hypersignals-frontend',
  'hypersignals-landing': 'hypersignals-landing',
  'hypersignals landing': 'hypersignals-landing',
  'kike-portfolio': 'erscoder.com',
  'kike portfolio': 'erscoder.com',
}

type GitHubRepo = {
  id: number
  name: string
  full_name: string
  html_url: string
  private: boolean
  owner: { login: string }
}

async function main() {
  console.log('🔗 Linking existing projects to GitHub repos...\n')

  // Get GitHub token
  const account = await prisma.account.findFirst({
    where: { provider: 'github' },
    select: { access_token: true },
  })

  if (!account?.access_token) {
    console.error('❌ No GitHub account found')
    process.exit(1)
  }

  // Fetch repos from GitHub
  const res = await fetch(`${GITHUB_API}/user/repos?per_page=200&sort=updated`, {
    headers: {
      Authorization: `Bearer ${account.access_token}`,
      Accept: 'application/vnd.github+json',
    },
  })

  if (!res.ok) {
    console.error('❌ Failed to fetch GitHub repos')
    process.exit(1)
  }

  const repos: GitHubRepo[] = await res.json()
  const repoByName = new Map(repos.map((r) => [r.name.toLowerCase(), r]))

  console.log(`📦 Found ${repos.length} GitHub repos\n`)

  // Get all projects without linked repos
  const projects = await prisma.project.findMany({
    where: { githubRepo: null },
    select: { id: true, name: true },
  })

  console.log(`📋 Found ${projects.length} projects without linked repos\n`)

  let linked = 0
  let skipped = 0

  for (const project of projects) {
    const projectNameLower = project.name.toLowerCase()
    
    // Try direct mapping first
    let repoName = PROJECT_TO_REPO[projectNameLower]
    
    // If no mapping, try exact match
    if (!repoName) {
      repoName = projectNameLower.replace(/\s+/g, '-')
    }

    const repo = repoByName.get(repoName.toLowerCase())

    if (repo) {
      // Check if this repo is already linked to another project
      const existingLink = await prisma.gitHubRepo.findFirst({
        where: { repoId: String(repo.id) },
      })

      if (existingLink) {
        console.log(`⏭️  ${project.name} → ${repo.full_name} (already linked to another project)`)
        skipped++
        continue
      }

      // Link the repo
      await prisma.gitHubRepo.create({
        data: {
          projectId: project.id,
          repoId: String(repo.id),
          name: repo.name,
          fullName: repo.full_name,
          htmlUrl: repo.html_url,
          private: repo.private,
          owner: repo.owner.login,
        },
      })

      console.log(`✅ ${project.name} → ${repo.full_name}`)
      linked++
    } else {
      console.log(`⚠️  ${project.name} → no matching repo found`)
      skipped++
    }
  }

  console.log(`\n📊 Summary: ${linked} linked, ${skipped} skipped`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
