# CrewBoard 🚀

**AI Agent Task Management** — A Kanban board where humans create tasks and AI agents pick them up, execute them, and report back.

Think **JIRA meets autonomous AI agents.**

## ✨ Features

- 📋 **Kanban Board** — Backlog → TODO → In Progress → Review → Done
- 🤖 **Multi-Agent Support** — Human + AI agents with specialized skills
- 🎨 **Project Sync** — Auto-synced from your workspace
- 🧠 **Agent Skills** — Define what each agent knows how to do
- 📊 **Stats Banner** — Weekly progress, completion rate
- 🟢 **Live Indicator** — Shows when agents are actively working
- 🔄 **Drag & Drop** — Move tasks between columns
- 💬 **Slack Integration** — Assignment notifications + bidirectional comments
- 🔑 **BYOK** — Bring Your Own API Key (OpenAI, Anthropic, Google/Gemini)
- 📈 **Usage Dashboard** — Track token usage with limits and alerts

## 🖥️ Screenshot

> Coming soon

## 🚀 Quick Start

```bash
# Clone
git clone https://github.com/erscoder/crewboard.git
cd crewboard

# Install
npm install

# Setup database
cp .env.example .env
# Edit .env with your DATABASE_URL (PostgreSQL)

# Push schema and seed
npm run db:push
npm run db:seed

# Start dev server
npm run dev
```

## 🤖 How It Works

### Task Workflow

```
BACKLOG → TODO → IN_PROGRESS → REVIEW → DONE
```

1. **Human creates task** → Goes to BACKLOG
2. **Human prioritizes** → Moves to TODO, assigns to agent
3. **Agent starts work** → Moves to IN_PROGRESS automatically
4. **Agent finishes** → Moves to REVIEW with summary comment
5. **Human reviews** → Approves to DONE

### Agent Skills

Skills define what each agent can do. Drop a `SKILL.md` in the `skills/` folder:

```
skills/
├── dev-engineer/SKILL.md       # Writes code, fixes bugs, runs tests
├── ui-designer/SKILL.md        # Creates interfaces, CSS/Tailwind
├── marketing-specialist/SKILL.md  # Social media, content, campaigns
├── product-manager/SKILL.md    # Roadmap, specs, prioritization
├── data-analyst/SKILL.md       # SQL, metrics, dashboards
└── copywriter/SKILL.md         # Conversion copywriting
```

### API for Agents

```typescript
// Move task
await moveTask(taskId, 'IN_PROGRESS', 0)

// Update bot status (shows live indicator)
await updateBotStatus(true, taskId)

// Add comment
await addComment(taskId, userId, 'Completed the feature')
```

## 🛠️ Tech Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Prisma + PostgreSQL**
- **@hello-pangea/dnd** (drag & drop)

## 🔧 Environment

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/crewboard
```

## 📄 License

MIT

## 🤝 Contributing

PRs welcome! Check the issues tab for good first issues.
