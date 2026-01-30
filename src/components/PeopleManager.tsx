'use client'

import { useMemo, useState, useTransition } from 'react'
import { Bot, Check, ChevronDown, Pencil, Plus, Trash2, UserRound, X, Zap } from 'lucide-react'
import Avatar from 'boring-avatars'
import { createPerson, deletePerson, updatePerson } from '@/app/people/actions'

type Person = {
  id: string
  name: string
  avatar: string | null
  isBot: boolean
  agentSkill: string | null
}

type AgentProfile = {
  id: string
  name: string
  description: string
  icon: string
}

const emptyForm = { name: '', avatar: '', isBot: false, agentSkill: '' }

export default function PeopleManager({ 
  initialPeople,
  agentProfiles = [],
}: { 
  initialPeople: Person[]
  agentProfiles?: AgentProfile[]
}) {
  const [people, setPeople] = useState<Person[]>(initialPeople)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const sortedPeople = useMemo(
    () => [...people].sort((a, b) => a.name.localeCompare(b.name)),
    [people],
  )

  const resetForm = () => {
    setForm(emptyForm)
    setEditingId(null)
    setError(null)
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.name.trim()) {
      setError('Name is required')
      return
    }

    setError(null)
    startTransition(async () => {
      if (editingId) {
        const updated = await updatePerson(editingId, {
          name: form.name,
          avatar: form.avatar || undefined,
          isBot: form.isBot,
          agentSkill: form.agentSkill || undefined,
        })
        setPeople((prev) => prev.map((p) => (p.id === editingId ? updated : p)))
      } else {
        const created = await createPerson({
          name: form.name,
          avatar: form.avatar || undefined,
          isBot: form.isBot,
          agentSkill: form.agentSkill || undefined,
        })
        setPeople((prev) => [...prev, created])
      }
      resetForm()
    })
  }

  const handleEdit = (person: Person) => {
    setEditingId(person.id)
    setForm({
      name: person.name,
      avatar: person.avatar || '',
      isBot: person.isBot,
      agentSkill: person.agentSkill || '',
    })
  }

  const handleDelete = (id: string) => {
    if (!confirm('Delete this person? Their tasks will be unassigned.')) return
    startTransition(async () => {
      await deletePerson(id)
      setPeople((prev) => prev.filter((p) => p.id !== id))
      if (editingId === id) resetForm()
    })
  }

  return (
    <div className="space-y-8">
      <section className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {editingId ? 'Edit Person' : 'Add Person'}
            </p>
            <h2 className="text-xl font-semibold">
              {editingId ? 'Update collaborator' : 'Invite a new collaborator'}
            </h2>
          </div>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm hover:bg-card-hover transition-colors"
            >
              <X className="w-4 h-4" />
              Cancel edit
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1">
            <label className="text-sm text-muted-foreground">Name</label>
            <input
              className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2.5 focus:border-primary focus:outline-none"
              placeholder="e.g. Kike"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div className="md:col-span-1">
            <label className="text-sm text-muted-foreground">Avatar URL (optional)</label>
            <input
              className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2.5 focus:border-primary focus:outline-none"
              placeholder="https://"
              value={form.avatar}
              onChange={(e) => setForm((prev) => ({ ...prev, avatar: e.target.value }))}
            />
          </div>

          <div className="md:col-span-1 flex items-center gap-3 rounded-xl border border-border bg-background px-3">
            <input
              id="isBot"
              type="checkbox"
              className="w-4 h-4 accent-primary"
              checked={form.isBot}
              onChange={(e) => setForm((prev) => ({ ...prev, isBot: e.target.checked, agentSkill: '' }))}
            />
            <label htmlFor="isBot" className="text-sm text-muted-foreground">
              This is an agent/bot
            </label>
          </div>

          {/* Agent Profile Selector - only shown when isBot is checked */}
          {form.isBot && agentProfiles.length > 0 && (
            <div className="md:col-span-3">
              <label className="text-sm text-muted-foreground flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                Agent Profile
              </label>
              <select
                className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2.5 focus:border-primary focus:outline-none cursor-pointer"
                value={form.agentSkill}
                onChange={(e) => setForm((prev) => ({ ...prev, agentSkill: e.target.value }))}
              >
                <option value="">Select a role...</option>
                {agentProfiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.icon} {profile.name} — {profile.description}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-muted-foreground">
                What role does this agent play in your team?
              </p>
            </div>
          )}

          {error && (
            <div className="md:col-span-3 text-sm text-destructive font-medium">{error}</div>
          )}

          <div className="md:col-span-3 flex justify-end">
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {isPending ? (
                'Saving...'
              ) : editingId ? (
                <>
                  <Check className="w-4 h-4" />
                  Save changes
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Add person
                </>
              )}
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <p className="text-sm text-muted-foreground">
            {people.length} collaborator{people.length === 1 ? '' : 's'}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sortedPeople.map((person) => (
            <article
              key={person.id}
              className="group relative rounded-2xl border border-border bg-card/70 p-4 transition hover:border-primary/40"
            >
              <div className="flex items-center gap-3 mb-3">
                <AvatarCircle person={person} />
                <div>
                  <p className="font-semibold">{person.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {person.isBot ? (
                      person.agentSkill ? (
                        <span className="flex items-center gap-1">
                          {agentProfiles.find(p => p.id === person.agentSkill)?.icon || '🤖'}
                          {agentProfiles.find(p => p.id === person.agentSkill)?.name || person.agentSkill}
                        </span>
                      ) : 'Agent (no role)'
                    ) : 'Human collaborator'}
                  </p>
                </div>
              </div>

              {person.avatar && (
                <p className="text-xs text-muted-foreground break-all">
                  {person.avatar}
                </p>
              )}

              <div className="flex items-center gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => handleEdit(person)}
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/40"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(person.id)}
                  className="inline-flex items-center gap-1 rounded-lg border border-destructive/40 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            </article>
          ))}

          {sortedPeople.length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed border-border p-6 text-center text-muted-foreground">
              No people yet. Add collaborators above to get started.
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

// Color palette for avatars
const AVATAR_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6']

function AvatarCircle({ person }: { person: Person }) {
  if (person.avatar) {
    return (
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={person.avatar}
          alt={person.name}
          className="h-11 w-11 rounded-full object-cover border border-border"
        />
        {person.isBot && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 text-white shadow-md">
            <Bot className="w-3 h-3" />
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="relative">
      <Avatar
        size={44}
        name={person.name}
        variant="beam"
        colors={AVATAR_COLORS}
      />
      {person.isBot && (
        <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 text-white shadow-md">
          <Bot className="w-3 h-3" />
        </span>
      )}
    </div>
  )
}
