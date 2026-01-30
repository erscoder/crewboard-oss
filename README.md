# Mission Control 🚀

Task management dashboard for Moltbot. A Kanban board where user signs tasks, Harvis picks them up, and they collaborate on projects.

## Features

- 📋 **Kanban Board** - Backlog → In Progress → Review → Done
- 👥 **Users** - Kike (human) & Harvis (AI)
- 🎨 **Projects** - Color-coded project badges
- 📊 **Stats Banner** - Weekly progress, completion rate
- 🟢 **Live Indicator** - Shows when Harvis is working
- 🔄 **Drag & Drop** - Move tasks between columns
- 💾 **PostgreSQL** - Persistent storage

## Setup

1. Copy environment file:
```bash
cp .env.example .env
```

2. Update DATABASE_URL in `.env` with your PostgreSQL connection string.

3. Install dependencies:
```bash
npm install
```

4. Push database schema:
```bash
npm run db:push
```

5. Seed initial data (optional):
```bash
npx ts-node -e "import { seedData } from './src/app/actions'; seedData()"
```

6. Start development server:
```bash
npm run dev
```

## Workflow

1. **Kike creates tasks** → Goes to Backlog
2. **Harvis picks up tasks** → Moves to In Progress
3. **Harvis completes** → Moves to Review
4. **Kike reviews** → Approves to Done, then Harvis commits

## API for Harvis

Harvis can update his status and interact with tasks via server actions or direct database access.

```typescript
// Update working status
await updateBotStatus(true, taskId)

// Move task to different column
await moveTask(taskId, 'REVIEW', 0)
```

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Prisma + PostgreSQL
- @hello-pangea/dnd (drag & drop)
