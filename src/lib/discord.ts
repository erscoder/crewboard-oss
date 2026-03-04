const DISCORD_API = 'https://discord.com/api/v10'

export async function sendDiscordMessage(channelId: string, content: string): Promise<{ ok: boolean; error?: string }> {
  const botToken = process.env.DISCORD_BOT_TOKEN
  if (!botToken) return { ok: false, error: 'DISCORD_BOT_TOKEN not configured' }

  try {
    const res = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return { ok: false, error: err.message ?? `Discord API error ${res.status}` }
    }

    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err.message }
  }
}
