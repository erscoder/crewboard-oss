import 'server-only'

import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { ApiKeyStatus, ApiProvider } from '@prisma/client'

import { prisma } from './prisma'
import { decryptString, encryptString } from './crypto'

export type ApiKeySummary = {
  provider: ApiProvider
  status: ApiKeyStatus
  last4: string | null
  lastCheckedAt: Date | null
  errorMessage: string | null
}

export type ResolvedApiKey =
  | { apiKey: string; source: 'user' | 'platform'; provider: ApiProvider }
  | { apiKey: null; source: 'missing'; provider: ApiProvider }

export const providerLabels: Record<ApiProvider, string> = {
  OPENAI: 'OpenAI',
  ANTHROPIC: 'Claude (Anthropic)',
}

export function normalizeProvider(provider: string | ApiProvider): ApiProvider | null {
  const value = provider.toString().toUpperCase()
  if (value === 'OPENAI') return 'OPENAI'
  if (value === 'ANTHROPIC' || value === 'CLAUDE') return 'ANTHROPIC'
  return null
}

async function validateOpenAIKey(apiKey: string): Promise<{ status: ApiKeyStatus; errorMessage?: string }> {
  try {
    const client = new OpenAI({ apiKey })
    await client.models.list()
    return { status: ApiKeyStatus.VALID }
  } catch (error: any) {
    const message = error?.message || 'Unable to validate OpenAI key'
    return { status: ApiKeyStatus.INVALID, errorMessage: message }
  }
}

async function validateAnthropicKey(apiKey: string): Promise<{ status: ApiKeyStatus; errorMessage?: string }> {
  try {
    const client = new Anthropic({ apiKey })
    await client.models.list()
    return { status: ApiKeyStatus.VALID }
  } catch (error: any) {
    const message = error?.message || 'Unable to validate Anthropic key'
    return { status: ApiKeyStatus.INVALID, errorMessage: message }
  }
}

export async function validateApiKey(provider: ApiProvider, apiKey: string) {
  if (provider === 'OPENAI') return validateOpenAIKey(apiKey)
  return validateAnthropicKey(apiKey)
}

export async function upsertApiKey(userId: string, provider: ApiProvider, apiKey: string): Promise<ApiKeySummary> {
  const trimmed = apiKey.trim()
  const last4 = trimmed.slice(-4)
  const encryptedKey = encryptString(trimmed)
  const validation = await validateApiKey(provider, trimmed)

  const record = await prisma.apiKey.upsert({
    where: { userId_provider: { userId, provider } },
    create: {
      userId,
      provider,
      encryptedKey,
      last4,
      status: validation.status,
      lastCheckedAt: new Date(),
      errorMessage: validation.errorMessage,
    },
    update: {
      encryptedKey,
      last4,
      status: validation.status,
      lastCheckedAt: new Date(),
      errorMessage: validation.errorMessage,
    },
  })

  return {
    provider: record.provider,
    status: record.status,
    last4: record.last4,
    lastCheckedAt: record.lastCheckedAt,
    errorMessage: record.errorMessage,
  }
}

export async function deleteApiKey(userId: string, provider: ApiProvider): Promise<void> {
  await prisma.apiKey.delete({
    where: { userId_provider: { userId, provider } },
  })
}

export async function listApiKeysForUser(userId: string): Promise<ApiKeySummary[]> {
  const rows = await prisma.apiKey.findMany({
    where: { userId },
    orderBy: { provider: 'asc' },
  })

  return rows.map((row) => ({
    provider: row.provider,
    status: row.status,
    last4: row.last4,
    lastCheckedAt: row.lastCheckedAt,
    errorMessage: row.errorMessage,
  }))
}

export async function getValidApiKeyValue(userId: string, provider: ApiProvider): Promise<string | null> {
  const record = await prisma.apiKey.findUnique({
    where: { userId_provider: { userId, provider } },
  })

  if (!record || record.status !== ApiKeyStatus.VALID) return null

  try {
    return decryptString(record.encryptedKey)
  } catch (error) {
    console.error('[api-keys] Failed to decrypt API key', { provider, userId, error })
    return null
  }
}

export async function resolveApiKey(provider: ApiProvider, userId?: string): Promise<ResolvedApiKey> {
  if (userId) {
    const userKey = await getValidApiKeyValue(userId, provider)
    if (userKey) {
      return { apiKey: userKey, source: 'user', provider }
    }
  }

  const fallbackEnv = provider === 'OPENAI' ? process.env.OPENAI_API_KEY : process.env.ANTHROPIC_API_KEY
  if (fallbackEnv) {
    return { apiKey: fallbackEnv, source: 'platform', provider }
  }

  return { apiKey: null, source: 'missing', provider }
}
