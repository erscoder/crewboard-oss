import 'server-only'

import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { ApiKeyStatus, ApiProvider } from '@prisma/client'

import { prisma } from './prisma'
import { decryptString, encryptString } from './crypto'

export const SUPPORTED_API_PROVIDERS: ApiProvider[] = ['ANTHROPIC', 'OPENAI', 'GOOGLE']

export type ApiKeySummary = {
  provider: ApiProvider
  status: ApiKeyStatus
  last4: string | null
  lastCheckedAt: Date | null
  errorMessage: string | null
}

export type ApiKeySummaryDTO = Omit<ApiKeySummary, 'lastCheckedAt'> & {
  lastCheckedAt: string | null
}

export type ResolvedApiKey =
  | { apiKey: string; source: 'user' | 'platform'; provider: ApiProvider }
  | { apiKey: null; source: 'missing'; provider: ApiProvider }

export type ApiKeyOverview = {
  provider: ApiProvider
  label: string
  userKey: ApiKeySummaryDTO | null
  platformKey: { available: boolean; last4: string | null }
  inUse: ResolvedApiKey['source']
}

export const providerLabels: Record<ApiProvider, string> = {
  OPENAI: 'OpenAI',
  ANTHROPIC: 'Claude (Anthropic)',
  GOOGLE: 'Google (Gemini)',
}

export function normalizeProvider(provider: string | ApiProvider): ApiProvider | null {
  const value = provider.toString().toUpperCase()
  if (value === 'OPENAI') return 'OPENAI'
  if (value === 'ANTHROPIC' || value === 'CLAUDE') return 'ANTHROPIC'
  if (value === 'GOOGLE' || value === 'GEMINI') return 'GOOGLE'
  return null
}

export function getPlatformApiKey(provider: ApiProvider): string | null {
  const envVars: Record<ApiProvider, string> = {
    OPENAI: 'OPENAI_API_KEY',
    ANTHROPIC: 'ANTHROPIC_API_KEY',
    GOOGLE: 'GOOGLE_AI_API_KEY',
  }
  return process.env[envVars[provider]] || null
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

async function validateGoogleKey(apiKey: string): Promise<{ status: ApiKeyStatus; errorMessage?: string }> {
  try {
    // Google AI API validation - list models endpoint
    const res = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`)
    if (!res.ok) {
      const error = await res.text()
      return { status: ApiKeyStatus.INVALID, errorMessage: `API error: ${res.status}` }
    }
    return { status: ApiKeyStatus.VALID }
  } catch (error: any) {
    const message = error?.message || 'Unable to validate Google key'
    return { status: ApiKeyStatus.INVALID, errorMessage: message }
  }
}

export async function validateApiKey(provider: ApiProvider, apiKey: string) {
  if (provider === 'OPENAI') return validateOpenAIKey(apiKey)
  if (provider === 'GOOGLE') return validateGoogleKey(apiKey)
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
  await prisma.apiKey.deleteMany({
    where: { userId, provider },
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

  const fallbackEnv = getPlatformApiKey(provider)
  if (fallbackEnv) {
    return { apiKey: fallbackEnv, source: 'platform', provider }
  }

  return { apiKey: null, source: 'missing', provider }
}

function serializeSummary(summary: ApiKeySummary): ApiKeySummaryDTO {
  return {
    ...summary,
    lastCheckedAt: summary.lastCheckedAt ? summary.lastCheckedAt.toISOString() : null,
  }
}

export async function revalidateApiKey(userId: string, provider: ApiProvider): Promise<ApiKeySummary> {
  const record = await prisma.apiKey.findUnique({
    where: { userId_provider: { userId, provider } },
  })

  if (!record) {
    throw new Error('No API key found to validate')
  }

  const apiKey = decryptString(record.encryptedKey)
  const validation = await validateApiKey(provider, apiKey)

  const updated = await prisma.apiKey.update({
    where: { id: record.id },
    data: {
      status: validation.status,
      lastCheckedAt: new Date(),
      errorMessage: validation.errorMessage,
    },
  })

  return {
    provider: updated.provider,
    status: updated.status,
    last4: updated.last4,
    lastCheckedAt: updated.lastCheckedAt,
    errorMessage: updated.errorMessage,
  }
}

export async function getApiKeyOverview(userId: string): Promise<ApiKeyOverview[]> {
  const summaries = await listApiKeysForUser(userId)
  const summaryMap = new Map<ApiProvider, ApiKeySummary>()
  summaries.forEach((summary) => summaryMap.set(summary.provider, summary))

  const results: ApiKeyOverview[] = []

  for (const provider of SUPPORTED_API_PROVIDERS) {
    const platformKey = getPlatformApiKey(provider)
    const resolved = await resolveApiKey(provider, userId)
    const summary = summaryMap.get(provider)

    results.push({
      provider,
      label: providerLabels[provider],
      userKey: summary ? serializeSummary(summary) : null,
      platformKey: {
        available: Boolean(platformKey),
        last4: platformKey ? platformKey.slice(-4) : null,
      },
      inUse: resolved.source,
    })
  }

  return results
}
