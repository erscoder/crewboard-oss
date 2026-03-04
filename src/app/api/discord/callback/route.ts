import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3020'
const DISCORD_API = 'https://discord.com/api/v10'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const guildId = searchParams.get('guild_id')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error || !guildId) {
    return NextResponse.redirect(`${BASE_URL}/settings?discord=error`)
  }

  const cookieStore = await cookies()
  const savedState = cookieStore.get('discord_oauth_state')?.value
  cookieStore.delete('discord_oauth_state')

  if (!state || state !== savedState) {
    return NextResponse.redirect(`${BASE_URL}/settings?discord=error`)
  }

  const botToken = process.env.DISCORD_BOT_TOKEN
  if (!botToken) {
    return NextResponse.redirect(`${BASE_URL}/settings?discord=error&reason=no_bot_token`)
  }

  // Fetch guild info using bot token
  const guildRes = await fetch(`${DISCORD_API}/guilds/${guildId}`, {
    headers: { Authorization: `Bot ${botToken}` },
  })

  if (!guildRes.ok) {
    return NextResponse.redirect(`${BASE_URL}/settings?discord=error&reason=guild_fetch_failed`)
  }

  const guild = await guildRes.json()

  // Fetch text channels
  const channelsRes = await fetch(`${DISCORD_API}/guilds/${guildId}/channels`, {
    headers: { Authorization: `Bot ${botToken}` },
  })

  const allChannels = channelsRes.ok ? await channelsRes.json() : []
  const textChannels = allChannels.filter((c: any) => c.type === 0) // GUILD_TEXT only

  // Upsert guild and sync channels
  const dbGuild = await prisma.discordGuild.upsert({
    where: { guildId },
    create: { guildId, guildName: guild.name },
    update: { guildName: guild.name },
  })

  await prisma.discordChannel.deleteMany({ where: { guildId: dbGuild.id } })

  if (textChannels.length > 0) {
    await prisma.discordChannel.createMany({
      data: textChannels.map((c: any) => ({
        channelId: c.id,
        name: c.name,
        guildId: dbGuild.id,
      })),
    })
  }

  return NextResponse.redirect(`${BASE_URL}/oauth/success`)
}
