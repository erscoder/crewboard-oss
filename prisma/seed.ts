import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const prisma = new PrismaClient()

// ESM compatibility
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Auto-detect Clawdbot root (mission-control is in projects/)
const MISSION_CONTROL_ROOT = path.resolve(__dirname, '..')
const CLAWDBOT_ROOT = process.env.CLAWDBOT_ROOT || path.resolve(MISSION_CONTROL_ROOT, '..', '..')
const PROJECTS_DIR = path.join(CLAWDBOT_ROOT, 'projects')
const SKILLS_DIR = path.join(CLAWDBOT_ROOT, 'skills')
const LOCAL_SKILLS_DIR = path.join(MISSION_CONTROL_ROOT, 'skills')

/**
 * Agent definitions for Mission Control
 */
const agents = [
  { name: 'Kike', isBot: false, agentSkill: null },
  { name: 'Harvis', isBot: true, agentSkill: 'coordinator' },
  { name: 'Codex', isBot: true, agentSkill: 'dev-engineer' },
  { name: 'Peter Designer', isBot: true, agentSkill: 'ui-designer' },
  { name: 'Marta Marketing', isBot: true, agentSkill: 'marketing-specialist' },
  { name: 'Alex PM', isBot: true, agentSkill: 'product-manager' },
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
  return dirName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

async function syncProjects() {
  console.log('📁 Syncing projects from filesystem...')
  console.log(`   Source: ${PROJECTS_DIR}`)
  
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
          agentSkill: agent.agentSkill,
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
  console.log(`   From: ${LOCAL_SKILLS_DIR}`)
  console.log(`   To:   ${SKILLS_DIR}`)
  
  if (!fs.existsSync(LOCAL_SKILLS_DIR)) {
    console.log(`   ⚠ Local skills directory not found: ${LOCAL_SKILLS_DIR}`)
    return
  }

  if (!fs.existsSync(SKILLS_DIR)) {
    console.log(`   ⚠ Clawdbot skills directory not found: ${SKILLS_DIR}`)
    console.log(`   Creating it...`)
    fs.mkdirSync(SKILLS_DIR, { recursive: true })
  }

  const skills = fs.readdirSync(LOCAL_SKILLS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory() && !d.name.startsWith('.'))
    .map(d => d.name)

  for (const skill of skills) {
    const src = path.join(LOCAL_SKILLS_DIR, skill)
    const dest = path.join(SKILLS_DIR, skill)

    // Remove if it's a symlink (we want real files)
    if (fs.existsSync(dest) && fs.lstatSync(dest).isSymbolicLink()) {
      fs.unlinkSync(dest)
    }

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
  console.log(`Clawdbot root: ${CLAWDBOT_ROOT}\n`)

  await syncProjects()
  await syncAgents()
  syncSkills()

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
