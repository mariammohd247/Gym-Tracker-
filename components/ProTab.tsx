'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { UserProfile } from '@/lib/types'
import { generateMonthlyPlan, QuestionnaireAnswers, WeekPlan } from '@/lib/planGenerator'
import { Zap, Crown, Loader2, ChevronDown, ChevronUp, Lock, Flame, ClipboardList } from 'lucide-react'
import SubscriptionQuestionnaire from './SubscriptionQuestionnaire'

interface Props {
  profile: UserProfile
  onUpgrade: () => void
}

export default function ProTab({ profile, onUpgrade }: Props) {
  const plan = profile.subscription_plan

  // ── Not subscribed ────────────────────────────────────────────
  if (plan === 'free') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 pb-24 text-center">
        <div className="w-20 h-20 bg-orange-500/10 rounded-full flex items-center justify-center mb-5">
          <Lock className="w-9 h-9 text-orange-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Unlock Your Plan</h2>
        <p className="text-gray-400 text-sm leading-relaxed mb-6">
          Subscribe to <span className="text-orange-400 font-semibold">Pro</span> or{' '}
          <span className="text-purple-400 font-semibold">Elite</span> to get a personalised
          one-month workout plan built around your goals.
        </p>
        <button
          onClick={onUpgrade}
          className="bg-gradient-to-r from-orange-600 to-orange-400 hover:from-orange-500 hover:to-orange-300 text-white font-bold px-8 py-3.5 rounded-2xl transition active:scale-95 shadow-lg shadow-orange-500/20 flex items-center gap-2"
        >
          <Zap className="w-5 h-5" /> Upgrade to Pro
        </button>
      </div>
    )
  }

  return <PlanContent profile={profile} />
}

