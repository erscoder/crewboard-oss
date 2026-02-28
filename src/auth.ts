import NextAuth, { type NextAuthOptions, getServerSession } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import GitHubProvider from 'next-auth/providers/github'
import { PrismaAdapter } from '@auth/prisma-adapter'
import type { Adapter } from 'next-auth/adapters'

import { prisma } from '@/lib/prisma'
import { getSubscriptionForUser, resolvePlanId, serializeSubscriptionForSession } from '@/lib/subscriptions'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  session: { strategy: 'database' },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'read:user repo',
        },
      },
    }),
    // Slack integration is in user settings, not for login
  ],
  // Use default NextAuth sign-in page
  callbacks: {
    async session({ session, user }) {
      const adapterUser = user as typeof user & { avatar?: string | null; image?: string | null }

      const subscription = await getSubscriptionForUser(user.id)
      const planId = resolvePlanId(subscription)

      if (session.user) {
        session.user.id = user.id
        session.user.name = session.user.name ?? user.name
        session.user.email = session.user.email ?? user.email
        session.user.image = session.user.image ?? adapterUser.image ?? adapterUser.avatar ?? null
        session.user.planId = planId
        session.user.subscription = serializeSubscriptionForSession(subscription)
      }

      return session
    },
  },
}

export const getAuthSession = () => getServerSession(authOptions)

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
