'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function createComment(data: {
  taskId: string
  authorId: string
  content: string
  parentId?: string
}) {
  const comment = await prisma.comment.create({
    data: {
      content: data.content.trim(),
      taskId: data.taskId,
      authorId: data.authorId,
      parentId: data.parentId || null,
    },
    include: {
      author: true,
      parent: {
        include: { author: true }
      }
    }
  })

  revalidatePath('/')
  return comment
}

export async function getComments(taskId: string) {
  const comments = await prisma.comment.findMany({
    where: { 
      taskId,
      parentId: null // Only top-level comments
    },
    include: {
      author: true,
      replies: {
        include: { author: true },
        orderBy: { createdAt: 'asc' }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  return comments
}

export async function deleteComment(commentId: string) {
  await prisma.comment.delete({
    where: { id: commentId }
  })

  revalidatePath('/')
}
