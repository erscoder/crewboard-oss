'use client'

import { useEffect, useState, useTransition } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Bell, BellOff, MessageSquare, Reply, Send, Trash2 } from 'lucide-react'
import { createComment, deleteComment, getComments } from '@/app/comments/actions'
import UserAvatar from './UserAvatar'

type User = {
  id: string
  name: string
  avatar: string | null
  isBot: boolean
}

type Comment = {
  id: string
  content: string
  author: User
  createdAt: string
  replies: Comment[]
}

interface TaskCommentsProps {
  taskId: string
  users: User[]
  currentUserId: string // The user writing comments (e.g., "Kike")
}

export default function TaskComments({ taskId, users, currentUserId }: TaskCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Check notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationsEnabled(Notification.permission === 'granted')
    }
  }, [])

  // Load comments
  useEffect(() => {
    loadComments()
  }, [taskId])

  const loadComments = async () => {
    const data = await getComments(taskId)
    setComments(data as any)
  }

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support notifications')
      return
    }

    const permission = await Notification.requestPermission()
    setNotificationsEnabled(permission === 'granted')
  }

  const sendNotification = (title: string, body: string) => {
    if (notificationsEnabled && 'Notification' in window) {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: 'mission-control-comment'
      })
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return

    startTransition(async () => {
      const comment = await createComment({
        taskId,
        authorId: currentUserId,
        content: newComment,
      })
      
      setNewComment('')
      await loadComments()
    })
  }

  const handleReply = (parentId: string) => {
    if (!replyContent.trim()) return

    startTransition(async () => {
      const comment = await createComment({
        taskId,
        authorId: currentUserId,
        content: replyContent,
        parentId,
      })

      // Check if replying to someone else - send notification
      const parentComment = comments.find(c => c.id === parentId)
      if (parentComment && parentComment.author.id !== currentUserId) {
        sendNotification(
          `Reply from ${users.find(u => u.id === currentUserId)?.name || 'Someone'}`,
          replyContent.slice(0, 100)
        )
      }

      setReplyingTo(null)
      setReplyContent('')
      await loadComments()
    })
  }

  const handleDelete = (commentId: string) => {
    if (!confirm('Delete this comment?')) return

    startTransition(async () => {
      await deleteComment(commentId)
      await loadComments()
    })
  }

  return (
    <div className="space-y-4">
      {/* Header with notification toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Comments ({comments.length})
          </span>
        </div>
        <button
          onClick={requestNotificationPermission}
          className={`p-2 rounded-lg transition-colors ${
            notificationsEnabled 
              ? 'bg-primary/10 text-primary' 
              : 'hover:bg-card-hover text-muted-foreground'
          }`}
          title={notificationsEnabled ? 'Notifications enabled' : 'Enable notifications'}
        >
          {notificationsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
        </button>
      </div>

      {/* New comment form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <select
          value={currentUserId}
          disabled
          className="px-3 py-2 rounded-xl bg-background border border-border text-sm w-32"
        >
          {users.map(user => (
            <option key={user.id} value={user.id}>
              {user.isBot ? '🤖 ' : ''}{user.name}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Write a comment..."
          className="flex-1 px-3 py-2 rounded-xl bg-background border border-border focus:border-primary focus:outline-none text-sm"
        />
        <button
          type="submit"
          disabled={!newComment.trim() || isPending}
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      {/* Comments list */}
      <div className="space-y-4">
        {comments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            currentUserId={currentUserId}
            replyingTo={replyingTo}
            replyContent={replyContent}
            onReplyClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
            onReplyChange={setReplyContent}
            onReplySubmit={() => handleReply(comment.id)}
            onDelete={() => handleDelete(comment.id)}
            isPending={isPending}
          />
        ))}

        {comments.length === 0 && (
          <div className="text-center py-6 text-muted-foreground text-sm">
            No comments yet. Start the conversation!
          </div>
        )}
      </div>
    </div>
  )
}

function CommentItem({
  comment,
  currentUserId,
  replyingTo,
  replyContent,
  onReplyClick,
  onReplyChange,
  onReplySubmit,
  onDelete,
  isPending,
}: {
  comment: Comment
  currentUserId: string
  replyingTo: string | null
  replyContent: string
  onReplyClick: () => void
  onReplyChange: (value: string) => void
  onReplySubmit: () => void
  onDelete: () => void
  isPending: boolean
}) {
  const isReplying = replyingTo === comment.id

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <UserAvatar user={comment.author} size={32} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{comment.author.name}</span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
            </span>
          </div>
          <p className="text-sm mt-1 text-foreground/90">{comment.content}</p>
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={onReplyClick}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <Reply className="w-3 h-3" />
              Reply
            </button>
            {comment.author.id === currentUserId && (
              <button
                onClick={onDelete}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                Delete
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Reply form */}
      {isReplying && (
        <div className="ml-10 flex gap-2">
          <input
            type="text"
            value={replyContent}
            onChange={(e) => onReplyChange(e.target.value)}
            placeholder="Write a reply..."
            className="flex-1 px-3 py-2 rounded-xl bg-background border border-border focus:border-primary focus:outline-none text-sm"
            autoFocus
          />
          <button
            onClick={onReplySubmit}
            disabled={!replyContent.trim() || isPending}
            className="px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            Reply
          </button>
        </div>
      )}

      {/* Replies */}
      {comment.replies?.length > 0 && (
        <div className="ml-10 space-y-3 border-l-2 border-border pl-4">
          {comment.replies.map((reply) => (
            <div key={reply.id} className="flex gap-3">
              <UserAvatar user={reply.author} size={24} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{reply.author.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm mt-1 text-foreground/90">{reply.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
