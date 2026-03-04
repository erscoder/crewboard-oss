const TELEGRAM_API = 'https://api.telegram.org'

export async function sendTelegramMessage(chatId: string, text: string): Promise<{ ok: boolean; error?: string }> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  if (!botToken) return { ok: false, error: 'TELEGRAM_BOT_TOKEN not configured' }

  try {
    const res = await fetch(`${TELEGRAM_API}/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return { ok: false, error: err.description ?? `Telegram API error ${res.status}` }
    }

    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err.message }
  }
}
