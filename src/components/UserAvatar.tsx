'use client'

import Avatar from 'react-avatar'
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
      <Avatar
        name={user.name || 'Unknown'}
        src={avatarSrc || undefined}
        size={String(size)}
        round={true}
        textSizeRatio={2.5}
      />

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
