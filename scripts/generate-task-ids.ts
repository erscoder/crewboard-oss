/**
 * Generate shortIds for existing tasks and prefixes for projects
 * Run with: npx tsx scripts/generate-task-ids.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function generatePrefix(name: string): string {
  // Take first 3 letters, uppercase, remove spaces/special chars
  const clean = name.replace(/[^a-zA-Z]/g, '').toUpperCase()
  return clean.slice(0, 3) || 'TSK'
}

async function main() {
  console.log('🔢 Generating task IDs...\n')

  // Get all projects
  const projects = await prisma.project.findMany({
    include: {
      tasks: {
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  // Track used prefixes to avoid duplicates
  const usedPrefixes = new Set<string>()

  for (const project of projects) {
    // Generate unique prefix
    let prefix = generatePrefix(project.name)
    let suffix = 1
    while (usedPrefixes.has(prefix)) {
      prefix = generatePrefix(project.name).slice(0, 2) + suffix
      suffix++
    }
    usedPrefixes.add(prefix)

    console.log(`📁 ${project.name} → ${prefix}`)

    // Update project with prefix
    await prisma.project.update({
      where: { id: project.id },
      data: { prefix },
    })

    // Generate shortIds for existing tasks
    let counter = 0
    for (const task of project.tasks) {
      counter++
      const shortId = `${prefix}-${counter}`

      await prisma.task.update({
        where: { id: task.id },
        data: { shortId },
      })

      console.log(`   ${shortId}: ${task.title.slice(0, 40)}...`)
    }

    // Update project counter
    await prisma.project.update({
      where: { id: project.id },
      data: { taskCounter: counter },
    })

    console.log(`   ✅ ${counter} tasks\n`)
  }

  console.log('Done!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
