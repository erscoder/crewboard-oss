import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & {
      id: string
      image?: string | null
      planId?: string
      subscription?: {
        planId: string
        status: string
        renewsAt?: string | null
        endsAt?: string | null
        customerPortalUrl?: string | null
      } | null
    }
  }

  interface User {
    avatar?: string | null
    image?: string | null
  }
}
