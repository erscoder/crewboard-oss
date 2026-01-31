'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { sendCommentToSlack } from '@/lib/slack'

export async function createComment(data: {
  taskId: string
  authorId: string
  content: string
  parentId?: string
  fromSlack?: boolean // Skip sending back to Slack if comment came from Slack
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

  // Send to Slack if not already from Slack
  if (!data.fromSlack && comment.author) {
    sendCommentToSlack(data.taskId, data.content, comment.author.name).catch(err => {
      console.error('Failed to send comment to Slack:', err)
    })
  }

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
