'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { UserProfile } from '@/lib/types'
import { WeekPlan, WorkoutBlock } from '@/lib/planGenerator'
import {
  Save, ChevronDown, ChevronUp, Loader2, CheckCircle,
  User, Crown, Zap, ClipboardList, AlertCircle,
} from 'lucide-react'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const EMOJIS = ['💪', '🏃', '🔥', '⚡', '🦵', '🏋️', '🎯', '💥', '🧘', '🤸', '🚴', '🏊']

interface Questionnaire {
  goal: string
  health_issues: string
  workout_days: string
  fitness_level: string
  timeline: string
}

interface Props {
  adminProfile: UserProfile
  planType: 'pro' | 'elite'
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

const GOAL_LABELS: Record<string, string> = {
  lose_weight: '🔥 Lose Weight',
  gain_muscle: '💪 Gain Muscle',
  maintain: '⚖️ Maintain',
}

const TIMELINE_LABELS: Record<string, string> = {
  '1_month': '1 Month',
  '3_months': '3 Months',
  '6_months': '6 Months',
  '1_year': '1 Year',
}

export default function PlanBuilder({ adminProfile, planType }: Props) {
  const isPro = planType === 'pro'

  const [members, setMembers] = useState<UserProfile[]>([])
  const [selectedMember, setSelectedMember] = useState<UserProfile | null>(null)
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null)
  const [existingPlanId, setExistingPlanId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [weeks, setWeeks] = useState<WeekPlan[]>([1, 2, 3, 4].map(emptyWeek))
  const [expandedWeek, setExpandedWeek] = useState<number>(1)
  const [expandedDay, setExpandedDay] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loadingMembers, setLoadingMembers] = useState(true)
  const [loadingPlan, setLoadingPlan] = useState(false)

  // Load members by plan type
  useEffect(() => {
    setSelectedMember(null)
    setQuestionnaire(null)
    setExistingPlanId(null)
    setWeeks([1, 2, 3, 4].map(emptyWeek))
    setLoadingMembers(true)

    supabase
      .from('user_profiles')
      .select('*')
      .eq('subscription_plan', planType)
      .order('name')
      .then(({ data }) => {
        setMembers(data ?? [])
        setLoadingMembers(false)
      })
  }, [planType])

