import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const account = await prisma.account.findFirst({
    where: { provider: 'github' },
  })

  if (!account?.access_token) {
    return NextResponse.json([])
  }

  const res = await fetch('https://api.github.com/user/repos?sort=updated&per_page=100&affiliation=owner,collaborator', {
    headers: {
      Authorization: `Bearer ${account.access_token}`,
      Accept: 'application/vnd.github+json',
    },
    cache: 'no-store',
  })

  if (!res.ok) return NextResponse.json([])

  const repos = await res.json()
  return NextResponse.json(
    repos.map((r: any) => ({
      id: r.id,
      name: r.name,
      full_name: r.full_name,
      html_url: r.html_url,
      private: r.private,
      owner: { login: r.owner.login },
      description: r.description,
      stargazers_count: r.stargazers_count,
    }))
  )
}
