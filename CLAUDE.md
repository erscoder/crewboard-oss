# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Dev server on port 3020
npm run build        # Production build
npm run lint         # Next.js linter
npm test             # Jest tests
npm run test:coverage  # Jest with coverage (90% threshold on openclaw-client)
npm run db:push      # Sync Prisma schema → database (no migration files)
npm run db:seed      # Seed database
npm run db:studio    # Open Prisma Studio
```

Tests live in `**/__tests__/**/*.test.ts`. Run a single test file:
```bash
npx jest src/lib/__tests__/openclaw-client.test.ts
```

## Environment

Copy `.env.example` and fill in:
- `DATABASE_URL` — PostgreSQL connection string
- `OPENCLAW_CONFIG_PATH` — path to `~/.openclaw/openclaw.json` (defaults to `$HOME/.openclaw/openclaw.json`)
- `OPENCLAW_ROOT` / `OPENCLAW_WORKSPACE` — openclaw directories
- `OPENCLAW_GATEWAY_URL` / `OPENCLAW_GATEWAY_TOKEN` — local gateway (port 18789)

Provider API keys (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_AI_API_KEY`) are optional — the app also reads them from the openclaw.json config and from the encrypted `ApiKey` table.

## Architecture

**Stack:** Next.js 15 App Router · TypeScript · PostgreSQL + Prisma · Tailwind · @hello-pangea/dnd

### OSS vs. cloud version

Authentication is intentionally disabled in this OSS version. All pages hardcode `session = { user: { id: 'oss-user', name: 'User' } }`. Do not add real auth logic — the cloud version handles it separately.

### Data flow for task execution

1. A task is assigned to a bot user (`User.isBot = true`) and moved to `TODO`.
2. `triggerAgentIfNeeded()` in `src/app/actions.ts` detects this and fires `runAgent()` **without `await`** (fire-and-forget).
3. `src/lib/agents.ts` → `callLLM()` runs a tool-calling loop (max 10 iterations) against Anthropic or OpenAI.
4. Tools are defined in `src/lib/agent-tools.ts`: `exec`, `read_file`, `write_file`, `web_search`, `web_fetch`.
5. On completion, the task moves to `REVIEW` and the agent posts a comment. `revalidatePath('/')` refreshes the board.

### OpenClaw integration

`src/lib/openclaw-client.ts` reads `openclaw.json` from disk server-side — there is no HTTP call. The gateway WebSocket RPC is a TODO. Use `createOpenClawClient()` and call `.getAgents()` or `.getConfig()`.

The `/agents` page and `/usage` page both read directly from the config file. Agent names in the config (`harvis`, `codex`, etc.) are matched case-insensitively against `AgentProfile.name` in the DB when needed.

### Key models

| Model | Purpose |
|---|---|
| `Task` | Kanban card — `shortId` format `PRJ-42`, auto-incremented per project |
| `AgentProfile` | LLM agent config (model, systemPrompt, skills, tools) |
| `AgentRun` | Execution log with token counts (`inputTokens`, `outputTokens`, `cost`) |
| `BotStatus` | Single row `id="harvis"` — live working indicator polled by the board |
| `Project` | Container for tasks; holds `taskCounter` for shortId generation |
| `SlackWorkspace` / `SlackChannel` | Slack OAuth tokens and channel links |
| `GitHubRepo` | 1:1 link from Project to a GitHub repository |
| `ApiKey` | Encrypted provider API keys; only `last4` stored in plaintext |

Task status flow: `BACKLOG → TODO → IN_PROGRESS → REVIEW → DONE`

### `revalidatePath` rule

Never call `revalidatePath` inside a function that is invoked during a page render (Server Component body or cached function). Only call it inside Server Actions triggered by user interactions.

### Usage dashboard

The `/usage` page fetches session stats from the OpenClaw Gateway via WS RPC (`sessions.query`). The client component `UsageDashboard` calls `/api/usage/stats?range=today|7d|30d`. No provider admin keys needed.

## Crewboard skill

Read crewboard-oss/src/lib/crewboard-skill.ts to learn more about the Crewboard API.