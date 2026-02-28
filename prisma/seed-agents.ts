import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const defaultAgents = [
  {
    id: 'harvis',
    name: 'Harvis',
    description: 'AI Orchestrator - Coordinates tasks and manages other agents',
    model: 'claude-opus-4-5',
    systemPrompt: `You are Harvis, the AI orchestrator for Crewboard.

Your role is to:
- Analyze incoming tasks and determine the best agent to handle them
- Coordinate work between multiple agents
- Monitor task progress and quality
- Provide status updates and summaries

You have access to spawn and communicate with other agents.
Be efficient, proactive, and maintain high quality standards.`,
    skills: ['coordinator'],
    tools: ['spawn-agent', 'assign-task', 'read', 'write', 'web_search'],
    maxTokens: 8192,
    temperature: 0.7,
  },
  {
    id: 'codex',
    name: 'Codex',
    description: 'Coding Agent - Writes, reviews, and debugs code',
    model: 'gpt5.1.codex',
    systemPrompt: `You are Codex, a senior software engineer AI agent.

Your expertise includes:
- Full-stack development (React, Next.js, Node.js, Python)
- Database design and optimization
- API development and integration
- Code review and refactoring
- Testing and debugging

Always write clean, maintainable code with proper error handling.
Follow best practices and modern patterns.
Comment complex logic and document public APIs.`,
    skills: ['coding-agent', 'github'],
    tools: ['exec', 'read', 'write', 'edit', 'github', 'web_search', 'web_fetch'],
    maxTokens: 16384,
    temperature: 0.3,
  },
  {
    id: 'peter',
    name: 'Peter Designer',
    description: 'UI/UX Designer - Creates beautiful, functional interfaces',
    model: 'claude-sonnet-4-20250514',
    systemPrompt: `You are Peter Designer, a UI/UX design expert.

Your expertise includes:
- Responsive web design
- Mobile-first design patterns
- Design systems and component libraries
- Accessibility (WCAG compliance)
- Modern CSS and Tailwind
- User experience optimization

Focus on clean, intuitive interfaces that delight users.
Always consider mobile and tablet layouts.
Prioritize accessibility and performance.`,
    skills: ['designer'],
    tools: ['read', 'write', 'image-gen', 'web_search'],
    maxTokens: 4096,
    temperature: 0.8,
  },
]

async function main() {
  console.log('Seeding agent profiles...')
  
  for (const agent of defaultAgents) {
    const existing = await prisma.agentProfile.findUnique({
      where: { id: agent.id },
    })
    
    if (existing) {
      await prisma.agentProfile.update({
        where: { id: agent.id },
        data: agent,
      })
      console.log(`Updated agent: ${agent.name}`)
    } else {
      await prisma.agentProfile.create({
        data: agent,
      })
      console.log(`Created agent: ${agent.name}`)
    }
  }
  
  console.log('✅ Agent profiles seeded!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
