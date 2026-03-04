'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { createOpenClawClient } from '@/lib/openclaw-client'

/**
 * Sync bot users in the DB with OpenClaw agents.
 * - Deletes bot users that no longer exist in OpenClaw (unassigns their tasks first)
 * - Creates bot users for new OpenClaw agents
 * Called on agents page load.
 */
export async function syncAgentsToDB(agents: { id: string; name: string }[]) {
  await syncAgentsToDBCore(agents)
  revalidatePath('/agents')
  revalidatePath('/')
}

/**
 * Core sync logic without revalidation. Safe to call during render.
 * Fetches agents from OpenClaw, deletes stale bot users, creates missing ones.
 */
export async function syncAgentsFromOpenClaw(): Promise<void> {
  try {
    const client = createOpenClawClient()
    const agents = await client.getAgents()
    if (!agents.length) return
    await syncAgentsToDBCore(agents)
  } catch (err) {
    console.error('[sync-agents] Failed to sync agents from OpenClaw:', err)
  }
}

async function syncAgentsToDBCore(agents: { id: string; name: string }[]) {
  const openClawNames = new Set(agents.map(a => a.name.toLowerCase()))

  // Delete bot users not in OpenClaw
  const existingBots = await prisma.user.findMany({ where: { isBot: true } })
  for (const bot of existingBots) {
    if (!openClawNames.has(bot.name.toLowerCase())) {
      await prisma.task.updateMany({ where: { assigneeId: bot.id }, data: { assigneeId: null } })
      await prisma.user.delete({ where: { id: bot.id } })
      console.log(`[sync-agents] Removed stale bot user: ${bot.name}`)
    }
  }

  // Create missing bot users
  for (const agent of agents) {
    const existing = await prisma.user.findFirst({
      where: { name: { equals: agent.name, mode: 'insensitive' }, isBot: true },
    })
    if (!existing) {
      await prisma.user.create({ data: { name: agent.name, isBot: true } })
      console.log(`[sync-agents] Created bot user: ${agent.name}`)
    }
  }
}

/**
 * Create a new agent in OpenClaw config and upsert a bot User in the DB.
 */
export async function createAgent(data: {
  id: string
  name: string
  primaryModel: string
  soul?: string
}): Promise<{ ok: boolean; error?: string }> {
  const client = createOpenClawClient()
  const result = await client.addAgentToConfig(data.id, data.name, data.primaryModel)
  if (!result.ok) return result

  if (data.soul?.trim()) {
    // Write SOUL.md — non-fatal if it fails (agent is created regardless)
    await client.setAgentFile(data.id, 'SOUL.md', data.soul.trim())
  }

  const existing = await prisma.user.findFirst({ where: { name: data.name, isBot: true } })
  if (!existing) {
    await prisma.user.create({ data: { name: data.name, isBot: true } })
  }

  revalidatePath('/agents')
  revalidatePath('/')
  return { ok: true }
}

/**
 * Remove an agent from OpenClaw config and delete the bot User from the DB.
 */
export async function deleteAgent(agentId: string, agentName: string): Promise<{ ok: boolean; error?: string }> {
  const client = createOpenClawClient()
  const result = await client.removeAgentFromConfig(agentId)
  if (!result.ok) return result

  const user = await prisma.user.findFirst({ where: { name: agentName, isBot: true } })
  if (user) {
    await prisma.task.updateMany({ where: { assigneeId: user.id }, data: { assigneeId: null } })
    await prisma.user.delete({ where: { id: user.id } })
  }

  revalidatePath('/agents')
  revalidatePath('/')
  return { ok: true }
}
