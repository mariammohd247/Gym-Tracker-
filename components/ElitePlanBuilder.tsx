'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { UserProfile } from '@/lib/types'
import { WeekPlan, WorkoutBlock } from '@/lib/planGenerator'
import {
  ChevronLeft, Save, Plus, Trash2, ChevronDown, ChevronUp,
  Loader2, CheckCircle, User, Crown
} from 'lucide-react'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const EMOJIS = ['💪', '🏃', '🔥', '⚡', '🦵', '🏋️', '🎯', '💥', '🧘', '🤸', '🚴', '🏊']

interface Props {
  adminProfile: UserProfile
  onBack: () => void
}

function emptyWorkout(): WorkoutBlock {
  return { name: '', emoji: '💪', focus: '', duration: 45, calories: 300, exercises: [], note: '' }
}

function emptyWeek(weekNum: number): WeekPlan {
  return {
    weekNum,
    theme: `Week ${weekNum}`,
    schedule: DAYS.map(day => ({ day, workout: null })),
  }
}

export default function ElitePlanBuilder({ adminProfile, onBack }: Props) {
  const [eliteMembers, setEliteMembers] = useState<UserProfile[]>([])
  const [selectedMember, setSelectedMember] = useState<UserProfile | null>(null)
  const [existingPlanId, setExistingPlanId] = useState<string | null>(null)
  const [title, setTitle] = useState('Your Elite Plan')
  const [notes, setNotes] = useState('')
  const [weeks, setWeeks] = useState<WeekPlan[]>([1, 2, 3, 4].map(emptyWeek))
  const [expandedWeek, setExpandedWeek] = useState<number>(1)
  const [expandedDay, setExpandedDay] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loadingMembers, setLoadingMembers] = useState(true)
  const [loadingPlan, setLoadingPlan] = useState(false)

  // Load elite members
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('subscription_plan', 'elite')
        .order('name')
      setEliteMembers(data ?? [])
      setLoadingMembers(false)
    }
    load()
  }, [])

  // When member changes, load any existing plan for them
  async function selectMember(member: UserProfile) {
    setSelectedMember(member)
    setLoadingPlan(true)
    const { data } = await supabase
      .from('elite_assigned_plans')
      .select('*')
      .eq('user_profile_id', member.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (data) {
      setExistingPlanId(data.id)
      setTitle(data.title)
      setNotes(data.notes ?? '')
      setWeeks(data.plan_data as WeekPlan[])
    } else {
      setExistingPlanId(null)
      setTitle('Your Elite Plan')
      setNotes('')
      setWeeks([1, 2, 3, 4].map(emptyWeek))
    }
    setLoadingPlan(false)
  }

  // Toggle a day between rest and workout
  function toggleRest(weekIdx: number, dayIdx: number) {
    setWeeks(prev => {
      const next = JSON.parse(JSON.stringify(prev)) as WeekPlan[]
      const day = next[weekIdx].schedule[dayIdx]
      day.workout = day.workout ? null : emptyWorkout()
      return next
    })
  }

  // Update a workout field
  function updateWorkout(weekIdx: number, dayIdx: number, patch: Partial<WorkoutBlock>) {
    setWeeks(prev => {
      const next = JSON.parse(JSON.stringify(prev)) as WeekPlan[]
      const w = next[weekIdx].schedule[dayIdx].workout
      if (w) Object.assign(w, patch)
      return next
    })
  }

  // Update exercises (stored as string[], one per line from a textarea)
  function updateExercises(weekIdx: number, dayIdx: number, raw: string) {
    const list = raw.split('\n').map(s => s.trim()).filter(Boolean)
    updateWorkout(weekIdx, dayIdx, { exercises: list })
  }

  // Update week theme
  function updateTheme(weekIdx: number, theme: string) {
    setWeeks(prev => {
      const next = JSON.parse(JSON.stringify(prev)) as WeekPlan[]
      next[weekIdx].theme = theme
      return next
    })
  }

  async function save() {
    if (!selectedMember) return
    setSaving(true)
    setSaved(false)

    const payload = {
      user_profile_id: selectedMember.id,
      title,
      plan_data: weeks,
      notes: notes || null,
      assigned_by_id: adminProfile.id,
      updated_at: new Date().toISOString(),
    }

    let error
    if (existingPlanId) {
      const res = await supabase.from('elite_assigned_plans').update(payload).eq('id', existingPlanId)
      error = res.error
    } else {
      const res = await supabase.from('elite_assigned_plans').insert(payload).select().single()
      error = res.error
      if (res.data) setExistingPlanId(res.data.id)
    }

    setSaving(false)
    if (!error) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
  }

  // ── UI ───────────────────────────────────────────────────────────
  return (
    <div className="pb-28">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-gray-900 border-b border-gray-800 flex items-center gap-3 px-4 py-4">
        <button onClick={onBack} className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h2 className="text-white font-bold text-base">Elite Plan Builder</h2>
          <p className="text-gray-500 text-xs">Manually assign a 4-week plan to an Elite member</p>
        </div>
        <button
          onClick={save}
          disabled={!selectedMember || saving}
          className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-purple-400 hover:from-purple-500 hover:to-purple-300 disabled:opacity-40 text-white font-bold px-4 py-2 rounded-xl transition active:scale-95 text-sm"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? 'Saved!' : 'Save'}
        </button>
      </div>

      <div className="px-4 pt-4 space-y-5">
        {/* Member picker */}
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 space-y-3">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Select Elite Member</p>
          {loadingMembers ? (
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading members…
            </div>
          ) : eliteMembers.length === 0 ? (
            <p className="text-gray-500 text-sm">No elite members found.</p>
          ) : (
            <div className="space-y-2">
              {eliteMembers.map(m => (
                <button
                  key={m.id}
                  onClick={() => selectMember(m)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition text-left ${
                    selectedMember?.id === m.id
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-gray-700 bg-gray-700/30 hover:border-gray-600'
                  }`}
                >
                  <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{m.name}</p>
                    <p className="text-gray-400 text-xs">{m.target_goal?.replace('_', ' ')} · {m.age} yrs</p>
                  </div>
                  <Crown className="w-4 h-4 text-purple-400 flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Plan details — only shown after selecting a member */}
        {selectedMember && (
          <>
            {loadingPlan ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
              </div>
            ) : (
              <>
                {existingPlanId && (
                  <div className="bg-purple-900/30 border border-purple-500/40 rounded-xl px-4 py-2.5 text-sm text-purple-300 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Existing plan loaded — you&apos;re editing it
                  </div>
                )}

                {/* Plan title */}
                <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 space-y-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Plan Title</p>
                  <input
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500"
                    placeholder="e.g. Elite Strength Programme"
                  />
                </div>

                {/* Coach notes */}
                <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 space-y-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Coach Notes (optional)</p>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={3}
                    className="w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 resize-none"
                    placeholder="Add any notes for the member…"
                  />
                </div>

                {/* 4 Weeks */}
                <div>
                  <h3 className="text-white font-bold text-sm mb-3">4-Week Schedule</h3>
                  <div className="space-y-3">
                    {weeks.map((week, wIdx) => (
                      <div key={week.weekNum} className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden">
                        {/* Week header */}
                        <button
                          onClick={() => setExpandedWeek(expandedWeek === week.weekNum ? 0 : week.weekNum)}
                          className="w-full flex items-center justify-between p-4"
                        >
                          <div className="text-left flex-1">
                            <div className="text-white font-bold text-sm">Week {week.weekNum}</div>
                            <input
                              value={week.theme}
                              onChange={e => { e.stopPropagation(); updateTheme(wIdx, e.target.value) }}
                              onClick={e => e.stopPropagation()}
                              className="bg-transparent text-xs text-purple-400 focus:outline-none focus:text-purple-300 mt-0.5 w-full"
                              placeholder="Week theme (e.g. Foundation)"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">
                              {week.schedule.filter(d => d.workout).length} workouts
                            </span>
                            {expandedWeek === week.weekNum
                              ? <ChevronUp className="w-4 h-4 text-gray-400" />
                              : <ChevronDown className="w-4 h-4 text-gray-400" />
                            }
                          </div>
                        </button>

                        {/* Days */}
                        {expandedWeek === week.weekNum && (
                          <div className="border-t border-gray-700 divide-y divide-gray-700/50">
                            {week.schedule.map((daySchedule, dIdx) => {
                              const key = `${wIdx}-${dIdx}`
                              const isExpanded = expandedDay === key
                              const w = daySchedule.workout

                              return (
                                <div key={daySchedule.day} className="px-4 py-3">
                                  {/* Day row */}
                                  <div className="flex items-center gap-3">
                                    <span className="text-gray-400 text-xs w-16 flex-shrink-0">{daySchedule.day.slice(0, 3)}</span>

                                    {/* Rest / Workout toggle */}
                                    <button
                                      onClick={() => toggleRest(wIdx, dIdx)}
                                      className={`text-xs px-2.5 py-1 rounded-full font-semibold transition ${
                                        w
                                          ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
                                          : 'bg-gray-700 text-gray-500 border border-gray-600'
                                      }`}
                                    >
                                      {w ? '💪 Workout' : '😴 Rest'}
                                    </button>

                                    {/* Expand workout editor */}
                                    {w && (
                                      <button
                                        onClick={() => setExpandedDay(isExpanded ? null : key)}
                                        className="ml-auto flex items-center gap-1 text-xs text-gray-400 hover:text-white transition"
                                      >
                                        {isExpanded ? 'Close' : 'Edit'}
                                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                      </button>
                                    )}
                                  </div>

                                  {/* Workout editor */}
                                  {w && isExpanded && (
                                    <div className="mt-3 space-y-3 bg-gray-700/40 rounded-xl p-3">
                                      {/* Name + Emoji */}
                                      <div className="flex gap-2">
                                        <div className="flex gap-1 flex-wrap">
                                          {EMOJIS.map(em => (
                                            <button
                                              key={em}
                                              onClick={() => updateWorkout(wIdx, dIdx, { emoji: em })}
                                              className={`text-xl transition ${w.emoji === em ? 'opacity-100 scale-125' : 'opacity-40 hover:opacity-80'}`}
                                            >
                                              {em}
                                            </button>
                                          ))}
                                        </div>
                                      </div>

                                      <input
                                        value={w.name}
                                        onChange={e => updateWorkout(wIdx, dIdx, { name: e.target.value })}
                                        placeholder="Workout name (e.g. Push Day)"
                                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                                      />
                                      <input
                                        value={w.focus}
                                        onChange={e => updateWorkout(wIdx, dIdx, { focus: e.target.value })}
                                        placeholder="Focus area (e.g. Chest / Shoulders)"
                                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                                      />
                                      <div className="grid grid-cols-2 gap-2">
                                        <div>
                                          <label className="text-xs text-gray-400 mb-1 block">Duration (min)</label>
                                          <input
                                            type="number"
                                            value={w.duration}
                                            onChange={e => updateWorkout(wIdx, dIdx, { duration: Number(e.target.value) })}
                                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                                          />
                                        </div>
                                        <div>
                                          <label className="text-xs text-gray-400 mb-1 block">Est. Calories</label>
                                          <input
                                            type="number"
                                            value={w.calories}
                                            onChange={e => updateWorkout(wIdx, dIdx, { calories: Number(e.target.value) })}
                                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                                          />
                                        </div>
                                      </div>
                                      <div>
                                        <label className="text-xs text-gray-400 mb-1 block">Exercises (one per line)</label>
                                        <textarea
                                          value={w.exercises.join('\n')}
                                          onChange={e => updateExercises(wIdx, dIdx, e.target.value)}
                                          rows={4}
                                          placeholder={"Bench Press 4×8\nIncline DB Press 3×10\nCable Fly 3×12"}
                                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 resize-none font-mono"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-xs text-gray-400 mb-1 block">Health / Coach note (optional)</label>
                                        <input
                                          value={w.note ?? ''}
                                          onChange={e => updateWorkout(wIdx, dIdx, { note: e.target.value })}
                                          placeholder="e.g. Avoid heavy overhead press if shoulder pain"
                                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom save */}
                <button
                  onClick={save}
                  disabled={saving}
                  className="w-full bg-gradient-to-r from-purple-600 to-purple-400 hover:from-purple-500 hover:to-purple-300 disabled:opacity-40 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition active:scale-95 shadow-lg shadow-purple-500/20"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : saved ? <CheckCircle className="w-5 h-5" /> : <Save className="w-5 h-5" />}
                  {saving ? 'Saving…' : saved ? 'Plan Saved!' : `Save Plan for ${selectedMember.name.split(' ')[0]}`}
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
