/**
 * Agent Tools - Execution layer for agent capabilities
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import { readFile, writeFile } from 'fs/promises'
import path from 'path'

const execAsync = promisify(exec)

// Tool definitions in Claude/OpenAI format
export const AVAILABLE_TOOLS = [
  {
    name: 'web_search',
    description: 'Search the web using Brave Search API. Returns titles, URLs, and snippets.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query string',
        },
        count: {
          type: 'number',
          description: 'Number of results (1-10)',
          default: 5,
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'web_fetch',
    description: 'Fetch and extract readable content from a URL (HTML → markdown).',
    input_schema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'URL to fetch',
        },
        maxChars: {
          type: 'number',
          description: 'Maximum characters to return',
          default: 10000,
        },
      },
      required: ['url'],
    },
  },
  {
    name: 'exec',
    description: 'Execute a shell command (sandboxed, timeout 30s). Use for git, npm, file operations.',
    input_schema: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'Shell command to execute',
        },
        workdir: {
          type: 'string',
          description: 'Working directory (optional)',
        },
      },
      required: ['command'],
    },
  },
  {
    name: 'read_file',
    description: 'Read the contents of a file.',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the file',
        },
        maxLines: {
          type: 'number',
          description: 'Maximum lines to read',
          default: 500,
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'write_file',
    description: 'Write content to a file (creates if not exists, overwrites if exists).',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the file',
        },
        content: {
          type: 'string',
          description: 'Content to write',
        },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'github_api',
    description: 'Call GitHub API using gh CLI. Examples: gh issue list, gh pr list, gh api /repos/{owner}/{repo}',
    input_schema: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'gh CLI command (without "gh" prefix)',
        },
      },
      required: ['command'],
    },
  },
]

// Allowed tools per agent (by name)
const AGENT_TOOL_PERMISSIONS: Record<string, string[]> = {
  'Harvis': ['web_search', 'web_fetch', 'read_file', 'github_api'],
  'Codex': ['exec', 'read_file', 'write_file', 'github_api', 'web_search', 'web_fetch'],
  'Peter Designer': ['web_search', 'web_fetch', 'read_file'],
  'Marketing Mike': ['web_search', 'web_fetch'],
  'QA Quinn': ['exec', 'read_file', 'web_fetch'],
  'Data Dave': ['exec', 'read_file', 'write_file', 'web_search'],
}

// Default permissions for unknown agents
const DEFAULT_PERMISSIONS = ['web_search', 'web_fetch']

/**
 * Get tools available for a specific agent
 */
export function getToolsForAgent(agentName: string, requestedTools?: string[]) {
  const allowed = AGENT_TOOL_PERMISSIONS[agentName] || DEFAULT_PERMISSIONS
  
  return AVAILABLE_TOOLS.filter(tool => {
    // Must be in agent's allowed list
    if (!allowed.includes(tool.name)) return false
    // If specific tools requested, filter to those
    if (requestedTools && requestedTools.length > 0) {
      return requestedTools.includes(tool.name)
    }
    return true
  })
}

/**
 * Execute a tool call
 */
export async function executeTool(
  toolName: string,
  input: Record<string, any>,
  agentName: string
): Promise<{ success: boolean; result?: string; error?: string }> {
  // Check permissions
  const allowed = AGENT_TOOL_PERMISSIONS[agentName] || DEFAULT_PERMISSIONS
  if (!allowed.includes(toolName)) {
    return { success: false, error: `Tool "${toolName}" not permitted for agent "${agentName}"` }
  }

  try {
    switch (toolName) {
      case 'web_search':
        return await executeWebSearch(input)
      case 'web_fetch':
        return await executeWebFetch(input)
      case 'exec':
        return await executeCommand(input)
      case 'read_file':
        return await executeReadFile(input)
      case 'write_file':
        return await executeWriteFile(input)
      case 'github_api':
        return await executeGitHub(input)
      default:
        return { success: false, error: `Unknown tool: ${toolName}` }
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Tool implementations

async function executeWebSearch(input: Record<string, any>) {
  const apiKey = process.env.BRAVE_API_KEY
  if (!apiKey) {
    return { success: false, error: 'BRAVE_API_KEY not configured' }
  }

  const count = Math.min(input.count || 5, 10)
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(input.query)}&count=${count}`
  
  const res = await fetch(url, {
    headers: { 'X-Subscription-Token': apiKey },
  })

  if (!res.ok) {
    return { success: false, error: `Brave API error: ${res.status}` }
  }

  const data = await res.json()
  const results = data.web?.results || []
  
  const formatted = results.map((r: any, i: number) => 
    `${i + 1}. ${r.title}\n   ${r.url}\n   ${r.description || ''}`
  ).join('\n\n')

  return { success: true, result: formatted || 'No results found' }
}

async function executeWebFetch(input: Record<string, any>) {
  // Use a simple fetch + html-to-text approach
  const res = await fetch(input.url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CrewboardBot/1.0)' },
  })

  if (!res.ok) {
    return { success: false, error: `Fetch failed: ${res.status}` }
  }

  const html = await res.text()
  
  // Simple HTML to text conversion (strip tags)
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const maxChars = input.maxChars || 10000
  if (text.length > maxChars) {
    text = text.slice(0, maxChars) + '...[truncated]'
  }

  return { success: true, result: text }
}

async function executeCommand(input: Record<string, any>) {
  // Security: Block dangerous commands
  const blocked = ['rm -rf /', 'sudo', 'chmod 777', 'curl | sh', 'wget | sh']
  if (blocked.some(b => input.command.includes(b))) {
    return { success: false, error: 'Command blocked for security reasons' }
  }

  const options: any = { timeout: 30000 } // 30s timeout
  if (input.workdir) {
    options.cwd = input.workdir
  }

  try {
    const { stdout, stderr } = await execAsync(input.command, options)
    const output = stdout + (stderr ? `\n[stderr]: ${stderr}` : '')
    return { success: true, result: output.slice(0, 50000) } // Limit output
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

async function executeReadFile(input: Record<string, any>) {
  // Security: Only allow reading from safe paths
  const safePaths = ['/Users/kike/clawd', '/tmp']
  const resolved = path.resolve(input.path)
  if (!safePaths.some(safe => resolved.startsWith(safe))) {
    return { success: false, error: 'Path not allowed' }
  }

  const content = await readFile(resolved, 'utf-8')
  const lines = content.split('\n')
  const maxLines = input.maxLines || 500
  
  if (lines.length > maxLines) {
    return { 
      success: true, 
      result: lines.slice(0, maxLines).join('\n') + `\n...[truncated, ${lines.length} total lines]` 
    }
  }

  return { success: true, result: content }
}

async function executeWriteFile(input: Record<string, any>) {
  // Security: Only allow writing to safe paths
  const safePaths = ['/Users/kike/clawd', '/tmp']
  const resolved = path.resolve(input.path)
  if (!safePaths.some(safe => resolved.startsWith(safe))) {
    return { success: false, error: 'Path not allowed' }
  }

  await writeFile(resolved, input.content, 'utf-8')
  return { success: true, result: `Wrote ${input.content.length} bytes to ${input.path}` }
}

async function executeGitHub(input: Record<string, any>) {
  // Use gh CLI
  const command = `gh ${input.command}`
  
  try {
    const { stdout, stderr } = await execAsync(command, { timeout: 30000 })
    return { success: true, result: stdout + (stderr ? `\n[stderr]: ${stderr}` : '') }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
