import 'server-only'
import { readFileSync, readdirSync, existsSync } from 'fs'
import { join } from 'path'

export interface Skill {
  id: string
  name: string
  description: string
  content: string
  path: string
}

// Cache for loaded skills
const skillsCache = new Map<string, Skill>()
let cacheInitialized = false

// Path to skills directory - can be configured via env
const SKILLS_PATH = process.env.SKILLS_PATH || '/Users/kike/clawd/skills'

/**
 * Load a single skill from disk
 */
function loadSkillFromDisk(skillId: string): Skill | null {
  const skillDir = join(SKILLS_PATH, skillId)
  const skillFile = join(skillDir, 'SKILL.md')
  
  if (!existsSync(skillFile)) {
    console.warn(`Skill not found: ${skillId} at ${skillFile}`)
    return null
  }
  
  try {
    const content = readFileSync(skillFile, 'utf-8')
    
    // Parse name and description from the first few lines
    const lines = content.split('\n')
    let name = skillId
    let description = ''
    
    for (const line of lines.slice(0, 10)) {
      if (line.startsWith('# ')) {
        name = line.replace('# ', '').trim()
      } else if (line.startsWith('> ') || (line.length > 20 && !line.startsWith('#'))) {
        description = line.replace('> ', '').trim()
        break
      }
    }
    
    return {
      id: skillId,
      name,
      description,
      content,
      path: skillFile,
    }
  } catch (error) {
    console.error(`Error loading skill ${skillId}:`, error)
    return null
  }
}

/**
 * Initialize the skills cache by scanning the skills directory
 */
function initializeCache(): void {
  if (cacheInitialized) return
  
  if (!existsSync(SKILLS_PATH)) {
    console.warn(`Skills directory not found: ${SKILLS_PATH}`)
    cacheInitialized = true
    return
  }
  
  try {
    const dirs = readdirSync(SKILLS_PATH, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name)
    
    for (const dir of dirs) {
      const skill = loadSkillFromDisk(dir)
      if (skill) {
        skillsCache.set(dir, skill)
      }
    }
    
    console.log(`Loaded ${skillsCache.size} skills from ${SKILLS_PATH}`)
    cacheInitialized = true
  } catch (error) {
    console.error('Error initializing skills cache:', error)
    cacheInitialized = true
  }
}

/**
 * Get a skill by ID
 */
export function getSkill(skillId: string): Skill | null {
  initializeCache()
  
  // Check cache first
  if (skillsCache.has(skillId)) {
    return skillsCache.get(skillId)!
  }
  
  // Try loading from disk (might be a new skill)
  const skill = loadSkillFromDisk(skillId)
  if (skill) {
    skillsCache.set(skillId, skill)
  }
  
  return skill
}

/**
 * Get multiple skills by IDs
 */
export function getSkills(skillIds: string[]): Skill[] {
  return skillIds
    .map(id => getSkill(id))
    .filter((s): s is Skill => s !== null)
}

/**
 * List all available skills
 */
export function listSkills(): Skill[] {
  initializeCache()
  return Array.from(skillsCache.values())
}

/**
 * Reload skills cache (useful after adding new skills)
 */
export function reloadSkills(): void {
  skillsCache.clear()
  cacheInitialized = false
  initializeCache()
}

/**
 * Build the skills section for an agent's system prompt
 */
export function buildSkillsPrompt(skillIds: string[]): string {
  const skills = getSkills(skillIds)
  
  if (skills.length === 0) {
    return ''
  }
  
  const sections = skills.map(skill => {
    return `## Skill: ${skill.name}\n\n${skill.content}`
  })
  
  return `# Available Skills\n\n${sections.join('\n\n---\n\n')}`
}
