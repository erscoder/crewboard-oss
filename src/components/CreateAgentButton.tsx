'use client'

import { useState } from 'react'
import { Plus, X, Bot, Loader2 } from 'lucide-react'
import { createAgent } from '@/app/agents/actions'

const AVAILABLE_MODELS = [
  { value: 'claude-sonnet-4', label: 'Claude Sonnet 4' },
  { value: 'claude-opus-4-5', label: 'Claude Opus 4.5' },
  { value: 'claude-haiku', label: 'Claude Haiku 3.5' },
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
]

const AVAILABLE_SKILLS = [
  'coding', 'research', 'writing', 'design', 'data-analysis', 
  'marketing', 'qa-testing', 'devops', 'documentation'
]

const AVAILABLE_TOOLS = [
  'web_search', 'web_fetch', 'exec', 'read_file', 'write_file', 'github_api'
]

export default function CreateAgentButton() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    model: 'claude-sonnet-4',
    systemPrompt: 'You are a helpful AI assistant. Complete tasks efficiently and provide clear summaries.',
    skills: [] as string[],
    tools: [] as string[],
    maxTokens: 4096,
    temperature: 0.7,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    setLoading(true)
    try {
      await createAgent({
        ...formData,
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
      })
      setOpen(false)
      setFormData({
        name: '',
        description: '',
        model: 'claude-sonnet-4',
        systemPrompt: 'You are a helpful AI assistant. Complete tasks efficiently and provide clear summaries.',
        skills: [],
        tools: [],
        maxTokens: 4096,
        temperature: 0.7,
      })
    } finally {
      setLoading(false)
    }
  }

  const toggleSkill = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill]
    }))
  }

  const toggleTool = (tool: string) => {
    setFormData(prev => ({
      ...prev,
      tools: prev.tools.includes(tool)
        ? prev.tools.filter(t => t !== tool)
        : [...prev.tools, tool]
    }))
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        <Plus className="w-4 h-4" />
        New Agent
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-lg max-h-[90vh] overflow-auto rounded-2xl border border-border bg-card shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-primary" />
                <h2 className="font-semibold">Create Agent</h2>
              </div>
              <button onClick={() => setOpen(false)} className="p-1 hover:bg-muted rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Code Assistant"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="What does this agent do?"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>

              {/* Model */}
              <div>
                <label className="block text-sm font-medium mb-1">Model</label>
                <select
                  value={formData.model}
                  onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                >
                  {AVAILABLE_MODELS.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              {/* System Prompt */}
              <div>
                <label className="block text-sm font-medium mb-1">System Prompt</label>
                <textarea
                  value={formData.systemPrompt}
                  onChange={(e) => setFormData(prev => ({ ...prev, systemPrompt: e.target.value }))}
                  rows={3}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none resize-none"
                />
              </div>

              {/* Skills */}
              <div>
                <label className="block text-sm font-medium mb-2">Skills</label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_SKILLS.map(skill => (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => toggleSkill(skill)}
                      className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
                        formData.skills.includes(skill)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {skill}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tools */}
              <div>
                <label className="block text-sm font-medium mb-2">Tools</label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_TOOLS.map(tool => (
                    <button
                      key={tool}
                      type="button"
                      onClick={() => toggleTool(tool)}
                      className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
                        formData.tools.includes(tool)
                          ? 'bg-secondary text-secondary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {tool}
                    </button>
                  ))}
                </div>
              </div>

              {/* Advanced */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Max Tokens</label>
                  <input
                    type="number"
                    value={formData.maxTokens}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxTokens: parseInt(e.target.value) || 4096 }))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Temperature</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="2"
                    value={formData.temperature}
                    onChange={(e) => setFormData(prev => ({ ...prev, temperature: parseFloat(e.target.value) || 0.7 }))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !formData.name.trim()}
                  className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create Agent
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