// ── Subscribed content ────────────────────────────────────────
function PlanContent({ profile }: { profile: UserProfile }) {
  const [questionnaire,     setQuestionnaire]     = useState<QuestionnaireAnswers | null>(null)
  const [weeklyPlan,        setWeeklyPlan]        = useState<WeekPlan[]>([])
  const [assignedPlanTitle, setAssignedPlanTitle] = useState<string | null>(null)
  const [assignedPlanNotes, setAssignedPlanNotes] = useState<string | null>(null)
  const [totalCalsBurned,   setTotalCals]         = useState(0)
  const [loading,           setLoading]           = useState(true)
  const [expandedWeek,      setExpandedWeek]      = useState<number>(1)
  const [showQuestionnaire, setShowQuestionnaire] = useState(false)

  const isPro   = profile.subscription_plan === 'pro'
  const isElite = profile.subscription_plan === 'elite'

  const load = useCallback(async () => {
    setLoading(true)

    // Base queries for everyone
    const baseQueries = Promise.all([
      supabase
        .from('subscription_questionnaire')
        .select('*')
        .eq('user_profile_id', profile.id)
        .maybeSingle(),
      supabase
        .from('workout_sessions')
        .select('total_calories_burned')
        .eq('user_profile_id', profile.id)
        .not('completed_at', 'is', null),
    ])

    // Elite: also check for a coach-assigned plan
    const eliteQuery = isElite
      ? supabase
          .from('elite_assigned_plans')
          .select('title, notes, plan_data')
          .eq('user_profile_id', profile.id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null })

    const [[qRes, statsRes], eliteRes] = await Promise.all([baseQueries, eliteQuery])

    // Coach-assigned plan takes priority over AI-generated for elite members
    if (eliteRes.data) {
      setAssignedPlanTitle(eliteRes.data.title as string)
      setAssignedPlanNotes((eliteRes.data.notes as string | null) ?? null)
      setWeeklyPlan(eliteRes.data.plan_data as WeekPlan[])
    } else if (qRes.data) {
      setQuestionnaire(qRes.data)
      setWeeklyPlan(generateMonthlyPlan(qRes.data))
    }

    if (statsRes.data) {
      setTotalCals(statsRes.data.reduce((s: number, r: { total_calories_burned: number }) => s + r.total_calories_burned, 0))
    }

    setLoading(false)
  }, [profile.id, isElite])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
      </div>
    )
  }

  return (
    <>
    <div className="pb-28 space-y-5 px-4 pt-4">
      {/* Plan badge */}
      <div className={`rounded-2xl p-5 bg-gradient-to-r ${isPro ? 'from-orange-600 to-orange-400' : 'from-purple-700 to-purple-400'} shadow-lg`}>
        <div className="flex items-center gap-3 mb-3">
          {isPro
            ? <Zap  className="w-7 h-7 text-white" />
            : <Crown className="w-7 h-7 text-white" />
          }
          <div className="flex-1 min-w-0">
            <h2 className="text-white text-xl font-bold">
              {assignedPlanTitle ?? `${isPro ? 'Pro' : 'Elite'} Plan`}
            </h2>
            <p className="text-white/70 text-xs">
              {assignedPlanTitle
                ? '👨‍💼 Coach-assigned plan'
                : `Personalised for ${profile.name.split(' ')[0]}`}
            </p>
          </div>
        </div>
        {/* Coach notes */}
        {assignedPlanNotes && (
          <div className="bg-white/15 rounded-xl px-3 py-2 mb-3 text-white/90 text-xs leading-relaxed">
            📋 {assignedPlanNotes}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/20 rounded-xl p-3 text-center">
            <div className="text-white font-bold text-xl">{totalCalsBurned.toLocaleString()}</div>
            <div className="text-white/70 text-xs flex items-center justify-center gap-1 mt-0.5">
              <Flame className="w-3 h-3" /> Total cal burned
            </div>
          </div>
          <div className="bg-white/20 rounded-xl p-3 text-center">
            <div className="text-white font-bold text-xl">4</div>
            <div className="text-white/70 text-xs mt-0.5">Week programme</div>
          </div>
        </div>
      </div>

      {/* No questionnaire yet — show CTA to fill it in now */}
      {!questionnaire && (
        <div className="bg-gray-800 border border-orange-500/40 rounded-2xl p-5 text-center space-y-3">
          <div className="w-14 h-14 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto">
            <ClipboardList className="w-7 h-7 text-orange-400" />
          </div>
          <div>
            <p className="text-white font-bold text-base">Build Your Personalised Plan</p>
            <p className="text-gray-400 text-sm mt-1">
              Answer 5 quick questions so we can generate your custom 4-week workout plan.
            </p>
          </div>
          <button
            onClick={() => setShowQuestionnaire(true)}
            className="w-full bg-gradient-to-r from-orange-600 to-orange-400 hover:from-orange-500 hover:to-orange-300 text-white font-bold py-3 rounded-xl transition active:scale-95 flex items-center justify-center gap-2"
          >
            <ClipboardList className="w-4 h-4" /> Start Questionnaire
          </button>
        </div>
      )}

      {/* Goal snapshot */}
      {questionnaire && (
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 grid grid-cols-2 gap-3 text-sm">
          {[
            { label: 'Goal',    value: questionnaire.goal.replace('_', ' ') },
            { label: 'Level',   value: questionnaire.fitness_level },
            { label: 'Days/wk', value: questionnaire.workout_days },
            { label: 'Timeline',value: questionnaire.timeline.replace('_', ' ') },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-700/50 rounded-xl p-2.5">
              <div className="text-gray-400 text-xs">{label}</div>
              <div className="text-white font-semibold capitalize mt-0.5">{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Elite exclusive */}
      {isElite && (
        <div className="bg-purple-900/30 border border-purple-500/40 rounded-2xl p-4 space-y-2">
          <h3 className="text-purple-300 font-bold flex items-center gap-2">
            <Crown className="w-4 h-4" /> Elite Exclusives
          </h3>
          {['Personal coach access', 'Custom meal plan', 'Weekly progress reports', '1-on-1 virtual sessions'].map(f => (
            <p key={f} className="text-gray-300 text-sm flex items-center gap-2">
              <span className="text-purple-400">✓</span> {f}
            </p>
          ))}
        </div>
      )}

      {/* Monthly plan */}
      {weeklyPlan.length > 0 && (
        <div>
          <h3 className="text-white font-bold text-base mb-3">Your 4-Week Plan</h3>
          <div className="space-y-3">
            {weeklyPlan.map(week => (
              <div key={week.weekNum} className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setExpandedWeek(expandedWeek === week.weekNum ? 0 : week.weekNum)}
                  className="w-full flex items-center justify-between p-4"
                >
                  <div className="text-left">
                    <div className="text-white font-bold">Week {week.weekNum}</div>
                    <div className="text-xs text-orange-400 mt-0.5">{week.theme}</div>
                  </div>
                  {expandedWeek === week.weekNum
                    ? <ChevronUp className="w-4 h-4 text-gray-400" />
                    : <ChevronDown className="w-4 h-4 text-gray-400" />
                  }
                </button>

                {expandedWeek === week.weekNum && (
                  <div className="border-t border-gray-700 divide-y divide-gray-700/50">
                    {week.schedule.map(({ day, workout }) => (
                      <div key={day} className={`px-4 py-3 ${workout ? '' : 'opacity-50'}`}>
                        {workout ? (
                          <div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{workout.emoji}</span>
                                <div>
                                  <div className="text-white text-sm font-semibold">{day} — {workout.name}</div>
                                  <div className="text-gray-400 text-xs">{workout.focus} · {workout.duration} min · ~{workout.calories} cal</div>
                                </div>
                              </div>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {workout.exercises.map(ex => (
                                <span key={ex} className="bg-gray-700 text-gray-300 text-[10px] px-2 py-0.5 rounded-full">{ex}</span>
                              ))}
                            </div>
                            {workout.note && (
                              <p className="text-xs text-yellow-400 mt-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-2 py-1">
                                {workout.note}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-gray-500 text-sm">
                            <span>😴</span> {day} — Rest Day
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>

      {/* Questionnaire modal — triggered from ProTab directly */}
      {showQuestionnaire && (
        <SubscriptionQuestionnaire
          profile={profile}
          onComplete={(answers) => {
            setQuestionnaire(answers)
            setWeeklyPlan(generateMonthlyPlan(answers))
            setShowQuestionnaire(false)
          }}
          onClose={() => setShowQuestionnaire(false)}
        />
      )}
    </>
  )
}
