import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Agent definitions for Mission Control
 */
const agents = [
  {
    name: 'Kike',
    isBot: false,
    agentSkill: null,
  },
  {
    name: 'Harvis',
    isBot: true,
    agentSkill: 'coordinator',
  },
  {
    name: 'Codex',
    isBot: true,
    agentSkill: 'dev-engineer',
  },
  {
    name: 'Peter Designer',
    isBot: true,
    agentSkill: 'ui-designer',
  },
  {
    name: 'Marta Marketing',
    isBot: true,
    agentSkill: 'marketing-specialist',
  },
  {
    name: 'Alex PM',
    isBot: true,
    agentSkill: 'product-manager',
  },
]

/**
 * Default projects
 */
const defaultProjects = [
  { name: 'General', color: '#6366f1' },
  { name: 'HyperSignals', color: '#10b981' },
  { name: 'Mission Control', color: '#f59e0b' },
]

async function main() {
  console.log('🚀 Seeding Mission Control...\n')

  // Create default projects
  console.log('📁 Creating projects...')
  for (const proj of defaultProjects) {
    const existing = await prisma.project.findFirst({ where: { name: proj.name } })
    if (!existing) {
      await prisma.project.create({ data: proj })
      console.log(`   ✓ Created project: ${proj.name}`)
    } else {
      console.log(`   · Project exists: ${proj.name}`)
    }
  }

  // Create agents
  console.log('\n👥 Creating agents...')
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
      // Update agentSkill if changed
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

  // Ensure Harvis bot status row
  await prisma.botStatus.upsert({
    where: { id: 'harvis' },
    update: {},
    create: { id: 'harvis', isWorking: false },
  })

  console.log('\n✅ Seed completed!')
  
  // Summary
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
