import 'server-only'

export interface AgentProfile {
  id: string
  name: string
  description: string
  icon: string
}

// Professional profiles for agents
// These correspond to skills in /Users/kike/clawd/skills/
export const AGENT_PROFILES: AgentProfile[] = [
  {
    id: 'dev-engineer',
    name: 'Dev Engineer',
    description: 'Full-stack developer (TypeScript, React, Node, PostgreSQL)',
    icon: '💻',
  },
  {
    id: 'ui-designer',
    name: 'UI Designer',
    description: 'UI/UX design, design systems, Figma, accessibility',
    icon: '🎨',
  },
  {
    id: 'marketing-specialist',
    name: 'Marketing Specialist',
    description: 'Growth, content, SEO, social media, campaigns',
    icon: '📈',
  },
  {
    id: 'product-manager',
    name: 'Product Manager',
    description: 'Prioritization, roadmap, user research, shipping',
    icon: '🎯',
  },
  {
    id: 'copywriter',
    name: 'Copywriter',
    description: 'Landing pages, emails, product copy, conversion',
    icon: '✍️',
  },
  {
    id: 'data-analyst',
    name: 'Data Analyst',
    description: 'SQL, dashboards, metrics, A/B testing, insights',
    icon: '📊',
  },
]

export function getAgentProfiles(): AgentProfile[] {
  return AGENT_PROFILES
}
