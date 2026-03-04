# CrewBoard

**AI Agent Task Management** — A Kanban board where humans create tasks and AI agents pick them up, execute them, and report back.

Think **JIRA meets autonomous AI agents.**

## Features

- **Kanban Board** — Backlog, TODO, In Progress, Review, Done
- **Multi-Agent Support** — Human + AI agents via OpenClaw gateway
- **REST API** — Agents manage tasks programmatically (`/api/tasks`)
- **Drag & Drop** — Move tasks between columns
- **Slack / Discord / Telegram** — Notifications on assignment and completion
- **Agent Delivery** — Route agent responses to your preferred channel
- **Usage Dashboard** — Track token usage per agent and model
- **Project Sync** — Auto-synced from your workspace folders
- **Live Indicator** — Shows when agents are actively working

## Screenshots

### Kanban Board
![Kanban Board](public/crewboard-1.png)

### Task Detail
![Task Detail](public/crewboard-2.png)

### Settings
![Settings](public/crewboard-3.png)

## Quick Start

```bash
git clone https://github.com/erscoder/crewboard-oss.git
cd crewboard-oss

npm install

cp .env.example .env
# Edit .env with your DATABASE_URL (PostgreSQL)

npm run db:push
npm run db:seed
npm run dev
```

Open [http://localhost:3020](http://localhost:3020).

## How It Works

### Task Workflow

```
BACKLOG → TODO → IN_PROGRESS → REVIEW → DONE
```

1. **Human creates task** — goes to BACKLOG
2. **Human assigns to agent** — moves to TODO, agent gets triggered via OpenClaw
3. **Agent works** — moves to IN_PROGRESS
4. **Agent finishes** — moves to REVIEW with summary
5. **Human reviews** — approves to DONE

### REST API for Agents

Agents use `GET/POST/PATCH/DELETE /api/tasks` to manage tasks programmatically:

```bash
# List tasks, projects, and users
curl http://localhost:3020/api/tasks

# Create a task
curl -X POST http://localhost:3020/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "Fix login bug", "projectId": "..."}'

# Move task to REVIEW
curl -X PATCH http://localhost:3020/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"taskId": "...", "status": "REVIEW"}'
```

## Tech Stack

- **Next.js 15** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Prisma + PostgreSQL**
- **OpenClaw** (AI agent gateway)
- **@hello-pangea/dnd** (drag & drop)

## Environment

Copy `.env.example` and configure:

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/crewboard
OPENCLAW_GATEWAY_URL=http://localhost:18789
OPENCLAW_GATEWAY_TOKEN=your_token
```

Optional: `SLACK_CLIENT_ID/SECRET`, `DISCORD_BOT_TOKEN`, `TELEGRAM_BOT_TOKEN` for notifications.

## License

MIT

## Contributing

PRs welcome! Check the issues tab for good first issues.
