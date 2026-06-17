'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { CustomPlanExercise, CustomPlanExerciseWithState, CustomWorkoutPlan, UserProfile } from '@/lib/types'
import {
  CheckCircle, Circle, Flame, Weight, Dumbbell, RotateCcw, Repeat,
  ChevronUp, Loader2
} from 'lucide-react'
import { cardioDisplayLabel, MACHINE_LABELS } from '@/lib/cardioCalories'

interface Props {
  plan: CustomWorkoutPlan
  profile: UserProfile
  onBack: () => void
}

function CustomSummaryModal({
  plan, exercises, caloriesBurned, profile, onClose
}: {
  plan: CustomWorkoutPlan
  exercises: CustomPlanExerciseWithState[]
  caloriesBurned: number
  profile: UserProfile
  onClose: () => void
}) {
  const done = exercises.filter(e => e.completed)
  const skipped = exercises.filter(e => !e.completed)
  const pct = Math.round((done.length / exercises.length) * 100)

  const [msg] = useState(() => {
    const msgList = pct === 100
      ? ["Flawless execution! You absolutely crushed it! 🏆", "100% complete — that's elite level! 🔥"]
      : pct >= 70
      ? ["Solid session! Keep building on this!", "Strong effort — consistency is everything!"]
      : pct >= 40
      ? ["Good work! Every rep is progress. Keep coming back!", "Half-way hero — build on this momentum!"]
      : ["You showed up and that matters. Come back stronger!", "Starting is the hardest part — you did it!"]
    return msgList[Math.floor(Math.random() * msgList.length)]
  })

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl w-full max-w-md border border-gray-700 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-orange-600 to-orange-400 rounded-t-2xl p-6 text-center">
          <div className="text-4xl mb-2">{pct === 100 ? '🏆' : pct >= 70 ? '💪' : '👊'}</div>
          <h2 className="text-2xl font-bold text-white">Workout Complete!</h2>
          <p className="text-orange-100 text-sm mt-1">✏️ {plan.name}</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-orange-500/20 border border-orange-500/30 rounded-xl p-4 text-center">
              <Flame className="w-6 h-6 text-orange-400 mx-auto mb-1" />
              <div className="text-2xl font-bold text-orange-400">{caloriesBurned}</div>
              <div className="text-xs text-gray-400">Calories Burned</div>
            </div>
            <div className="bg-gray-700 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-white">{pct}%</div>
              <div className="text-xs text-gray-400">Completed</div>
            </div>
          </div>

          <div className="h-2.5 bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>

          {done.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-green-400" /> Completed
              </h3>
              <div className="space-y-1.5">
                {done.map(ex => (
                  <div key={ex.id} className="bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-white font-medium">{ex.name}</span>
                      <span className="text-xs text-green-400 font-semibold">-{ex.actual_calories} cal</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {ex.rounds} sets × {ex.reps} reps
                      {ex.actual_weight_kg > 0 ? ` @ ${ex.actual_weight_kg}kg` : ' (bodyweight)'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {skipped.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-1.5">
                <Circle className="w-4 h-4 text-red-400" /> Skipped
              </h3>
              <div className="space-y-1.5">
                {skipped.map(ex => (
                  <div key={ex.id} className="bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">{ex.name}</span>
                      <span className="text-xs text-gray-500">{ex.estimated_calories} cal missed</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 text-center">
            <p className="text-orange-300 font-medium text-sm">{msg}</p>
            <p className="text-gray-500 text-xs mt-1">— Keep going, {profile.name}! 🎉</p>
          </div>

          <button
            onClick={onClose}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition active:scale-95"
          >
            Back to Homepage
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CustomWorkoutSession({ plan, profile, onBack }: Props) {
  const [exercises, setExercises] = useState<CustomPlanExerciseWithState[]>([])
  const [loading, setLoading] = useState(true)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [showSummary, setShowSummary] = useState(false)
  const [saving, setSaving] = useState(false)

  const caloriesBurned = exercises.filter(e => e.completed).reduce((s, e) => s + e.actual_calories, 0)
  const totalEstimated = exercises.reduce((s, e) => s + e.estimated_calories, 0)
  const completedCount = exercises.filter(e => e.completed).length

  async function loadExercises() {
    const { data } = await supabase
      .from('custom_plan_exercises')
      .select('*')
      .eq('plan_id', plan.id)
      .order('order_index')

    if (data) {
      setExercises(data.map((ex: CustomPlanExercise) => ({
        ...ex,
        completed: false,
        actual_weight_kg: ex.weight_kg,
        actual_calories: ex.estimated_calories,
        calculating: false,
      })))
    }

    const { data: session } = await supabase
      .from('workout_sessions')
      .insert({
        user_profile_id: profile.id,
        workout_type_id: null,
        custom_plan_id: plan.id,
        date: new Date().toISOString().split('T')[0],
        total_calories_burned: 0,
      })
      .select()
      .single()

    if (session) setSessionId(session.id)
    setLoading(false)
  }

  useEffect(() => { loadExercises() }, [])

  async function recalcCalories(idx: number) {
    const ex = exercises[idx]
    setExercises(prev => prev.map((e, i) => i === idx ? { ...e, calculating: true } : e))

    try {
      const body = ex.exercise_type === 'cardio'
        ? {
            type: 'cardio',
            machineType: ex.machine_type,
            durationMinutes: ex.duration_minutes,
            speed: ex.speed,
            meters: ex.cardio_unit === 'meters' ? ex.cardio_target : null,
            incline: ex.incline,
            machineMode: ex.machine_mode,
            machineLevel: ex.machine_level,
            cardioUnit: ex.cardio_unit,
            cardioTarget: ex.cardio_target,
            userWeightKg: profile.weight,
          }
        : {
            type: 'strength',
            exerciseName: ex.name,
            weightKg: ex.actual_weight_kg,
            reps: ex.reps,
            rounds: ex.rounds,
            userWeightKg: profile.weight,
          }

      const { data } = await supabase.functions.invoke('calculate-calories', { body })
      setExercises(prev =>
        prev.map((e, i) => i === idx ? { ...e, actual_calories: data?.calories ?? e.estimated_calories, calculating: false } : e)
      )
    } catch {
      setExercises(prev => prev.map((e, i) => i === idx ? { ...e, calculating: false } : e))
    }
  }

  function updateWeight(idx: number, value: number) {
    setExercises(prev => prev.map((e, i) => i === idx ? { ...e, actual_weight_kg: value } : e))
  }

  function toggleComplete(idx: number) {
    const ex = exercises[idx]
    // When marking complete, recalc with current actual weight
    if (!ex.completed) {
      setExercises(prev => prev.map((e, i) => i === idx ? { ...e, completed: true } : e))
      recalcCalories(idx)
    } else {
      setExercises(prev => prev.map((e, i) => i === idx ? { ...e, completed: false } : e))
    }
  }

  async function handleDoneWorkout() {
    setSaving(true)
    const now = new Date().toISOString()

    if (sessionId) {
      await supabase.from('workout_sessions').update({
        total_calories_burned: caloriesBurned,
        completed_at: now,
      }).eq('id', sessionId)

      await supabase.from('session_exercises').insert(
        exercises.map(ex => ({
          session_id: sessionId,
          exercise_id: null,
          exercise_name: ex.name,
          calories_burned: ex.completed ? ex.actual_calories : 0,
          potential_calories: ex.actual_calories || ex.estimated_calories,
          completed: ex.completed,
          weight_kg: ex.actual_weight_kg,
          completed_at: ex.completed ? now : null,
        }))
      )
    }

    setSaving(false)
    setShowSummary(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-bounce">✏️</div>
          <p className="text-gray-400">Loading your workout...</p>
        </div>
      </div>
    )
  }

  const progressPct = exercises.length ? (completedCount / exercises.length) * 100 : 0

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-400 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-white">✏️ {plan.name}</h2>
              <p className="text-purple-100 text-sm mt-0.5">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <button onClick={onBack} className="text-purple-100 hover:text-white text-sm underline underline-offset-2 transition">
              ← Change
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/20 rounded-xl p-3 text-center">
              <Flame className="w-5 h-5 text-white mx-auto mb-1" />
              <div className="text-xl font-bold text-white">{caloriesBurned}</div>
              <div className="text-xs text-purple-100">Burned</div>
            </div>
            <div className="bg-white/20 rounded-xl p-3 text-center">
              <Dumbbell className="w-5 h-5 text-white mx-auto mb-1" />
              <div className="text-xl font-bold text-white">{totalEstimated - caloriesBurned}</div>
              <div className="text-xs text-purple-100">Remaining</div>
            </div>
            <div className="bg-white/20 rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-white">{totalEstimated}</div>
              <div className="text-xs text-purple-100">Total Goal</div>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex justify-between text-xs text-purple-100 mb-1">
              <span>{completedCount} / {exercises.length} exercises</span>
              <span>{Math.round(progressPct)}%</span>
            </div>
            <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        </div>

        {/* Exercise list */}
        <div className="space-y-3">
          {exercises.map((ex, idx) => {
            const isCardio = ex.exercise_type === 'cardio'
            const machineInfo = isCardio && ex.machine_type ? MACHINE_LABELS[ex.machine_type] : null
            const cardioDetail = isCardio ? cardioDisplayLabel(ex) : ''

            return (
              <div
                key={ex.id}
                className={`bg-gray-800 border rounded-2xl overflow-hidden transition-all ${
                  ex.completed ? 'border-green-500/40' : isCardio ? 'border-purple-700/40' : 'border-gray-700'
                }`}
              >
                {/* Main row */}
                <button
                  onClick={() => toggleComplete(idx)}
                  className={`w-full flex items-start gap-3 p-4 text-left transition-all ${
                    ex.completed ? 'bg-green-500/10' : 'hover:bg-gray-750'
                  }`}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {ex.completed
                      ? <CheckCircle className="w-6 h-6 text-green-400" />
                      : <Circle className={`w-6 h-6 ${isCardio ? 'text-purple-400' : 'text-gray-500'}`} />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {machineInfo && <span className="text-base leading-none">{machineInfo.emoji}</span>}
                      <span className={`font-semibold text-base ${ex.completed ? 'text-green-300 line-through' : 'text-white'}`}>
                        {ex.name}
                      </span>
                      {isCardio && (
                        <span className="text-xs text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded font-medium">Cardio</span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-gray-400">
                      {isCardio ? (
                        cardioDetail && <span>{cardioDetail}</span>
                      ) : (
                        <span className="flex items-center gap-3">
                          <span className="flex items-center gap-1"><RotateCcw className="w-3 h-3" />{ex.rounds} sets</span>
                          <span className="flex items-center gap-1"><Repeat className="w-3 h-3" />{ex.reps} reps</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    {ex.calculating
                      ? <Loader2 className="w-5 h-5 text-orange-400 animate-spin" />
                      : <div className={`text-sm font-bold ${ex.completed ? 'text-green-400' : isCardio ? 'text-purple-400' : 'text-orange-400'}`}>
                          {ex.actual_calories} cal
                        </div>
                    }
                  </div>
                </button>

                {/* Weight input — strength only */}
                {!isCardio && (
                  <div className="px-4 pb-4 flex items-center gap-3">
                    <Weight className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="number"
                        value={ex.actual_weight_kg === 0 ? '' : ex.actual_weight_kg}
                        min={0} max={500} step={0.5}
                        placeholder="0"
                        onChange={e => updateWeight(idx, parseFloat(e.target.value) || 0)}
                        onBlur={() => { if (ex.actual_weight_kg !== ex.weight_kg || ex.completed) recalcCalories(idx) }}
                        className="w-24 bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm text-center focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
                      />
                      <span className="text-gray-400 text-sm">kg lifted</span>
                      {ex.actual_weight_kg === 0 && <span className="text-xs text-gray-500">(bodyweight)</span>}
                    </div>
                    {ex.completed && !ex.calculating && (
                      <button onClick={e => { e.stopPropagation(); recalcCalories(idx) }}
                        className="text-xs text-purple-400 hover:text-purple-300 transition">
                        Recalc
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Burn banner */}
        {caloriesBurned > 0 && (
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 flex items-center gap-3">
            <Flame className="w-8 h-8 text-orange-400 flex-shrink-0" />
            <div>
              <p className="text-orange-300 font-semibold">
                <span className="text-orange-400 text-lg">{caloriesBurned}</span> calories burned so far!
              </p>
              <p className="text-gray-400 text-sm">
                {totalEstimated - caloriesBurned > 0
                  ? `${totalEstimated - caloriesBurned} more to reach your goal!`
                  : 'You hit your calorie goal! 🎉'}
              </p>
            </div>
          </div>
        )}

        <button
          onClick={handleDoneWorkout}
          disabled={saving}
          className="w-full bg-gradient-to-r from-purple-600 to-purple-400 hover:from-purple-500 hover:to-purple-300 disabled:opacity-60 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 text-lg shadow-lg shadow-purple-500/20"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <ChevronUp className="w-5 h-5" />}
          {saving ? 'Saving...' : 'Done Workout'}
        </button>
      </div>

      {showSummary && (
        <CustomSummaryModal
          plan={plan}
          exercises={exercises}
          caloriesBurned={caloriesBurned}
          profile={profile}
          onClose={() => { setShowSummary(false); onBack() }}
        />
      )}
    </>
  )
}
