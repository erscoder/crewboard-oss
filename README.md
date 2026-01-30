# Mission Control 🚀

Task management dashboard for Clawdbot. A Kanban board where Kike creates tasks, agents pick them up, and everyone collaborates on projects.

## Features

- 📋 **Kanban Board** - Backlog → TODO → In Progress → Review → Done
- 👥 **Multi-Agent** - Human + AI agents with specialized skills
- 🎨 **Projects** - Auto-synced from Clawdbot workspace
- 🧠 **Skills** - Agent capabilities synced on startup
- 📊 **Stats Banner** - Weekly progress, completion rate
- 🟢 **Live Indicator** - Shows when agents are working
- 🔄 **Drag & Drop** - Move tasks between columns

## Quick Start

```bash
# Install dependencies
npm install

# Setup database
cp .env.example .env
# Edit .env with your DATABASE_URL

# Push schema and seed data
npm run db:push
npm run db:seed

# Start dev server
npm run dev
```

## Agents & Skills

Mission Control manages a team of AI agents, each with specialized skills.

### 👥 Team

| Agent | Skill | Role |
|-------|-------|------|
| **Kike** | - | Human. Creates tasks, reviews, approves. |
| **Harvis** | `coordinator` | AI Coordinator. Manages tasks, communication, calendar. |
| **Codex** | `dev-engineer` | Developer. Writes code, fixes bugs, runs tests. Uses Codex CLI. |
| **Peter Designer** | `ui-designer` | UI/UX Designer. Creates interfaces, mockups, CSS/Tailwind. |
| **Marta Marketing** | `marketing-specialist` | Marketer. Social media, content, email campaigns. |
| **Alex PM** | `product-manager` | Product Manager. Roadmap, specs, prioritization. |

### 🧠 How Skills Work

Skills are stored in `skills/` and define what each agent knows how to do.

```
skills/
├── dev-engineer/
│   └── SKILL.md      # How Codex writes code
├── ui-designer/
│   └── SKILL.md      # How Peter creates designs
├── marketing-specialist/
│   └── SKILL.md      # How Marta runs campaigns
├── product-manager/
│   └── SKILL.md      # How Alex manages product
├── copywriter/
│   └── SKILL.md      # Conversion copywriting
├── data-analyst/
│   └── SKILL.md      # SQL, metrics, dashboards
└── codex-delegation/
    └── SKILL.md      # How to delegate to Codex CLI
```

### 🔄 Skill Sync

On `npm run db:seed`:

1. **Projects** are read from Clawdbot's `projects/` folder and created in the database
2. **Agents** are created/updated with their skill assignments
3. **Skills** are copied from `skills/` to Clawdbot's skills directory

This means:
- Add a new skill folder → run seed → Clawdbot picks it up
- Edit a skill in this repo → run seed → changes sync to Clawdbot
- Add a project folder → run seed → appears in Mission Control

### 📝 Skill Format

Each skill has a `SKILL.md` with:

```markdown
# Skill Name

<description>One-line description for Clawdbot's skill index.</description>

## Role
What this agent does.

## How You Work
Step-by-step workflow.

## Tools
What tools/CLIs this agent uses.

## Standards
Quality guidelines and patterns.
```

## Task Workflow

```
BACKLOG → TODO → IN_PROGRESS → REVIEW → DONE
```

1. **Kike creates task** → Goes to BACKLOG
2. **Kike prioritizes** → Moves to TODO, assigns to agent
3. **Agent starts work** → Moves to IN_PROGRESS
4. **Agent finishes** → Moves to REVIEW
5. **Kike reviews** → Approves to DONE

### Rules for Agents

- **Always** move task to IN_PROGRESS before starting
- **Always** add a comment summarizing what was done
- **Assign correctly**: code → Codex, design → Peter, marketing → Marta
- **Ask if stuck**: Comment on task and assign to Kike

## API

Agents interact via Prisma or server actions:

```typescript
// Move task
await moveTask(taskId, 'IN_PROGRESS', 0)

// Update bot status (shows live indicator)
await updateBotStatus(true, taskId)

// Add comment
await addComment(taskId, userId, 'Completed the feature')
```

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Prisma + PostgreSQL
- @hello-pangea/dnd (drag & drop)

## Files

| File | Purpose |
|------|---------|
| `prisma/seed.ts` | Seeds agents, projects, syncs skills |
| `skills/` | Agent skill definitions |
| `AGENTS.md` | Agent workflow guide |
| `src/app/actions.ts` | Server actions for tasks |

## Environment

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/mission_control
CLAWDBOT_ROOT=/path/to/clawd  # Optional, auto-detected
```