  async function selectMember(member: UserProfile) {
    setSelectedMember(member)
    setQuestionnaire(null)
    setExistingPlanId(null)
    setLoadingPlan(true)

    const [planRes, qRes] = await Promise.all([
      supabase
        .from('elite_assigned_plans')
        .select('*')
        .eq('user_profile_id', member.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('subscription_questionnaire')
        .select('*')
        .eq('user_profile_id', member.id)
        .maybeSingle(),
    ])

    if (planRes.data) {
      setExistingPlanId(planRes.data.id)
      setTitle(planRes.data.title)
      setNotes(planRes.data.notes ?? '')
      setWeeks(planRes.data.plan_data as WeekPlan[])
    } else {
      setExistingPlanId(null)
      setTitle(`${member.name.split(' ')[0]}'s ${isPro ? 'Pro' : 'Elite'} Plan`)
      setNotes('')
      setWeeks([1, 2, 3, 4].map(emptyWeek))
    }

    setQuestionnaire(qRes.data ?? null)
    setLoadingPlan(false)
    setExpandedWeek(1)
    setExpandedDay(null)
  }

  function toggleRest(weekIdx: number, dayIdx: number) {
    setWeeks(prev => {
      const next = JSON.parse(JSON.stringify(prev)) as WeekPlan[]
      const day = next[weekIdx].schedule[dayIdx]
      day.workout = day.workout ? null : emptyWorkout()
      return next
    })
  }

  function updateWorkout(weekIdx: number, dayIdx: number, patch: Partial<WorkoutBlock>) {
    setWeeks(prev => {
      const next = JSON.parse(JSON.stringify(prev)) as WeekPlan[]
      const w = next[weekIdx].schedule[dayIdx].workout
      if (w) Object.assign(w, patch)
      return next
    })
  }

  function updateExercises(weekIdx: number, dayIdx: number, raw: string) {
    const list = raw.split('\n').map(s => s.trim()).filter(Boolean)
    updateWorkout(weekIdx, dayIdx, { exercises: list })
  }

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

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div className="space-y-4 px-4 pt-4 pb-10">

      {/* Member picker */}
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 space-y-3">
        <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold flex items-center gap-2">
          {isPro
            ? <Zap className="w-3.5 h-3.5 text-orange-400" />
            : <Crown className="w-3.5 h-3.5 text-purple-400" />
          }
          Select {isPro ? 'Pro' : 'Elite'} Member
        </p>

        {loadingMembers ? (
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading members…
          </div>
        ) : members.length === 0 ? (
          <p className="text-gray-500 text-sm">No {isPro ? 'Pro' : 'Elite'} members yet.</p>
        ) : (
          <div className="space-y-2">
            {members.map(m => (
              <button
                key={m.id}
                onClick={() => selectMember(m)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition text-left ${
                  selectedMember?.id === m.id
                    ? isPro
                      ? 'border-orange-500 bg-orange-500/10'
                      : 'border-purple-500 bg-purple-500/10'
                    : 'border-gray-700 bg-gray-700/30 hover:border-gray-600'
                }`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                  isPro ? 'bg-orange-500/20' : 'bg-purple-500/20'
                }`}>
                  <User className={`w-4 h-4 ${isPro ? 'text-orange-400' : 'text-purple-400'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm truncate">{m.name}</p>
                  <p className="text-gray-400 text-xs capitalize">
                    {m.target_goal?.replace('_', ' ')} · {m.age} yrs · {m.weight} kg
                  </p>
                </div>
                {isPro
                  ? <Zap className="w-4 h-4 text-orange-400 flex-shrink-0" />
                  : <Crown className="w-4 h-4 text-purple-400 flex-shrink-0" />
                }
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Everything below only shows after picking a member */}
      {selectedMember && (
        <>
          {loadingPlan ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className={`w-6 h-6 animate-spin ${isPro ? 'text-orange-400' : 'text-purple-400'}`} />
            </div>
          ) : (
            <>
              {/* ── Who you're building for ── */}
              <div className={`rounded-2xl p-4 bg-gradient-to-r ${
                isPro ? 'from-orange-600 to-orange-400' : 'from-purple-700 to-purple-400'
              } shadow-lg`}>
                <p className="text-white/70 text-xs mb-1">Building plan for</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-lg leading-tight">{selectedMember.name}</p>
                    <p className="text-white/70 text-xs capitalize">
                      {selectedMember.age} yrs · {selectedMember.height} cm · {selectedMember.weight} kg
                    </p>
                  </div>
                  {existingPlanId && (
                    <span className="ml-auto text-xs bg-white/20 text-white px-2 py-1 rounded-full font-semibold">
                      Editing existing plan
                    </span>
                  )}
                </div>
              </div>

              {/* ── Questionnaire answers ── */}
              {questionnaire ? (
                <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 space-y-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold flex items-center gap-2">
                    <ClipboardList className="w-3.5 h-3.5" /> Member&apos;s Questionnaire
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-gray-700/50 rounded-xl p-3">
                      <p className="text-gray-400 text-xs">Goal</p>
                      <p className="text-white font-semibold mt-0.5">
                        {GOAL_LABELS[questionnaire.goal] ?? questionnaire.goal}
                      </p>
                    </div>
                    <div className="bg-gray-700/50 rounded-xl p-3">
                      <p className="text-gray-400 text-xs">Fitness Level</p>
                      <p className="text-white font-semibold capitalize mt-0.5">{questionnaire.fitness_level}</p>
                    </div>
                    <div className="bg-gray-700/50 rounded-xl p-3">
                      <p className="text-gray-400 text-xs">Days / Week</p>
                      <p className="text-white font-semibold mt-0.5">{questionnaire.workout_days} days</p>
                    </div>
                    <div className="bg-gray-700/50 rounded-xl p-3">
                      <p className="text-gray-400 text-xs">Timeline</p>
                      <p className="text-white font-semibold mt-0.5">
                        {TIMELINE_LABELS[questionnaire.timeline] ?? questionnaire.timeline}
                      </p>
                    </div>
                    {questionnaire.health_issues && questionnaire.health_issues !== 'none' && (
                      <div className="col-span-2 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3">
                        <p className="text-yellow-400 text-xs font-semibold flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Health Issues
                        </p>
                        <p className="text-white text-sm mt-0.5 capitalize">{questionnaire.health_issues}</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 flex items-center gap-3">
                  <ClipboardList className="w-5 h-5 text-gray-500 flex-shrink-0" />
                  <p className="text-gray-400 text-sm">
                    This member hasn&apos;t filled in the questionnaire yet. You can still build them a plan manually.
                  </p>
                </div>
              )}

              {/* ── Plan title ── */}
              <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 space-y-3">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Plan Title</p>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500"
                  placeholder="e.g. 4-Week Strength Programme"
                />
              </div>

              {/* ── Coach notes ── */}
              <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 space-y-3">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Coach Notes (shown to member)</p>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  className="w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500 resize-none"
                  placeholder="Add any notes or instructions for the member…"
                />
              </div>

              {/* ── 4 Weeks ── */}
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
                            className={`bg-transparent text-xs focus:outline-none mt-0.5 w-full ${
                              isPro ? 'text-orange-400 focus:text-orange-300' : 'text-purple-400 focus:text-purple-300'
                            }`}
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
                                <div className="flex items-center gap-3">
                                  <span className="text-gray-400 text-xs w-16 flex-shrink-0">{daySchedule.day.slice(0, 3)}</span>
                                  <button
                                    onClick={() => toggleRest(wIdx, dIdx)}
                                    className={`text-xs px-2.5 py-1 rounded-full font-semibold transition ${
                                      w
                                        ? isPro
                                          ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
                                          : 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
                                        : 'bg-gray-700 text-gray-500 border border-gray-600'
                                    }`}
                                  >
                                    {w ? '💪 Workout' : '😴 Rest'}
                                  </button>
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

                                {/* Quick preview when collapsed */}
                                {w && !isExpanded && w.name && (
                                  <p className="text-gray-500 text-xs mt-1 pl-[76px] truncate">
                                    {w.emoji} {w.name} · {w.duration} min · {w.calories} cal
                                  </p>
                                )}

                                {/* Workout editor */}
                                {w && isExpanded && (
                                  <div className="mt-3 space-y-3 bg-gray-700/40 rounded-xl p-3">
                                    {/* Emoji picker */}
                                    <div className="flex flex-wrap gap-1.5">
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

                                    <input
                                      value={w.name}
                                      onChange={e => updateWorkout(wIdx, dIdx, { name: e.target.value })}
                                      placeholder="Workout name (e.g. Push Day)"
                                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
                                    />
                                    <input
                                      value={w.focus}
                                      onChange={e => updateWorkout(wIdx, dIdx, { focus: e.target.value })}
                                      placeholder="Focus area (e.g. Chest / Shoulders)"
                                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
                                    />
                                    <div className="grid grid-cols-2 gap-2">
                                      <div>
                                        <label className="text-xs text-gray-400 mb-1 block">Duration (min)</label>
                                        <input
                                          type="number"
                                          value={w.duration}
                                          onChange={e => updateWorkout(wIdx, dIdx, { duration: Number(e.target.value) })}
                                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-xs text-gray-400 mb-1 block">Est. Calories</label>
                                        <input
                                          type="number"
                                          value={w.calories}
                                          onChange={e => updateWorkout(wIdx, dIdx, { calories: Number(e.target.value) })}
                                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
                                        />
                                      </div>
                                    </div>
                                    <div>
                                      <label className="text-xs text-gray-400 mb-1 block">
                                        Exercises <span className="text-gray-600">(one per line)</span>
                                      </label>
                                      <textarea
                                        value={w.exercises.join('\n')}
                                        onChange={e => updateExercises(wIdx, dIdx, e.target.value)}
                                        rows={4}
                                        placeholder={"Bench Press 4×8\nIncline DB Press 3×10\nCable Fly 3×12"}
                                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500 resize-none font-mono"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-xs text-gray-400 mb-1 block">Health / Coach note (optional)</label>
                                      <input
                                        value={w.note ?? ''}
                                        onChange={e => updateWorkout(wIdx, dIdx, { note: e.target.value })}
                                        placeholder="e.g. Avoid heavy overhead press if shoulder pain"
                                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
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

              {/* Save button */}
              <button
                onClick={save}
                disabled={saving || !title.trim()}
                className={`w-full font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition active:scale-95 shadow-lg text-white disabled:opacity-40 bg-gradient-to-r ${
                  isPro
                    ? 'from-orange-600 to-orange-400 hover:from-orange-500 hover:to-orange-300 shadow-orange-500/20'
                    : 'from-purple-600 to-purple-400 hover:from-purple-500 hover:to-purple-300 shadow-purple-500/20'
                }`}
              >
                {saving
                  ? <><Loader2 className="w-5 h-5 animate-spin" /> Saving…</>
                  : saved
                  ? <><CheckCircle className="w-5 h-5" /> Plan Saved!</>
                  : <><Save className="w-5 h-5" /> Save Plan for {selectedMember.name.split(' ')[0]}</>
                }
              </button>
            </>
          )}
        </>
      )}
    </div>
  )
}
