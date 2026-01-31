'use client'

import Avatar from 'boring-avatars'
import { Bot } from 'lucide-react'

export type UserAvatarProps = {
  user: {
    name: string
    avatar?: string | null
    image?: string | null
    isBot?: boolean
  }
  size?: number
  className?: string
  showBadge?: boolean
}

// Shared palette so avatars look identical across the app
export const AVATAR_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6']

export default function UserAvatar({ user, size = 44, className = '', showBadge = true }: UserAvatarProps) {
  const badgeSize = Math.max(12, Math.round(size * 0.45))
  const iconSize = Math.max(10, Math.round(badgeSize * 0.55))
  const avatarSrc = user.avatar || user.image

  return (
    <div
      className={`relative inline-block ${className}`}
      style={{ width: size, height: size }}
      title={user.name}
    >
      {avatarSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarSrc}
          alt={user.name}
          className="w-full h-full rounded-full object-cover border border-border bg-card"
        />
      ) : (
        <Avatar
          size={size}
          name={user.name || 'Unknown user'}
          variant="beam"
          colors={AVATAR_COLORS}
        />
      )}

      {showBadge && user.isBot && (
        <span
          className="absolute rounded-full bg-emerald-500 text-white shadow-md flex items-center justify-center"
          style={{
            width: badgeSize,
            height: badgeSize,
            top: -badgeSize * 0.25,
            right: -badgeSize * 0.25,
          }}
        >
          <Bot style={{ width: iconSize, height: iconSize }} />
        </span>
      )}
    </div>
  )
}
