'use client'

import { useMemo, useState, useTransition } from 'react'
import { Check, Pencil, Plus, Trash2, X, Zap } from 'lucide-react'
import { createPerson, deletePerson, updatePerson } from '@/app/people/actions'
import UserAvatar from './UserAvatar'
import ConfirmDialog from './ConfirmDialog'
import UpgradeModal from './UpgradeModal'
import { PlanId, getPlanById } from '@/lib/plans'

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
  planId = 'free',
}: {
  initialPeople: Person[]
  agentProfiles?: AgentProfile[]
  planId?: PlanId
}) {
  const [people, setPeople] = useState<Person[]>(initialPeople)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [deleteTarget, setDeleteTarget] = useState<Person | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  const plan = getPlanById(planId)
  const agentLimit = plan.limits.agentsPerProject ?? Infinity
  const limitReached = Number.isFinite(agentLimit) && people.length >= agentLimit

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
    if (!editingId && limitReached) {
      setShowUpgradeModal(true)
      return
    }

    setError(null)
    startTransition(async () => {
      try {
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
      } catch (err: any) {
        setError(err.message || 'Unable to save person')
      }
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

  const handleDeleteClick = (person: Person) => {
    setDeleteTarget(person)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    startTransition(async () => {
      await deletePerson(deleteTarget.id)
      setPeople((prev) => prev.filter((p) => p.id !== deleteTarget.id))
      if (editingId === deleteTarget.id) resetForm()
      setDeleteTarget(null)
      setDeleting(false)
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
            <p className="text-xs text-muted-foreground mt-1">
              Plan: {plan.name} — {people.length}/{Number.isFinite(agentLimit) ? agentLimit : '∞'} agents
            </p>
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
              disabled={isPending || limitReached}
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
          {limitReached && (
            <div className="md:col-span-3 text-xs text-muted-foreground flex items-center gap-2">
              <Zap className="w-3 h-3 text-primary" />
              Agent limit reached. Upgrade to Pro or Team for more seats.
            </div>
          )}
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
                <UserAvatar user={person} />
                <div>
                  <p className="font-semibold">{person.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {person.isBot ? (
                      person.agentSkill ? (
                        <span className="flex items-center gap-1">
                          {agentProfiles.find((p) => p.id === person.agentSkill)?.icon || '🤖'}
                          {agentProfiles.find((p) => p.id === person.agentSkill)?.name || person.agentSkill}
                        </span>
                      ) : (
                        'Agent (no role)'
                      )
                    ) : (
                      'Human collaborator'
                    )}
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
                  onClick={() => handleDeleteClick(person)}
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

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete Person"
          message={`Delete "${deleteTarget.name}"? Their tasks will be unassigned.`}
          confirmText="Delete"
          cancelText="Cancel"
          variant="danger"
          loading={deleting}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <UpgradeModal
          currentPlanId={planId}
          limitType="agents"
          onClose={() => setShowUpgradeModal(false)}
        />
      )}
    </div>
  )
}
