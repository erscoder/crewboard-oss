export type PlanId = 'free' | 'pro' | 'team'

export type Plan = {
  id: PlanId
  name: string
  tagline: string
  monthly: number
  annual: number
  tasks: string
  features: string[]
  cta: string
  popular?: boolean
  limits: {
    projects?: number | null
    agentsPerProject?: number | null
    tasksPerMonth?: number | null
    tokensPerMonth?: number | null
  }
}

export const plans: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'Solo experiments',
    monthly: 0,
    annual: 0,
    tasks: '1 project · 1 agent · 40 tasks/mo',
    features: [
      'BYOK (own API key)',
      '1 project',
      '1 agent',
      'GitHub & Slack',
      'Community support',
    ],
    limits: { projects: 1, agentsPerProject: 1, tasksPerMonth: 40, tokensPerMonth: 300_000 },
    cta: 'Start free',
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'For builders',
    monthly: 29.99,
    annual: 23.99,
    tasks: '3 projects · 2 agents · 400 tasks/mo',
    features: [
      '3 projects',
      '2 agents per project',
      'Analytics & insights',
      'GitHub & Slack',
      'Priority queue',
    ],
    limits: { projects: 3, agentsPerProject: 2, tasksPerMonth: 400, tokensPerMonth: 3_000_000 },
    cta: 'Get Pro',
    popular: true,
  },
  {
    id: 'team',
    name: 'Team',
    tagline: 'Product squads',
    monthly: 79.99,
    annual: 63.99,
    tasks: 'Unlimited projects · All agents · Unlimited tasks',
    features: [
      'Unlimited projects',
      'All available agents',
      'Analytics & insights',
      'GitHub & Slack',
      'Priority support',
    ],
    limits: { projects: null, agentsPerProject: null, tasksPerMonth: null, tokensPerMonth: null },
    cta: 'Get Team',
  },
]

export const planMap: Record<PlanId, Plan> = plans.reduce(
  (acc, plan) => ({ ...acc, [plan.id]: plan }),
  {} as Record<PlanId, Plan>,
)

export const defaultPlanId: PlanId = 'free'

export function getPlanById(id?: string | null): Plan {
  if (!id) return planMap[defaultPlanId]
  return planMap[(id as PlanId) in planMap ? (id as PlanId) : defaultPlanId]
}

export function isPaidPlan(id?: PlanId | string | null) {
  return id === 'pro' || id === 'team'
}
