'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

type PersonPayload = {
  name: string
  avatar?: string
  isBot?: boolean
  agentSkill?: string
}

function revalidatePeople() {
  revalidatePath('/people')
  revalidatePath('/')
}

async function getActorUserId() {
  const session = { user: { id: 'oss-user', name: 'User' } }
  if (session?.user?.id) return 'oss-user'

  const fallback = await prisma.user.findFirst({
    where: { isBot: false },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  })

  return fallback?.id ?? null
}

export async function createPerson(data: PersonPayload) {

  const person = await prisma.user.create({
    data: {
      name: data.name.trim(),
      avatar: data.avatar?.trim() || null,
      isBot: Boolean(data.isBot),
      agentSkill: data.isBot ? (data.agentSkill?.trim() || null) : null,
    },
  })

  revalidatePeople()
  return person
}

export async function updatePerson(id: string, data: PersonPayload) {
  const person = await prisma.user.update({
    where: { id },
    data: {
      name: data.name.trim(),
      avatar: data.avatar?.trim() || null,
      isBot: Boolean(data.isBot),
      agentSkill: data.isBot ? (data.agentSkill?.trim() || null) : null,
    },
  })

  revalidatePeople()
  return person
}

export async function deletePerson(id: string) {
  // Detach any assigned tasks to avoid FK errors
  await prisma.task.updateMany({
    where: { assigneeId: id },
    data: { assigneeId: null },
  })

  await prisma.user.delete({ where: { id } })

  revalidatePeople()
}
