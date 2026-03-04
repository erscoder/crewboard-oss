import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const prisma = new PrismaClient()

// ESM compatibility
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Paths - adjust if Clawdbot is installed elsewhere
const OPENCLAW_WORKSPACE = process.env.OPENCLAW_WORKSPACE || '/Users/kike/clawd'
const PROJECTS_DIR = path.join(OPENCLAW_WORKSPACE, 'projects')
const SKILLS_DIR = path.join(OPENCLAW_WORKSPACE, 'skills')
const LOCAL_SKILLS_DIR = path.join(__dirname, '..', 'skills')

/**
 * Agent definitions for Mission Control
 */
// Agents come from OpenClaw Gateway — only seed a default human user
const agents = [
  { name: 'User', isBot: false, agentSkill: null },
]

/**
 * Project colors by name (add more as needed)
 */
const projectColors: Record<string, string> = {
  'hypersignals-backend': '#10b981',
  'hypersignals-frontend': '#10b981',
  'hypersignals-landing': '#10b981',
  'hypersignals-backend-express': '#10b981',
  'mission-control': '#f59e0b',
  'kike-portfolio': '#6366f1',
}

function getProjectColor(name: string): string {
  return projectColors[name] || '#6366f1'
}

function formatProjectName(dirName: string): string {
  // Convert kebab-case to Title Case
  return dirName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

async function syncProjects() {
  console.log('📁 Syncing projects from filesystem...')
  
  if (!fs.existsSync(PROJECTS_DIR)) {
    console.log(`   ⚠ Projects directory not found: ${PROJECTS_DIR}`)
    return
  }

  const dirs = fs.readdirSync(PROJECTS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory() && !d.name.startsWith('.'))
    .map(d => d.name)

  for (const dir of dirs) {
    const existing = await prisma.project.findFirst({ 
      where: { name: { equals: formatProjectName(dir), mode: 'insensitive' } } 
    })
    
    if (!existing) {
      await prisma.project.create({
        data: {
          name: formatProjectName(dir),
          color: getProjectColor(dir),
        },
      })
      console.log(`   ✓ Created project: ${formatProjectName(dir)}`)
    } else {
      console.log(`   · Project exists: ${formatProjectName(dir)}`)
    }
  }
}

async function syncAgents() {
  console.log('\n👥 Syncing agents...')
  
  for (const agent of agents) {
    const existing = await prisma.user.findFirst({ where: { name: agent.name } })
    if (!existing) {
      await prisma.user.create({
        data: {
          name: agent.name,
          isBot: agent.isBot,
        },
      })
      console.log(`   ✓ Created agent: ${agent.name} (${agent.agentSkill || 'human'})`)
    } else {
      if (existing.agentSkill !== agent.agentSkill) {
        await prisma.user.update({
          where: { id: existing.id },
          data: { agentSkill: agent.agentSkill },
        })
        console.log(`   ↻ Updated agent: ${agent.name} → ${agent.agentSkill}`)
      } else {
        console.log(`   · Agent exists: ${agent.name}`)
      }
    }
  }
}

function syncSkills() {
  console.log('\n🧠 Syncing skills to Clawdbot...')
  
  if (!fs.existsSync(LOCAL_SKILLS_DIR)) {
    console.log(`   ⚠ Local skills directory not found: ${LOCAL_SKILLS_DIR}`)
    return
  }

  if (!fs.existsSync(SKILLS_DIR)) {
    console.log(`   ⚠ Clawdbot skills directory not found: ${SKILLS_DIR}`)
    return
  }

  const skills = fs.readdirSync(LOCAL_SKILLS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory() && !d.name.startsWith('.'))
    .map(d => d.name)

  for (const skill of skills) {
    const src = path.join(LOCAL_SKILLS_DIR, skill)
    const dest = path.join(SKILLS_DIR, skill)

    // Copy skill directory
    if (!fs.existsSync(dest)) {
      fs.cpSync(src, dest, { recursive: true })
      console.log(`   ✓ Installed skill: ${skill}`)
    } else {
      // Update existing - copy files
      const files = fs.readdirSync(src)
      for (const file of files) {
        fs.copyFileSync(path.join(src, file), path.join(dest, file))
      }
      console.log(`   ↻ Updated skill: ${skill}`)
    }
  }
}

async function main() {
  console.log('🚀 Seeding Mission Control...\n')

  // Sync projects from filesystem
  await syncProjects()

  // Sync agents
  await syncAgents()

  // Sync skills to Clawdbot
  syncSkills()

  // Ensure Harvis bot status row
  await prisma.botStatus.upsert({
    where: { id: 'harvis' },
    update: {},
    create: { id: 'harvis', isWorking: false },
  })

  console.log('\n✅ Seed completed!')
  
  const userCount = await prisma.user.count()
  const projectCount = await prisma.project.count()
  console.log(`   Users: ${userCount} | Projects: ${projectCount}`)
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
