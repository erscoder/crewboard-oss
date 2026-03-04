import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const DISCORD_API = 'https://discord.com/api/v10'

export async function POST() {
  const botToken = process.env.DISCORD_BOT_TOKEN
  if (!botToken) {
    return NextResponse.json({ error: 'DISCORD_BOT_TOKEN not configured' }, { status: 500 })
  }

  try {
    // Fetch all guilds the bot is in
    const guildsRes = await fetch(`${DISCORD_API}/users/@me/guilds`, {
      headers: { Authorization: `Bot ${botToken}` },
    })

    if (!guildsRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch guilds from Discord' }, { status: 500 })
    }

    const guilds: any[] = await guildsRes.json()

    for (const guild of guilds) {
      const channelsRes = await fetch(`${DISCORD_API}/guilds/${guild.id}/channels`, {
        headers: { Authorization: `Bot ${botToken}` },
      })

      const allChannels = channelsRes.ok ? await channelsRes.json() : []
      const textChannels = allChannels.filter((c: any) => c.type === 0)

      const dbGuild = await prisma.discordGuild.upsert({
        where: { guildId: guild.id },
        create: { guildId: guild.id, guildName: guild.name },
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
    }

    return NextResponse.json({ ok: true, guilds: guilds.length })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
