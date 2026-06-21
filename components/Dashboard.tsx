'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { CustomPlanExercise, CustomWorkoutPlan, UserProfile, WorkoutType } from '@/lib/types'
import WorkoutSession from './WorkoutSession'
import CustomWorkoutBuilder from './CustomWorkoutBuilder'
import CustomWorkoutSession from './CustomWorkoutSession'
import HistoryModal from './HistoryModal'
import { Flame, Calendar, Target, ChevronRight, LogOut, Trophy, Plus, Pencil, Dumbbell, Trash2, Sparkles, Crown, Zap } from 'lucide-react'
import SubscriptionModal from './SubscriptionModal'

interface Props {
  profile: UserProfile
  onLogout: () => void
}

const goalLabels: Record<string, string> = {
  lose_weight: '🔥 Lose Weight',
  gain_muscle: '💪 Gain Muscle',
  maintain: '⚖️ Maintain',
}

type View =
  | { type: 'dashboard' }
  | { type: 'preset'; workout: WorkoutType }
  | { type: 'builder' }
  | { type: 'custom-session'; plan: CustomWorkoutPlan }

export default function Dashboard({ profile, onLogout }: Props) {
  const [workoutTypes, setWorkoutTypes] = useState<WorkoutType[]>([])
  const [customPlans, setCustomPlans] = useState<(CustomWorkoutPlan & { exercises: CustomPlanExercise[] })[]>([])
  const [recentStats, setRecentStats] = useState({ sessions: 0, totalCals: 0 })
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>({ type: 'dashboard' })
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [historyModal, setHistoryModal] = useState<'workouts' | 'calories' | null>(null)
  const [showSubscription, setShowSubscription] = useState(false)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [typesRes, statsRes, plansRes] = await Promise.all([
      supabase.from('workout_types').select('*').order('name'),
      supabase
        .from('workout_sessions')
        .select('total_calories_burned')
        .eq('user_profile_id', profile.id)
        .not('completed_at', 'is', null),
      supabase
        .from('custom_workout_plans')
        .select('*, exercises:custom_plan_exercises(*)')
        .eq('user_profile_id', profile.id)
        .order('created_at', { ascending: false }),
    ])

    if (typesRes.data) setWorkoutTypes(typesRes.data)
    if (statsRes.data) {
      setRecentStats({
        sessions: statsRes.data.length,
        totalCals: statsRes.data.reduce((s: number, r: { total_calories_burned: number }) => s + r.total_calories_burned, 0),
      })
    }
    if (plansRes.data) setCustomPlans(plansRes.data)
    setLoading(false)
  }

  async function deletePlan(planId: string) {
    setDeletingId(planId)
    await supabase.from('custom_workout_plans').delete().eq('id', planId)
    setCustomPlans(prev => prev.filter(p => p.id !== planId))
    setDeletingId(null)
  }

  const backToDashboard = () => { setView({ type: 'dashboard' }); loadData() }

  if (view.type === 'preset') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
        <div className="max-w-lg mx-auto pt-6">
          <WorkoutSession workoutType={view.workout} profile={profile} onBack={backToDashboard} />
        </div>
      </div>
    )
  }

  if (view.type === 'builder') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
        <div className="max-w-lg mx-auto pt-6 pb-10">
          <CustomWorkoutBuilder
            profile={profile}
            onSaved={(plan) => { setView({ type: 'custom-session', plan }) }}
            onBack={backToDashboard}
          />
        </div>
      </div>
    )
  }

  if (view.type === 'custom-session') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
        <div className="max-w-lg mx-auto pt-6 pb-10">
          <CustomWorkoutSession plan={view.plan} profile={profile} onBack={backToDashboard} />
        </div>
      </div>
    )
  }

  const workoutColors: Record<string, string> = {
    legs: 'from-purple-600 to-purple-400',
    pull: 'from-blue-600 to-blue-400',
    push: 'from-green-600 to-green-400',
    upper: 'from-teal-600 to-teal-400',
    hiit: 'from-red-600 to-orange-400',
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
      <div className="max-w-lg mx-auto pt-6 pb-10 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              Hey, {profile.name.split(' ')[0]}! 👋
              {profile.subscription_plan === 'elite' && (
                <Crown className="w-5 h-5 text-purple-400" />
              )}
              {profile.subscription_plan === 'pro' && (
                <Zap className="w-5 h-5 text-orange-400" />
              )}
            </h1>
            <p className="text-gray-400 text-sm mt-0.5">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {profile.subscription_plan === 'free' && (
              <button
                onClick={() => setShowSubscription(true)}
                className="flex items-center gap-1.5 bg-gradient-to-r from-orange-600 to-orange-400 hover:from-orange-500 hover:to-orange-300 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition active:scale-95 shadow-md shadow-orange-500/20"
              >
                <Sparkles className="w-3.5 h-3.5" /> Upgrade
              </button>
            )}
            {profile.subscription_plan !== 'free' && (
              <button
                onClick={() => setShowSubscription(true)}
                className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition active:scale-95 ${
                  profile.subscription_plan === 'elite'
                    ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30'
                    : 'bg-orange-500/20 text-orange-300 hover:bg-orange-500/30'
                }`}
              >
                {profile.subscription_plan === 'elite'
                  ? <><Crown className="w-3.5 h-3.5" /> Elite</>
                  : <><Zap className="w-3.5 h-3.5" /> Pro</>
                }
              </button>
            )}
            <button
              onClick={onLogout}
              className="text-gray-500 hover:text-gray-300 transition p-2 rounded-lg hover:bg-gray-700"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => setHistoryModal('workouts')}
            className="bg-gray-800 border border-gray-700 hover:border-orange-500/50 rounded-xl p-3 text-center transition-all active:scale-95 group"
          >
            <Calendar className="w-5 h-5 text-orange-400 mx-auto mb-1 group-hover:scale-110 transition-transform" />
            <div className="text-xl font-bold text-white">{recentStats.sessions}</div>
            <div className="text-xs text-gray-400">Workouts</div>
          </button>
          <button
            onClick={() => setHistoryModal('calories')}
            className="bg-gray-800 border border-gray-700 hover:border-orange-500/50 rounded-xl p-3 text-center transition-all active:scale-95 group"
          >
            <Flame className="w-5 h-5 text-orange-400 mx-auto mb-1 group-hover:scale-110 transition-transform" />
            <div className="text-xl font-bold text-white">{recentStats.totalCals.toLocaleString()}</div>
            <div className="text-xs text-gray-400">Total Cal</div>
          </button>
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-3 text-center">
            <Target className="w-5 h-5 text-orange-400 mx-auto mb-1" />
            <div className="text-xs font-bold text-white leading-tight">{goalLabels[profile.target_goal]}</div>
            <div className="text-xs text-gray-400 mt-1">Goal</div>
          </div>
        </div>

        {/* Profile card */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center text-orange-400 font-bold text-lg flex-shrink-0">
            {profile.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white font-semibold truncate">{profile.name}</div>
            <div className="text-gray-400 text-xs mt-0.5">
              {profile.age}y • {profile.height}cm • {profile.weight}kg
            </div>
          </div>
          {recentStats.sessions >= 5 && <Trophy className="w-6 h-6 text-yellow-400 flex-shrink-0" />}
        </div>

        {/* ── Custom Workout Section ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-white">Your Custom Workouts</h2>
            <button
              onClick={() => setView({ type: 'builder' })}
              className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" /> Create Workout
            </button>
          </div>

          {loading ? (
            <div className="bg-gray-800 rounded-2xl h-16 animate-pulse border border-gray-700" />
          ) : customPlans.length === 0 ? (
            <button
              onClick={() => setView({ type: 'builder' })}
              className="w-full border-2 border-dashed border-purple-600/40 hover:border-purple-500 bg-purple-500/5 hover:bg-purple-500/10 rounded-2xl p-5 text-center transition group"
            >
              <Pencil className="w-6 h-6 text-purple-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-purple-300 font-semibold text-sm">Build Your Own Workout</p>
              <p className="text-gray-500 text-xs mt-1">Add exercises, set reps & weights — AI calculates your calories</p>
            </button>
          ) : (
            <div className="space-y-3">
              {customPlans.map(plan => {
                const totalCals = plan.exercises.reduce((s, e) => s + e.estimated_calories, 0)
                return (
                  <div key={plan.id} className="bg-gray-800 border border-gray-700 hover:border-purple-500/50 rounded-2xl overflow-hidden transition-all group">
                    <button
                      onClick={() => setView({ type: 'custom-session', plan })}
                      className="w-full flex items-center gap-4 p-4 text-left"
                    >
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-600 to-purple-400 flex items-center justify-center flex-shrink-0 shadow-lg">
                        <Dumbbell className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-semibold">{plan.name}</div>
                        <div className="text-gray-400 text-xs mt-0.5">
                          {plan.exercises.length} exercises
                          {totalCals > 0 && ` · ~${totalCals} cal`}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-purple-400 transition flex-shrink-0" />
                    </button>
                    <div className="px-4 pb-3 flex gap-2">
                      <button
                        onClick={() => setView({ type: 'builder' })}
                        className="text-xs text-gray-500 hover:text-purple-400 transition flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> New Plan
                      </button>
                      <span className="text-gray-700">·</span>
                      <button
                        onClick={() => deletePlan(plan.id)}
                        disabled={deletingId === plan.id}
                        className="text-xs text-gray-500 hover:text-red-400 transition flex items-center gap-1 disabled:opacity-50"
                      >
                        <Trash2 className="w-3 h-3" />
                        {deletingId === plan.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                )
              })}
              <button
                onClick={() => setView({ type: 'builder' })}
                className="w-full border border-dashed border-purple-600/40 hover:border-purple-500 rounded-2xl py-3 text-purple-400 hover:text-purple-300 transition text-sm font-medium flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Create Another Plan
              </button>
            </div>
          )}
        </div>

        {/* ── Pre-set Workouts ── */}
        <div>
          <h2 className="text-lg font-bold text-white mb-3">Pre-set Workouts</h2>
          <div className="space-y-3">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <div key={i} className="bg-gray-800 rounded-2xl h-20 animate-pulse border border-gray-700" />
              ))
            ) : (
              workoutTypes.map(wt => (
                <button
                  key={wt.id}
                  onClick={() => setView({ type: 'preset', workout: wt })}
                  className="w-full group relative overflow-hidden bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-orange-500/50 rounded-2xl p-4 flex items-center gap-4 text-left transition-all active:scale-[0.98]"
                >
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${workoutColors[wt.slug] ?? 'from-gray-600 to-gray-500'} flex items-center justify-center text-2xl flex-shrink-0 shadow-lg`}>
                    {wt.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-semibold text-base">{wt.name}</div>
                    <div className="text-gray-400 text-xs mt-0.5">Tap to start · 7 exercises</div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-orange-400 transition flex-shrink-0" />
                </button>
              ))
            )}
          </div>
        </div>

        {recentStats.sessions === 0 && (
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 text-center">
            <p className="text-orange-300 text-sm font-medium">💪 Ready for your first workout?</p>
            <p className="text-gray-400 text-xs mt-1">Choose a preset or build your own above!</p>
          </div>
        )}
      </div>

      {historyModal && (
        <HistoryModal
          profile={profile}
          defaultTab={historyModal}
          onClose={() => setHistoryModal(null)}
        />
      )}

      {showSubscription && (
        <SubscriptionModal
          profile={profile}
          onClose={() => setShowSubscription(false)}
        />
      )}
    </div>
  )
}
