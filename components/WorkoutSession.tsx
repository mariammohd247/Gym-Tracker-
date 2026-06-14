'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Exercise, ExerciseWithState, UserProfile, WorkoutType } from '@/lib/types'
import { CheckCircle, Circle, ChevronUp, Flame, Dumbbell, Clock } from 'lucide-react'
import SummaryModal from './SummaryModal'

interface Props {
  workoutType: WorkoutType
  profile: UserProfile
  onBack: () => void
}

function adjustCalories(base: number, weightKg: number): number {
  return Math.round(base * (weightKg / 70))
}

export default function WorkoutSession({ workoutType, profile, onBack }: Props) {
  const [exercises, setExercises] = useState<ExerciseWithState[]>([])
  const [loading, setLoading] = useState(true)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [showSummary, setShowSummary] = useState(false)
  const [saving, setSaving] = useState(false)

  const caloriesBurned = exercises.filter(e => e.completed).reduce((s, e) => s + e.adjusted_calories, 0)
  const totalCalories = exercises.reduce((s, e) => s + e.adjusted_calories, 0)
  const caloriesRemaining = totalCalories - caloriesBurned
  const completedCount = exercises.filter(e => e.completed).length

  async function loadExercises() {
    setLoading(true)
    const { data } = await supabase
      .from('exercises')
      .select('*')
      .eq('workout_type_id', workoutType.id)
      .order('order_index')

    if (data) {
      const withState: ExerciseWithState[] = data.map((ex: Exercise) => ({
        ...ex,
        adjusted_calories: adjustCalories(ex.base_calories, profile.weight),
        completed: false,
      }))
      setExercises(withState)
    }

    const { data: session } = await supabase
      .from('workout_sessions')
      .insert({
        user_profile_id: profile.id,
        workout_type_id: workoutType.id,
        date: new Date().toISOString().split('T')[0],
        total_calories_burned: 0,
      })
      .select()
      .single()

    if (session) setSessionId(session.id)
    setLoading(false)
  }

  useEffect(() => { loadExercises() }, [])

  async function toggleExercise(exerciseId: string) {
    setExercises(prev =>
      prev.map(ex =>
        ex.id === exerciseId ? { ...ex, completed: !ex.completed } : ex
      )
    )
  }

  async function handleDoneWorkout() {
    setSaving(true)
    const now = new Date().toISOString()

    if (sessionId) {
      // Update session total calories
      await supabase
        .from('workout_sessions')
        .update({
          total_calories_burned: caloriesBurned,
          completed_at: now,
        })
        .eq('id', sessionId)

      // Insert session exercises — store potential_calories for every exercise so history can show "X of Y cal"
      const sessionExercises = exercises.map(ex => ({
        session_id: sessionId,
        exercise_id: ex.id,
        exercise_name: ex.name,
        calories_burned: ex.completed ? ex.adjusted_calories : 0,
        potential_calories: ex.adjusted_calories,
        completed: ex.completed,
        completed_at: ex.completed ? now : null,
      }))

      await supabase.from('session_exercises').insert(sessionExercises)
    }

    setSaving(false)
    setShowSummary(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-bounce">{workoutType.emoji}</div>
          <p className="text-gray-400">Loading workout...</p>
        </div>
      </div>
    )
  }

  const progressPct = exercises.length ? (completedCount / exercises.length) * 100 : 0

  return (
    <>
      <div className="space-y-4">
        {/* Workout header */}
        <div className="bg-gradient-to-r from-orange-600 to-orange-400 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                {workoutType.emoji} {workoutType.name}
              </h2>
              <p className="text-orange-100 text-sm mt-0.5">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <button
              onClick={onBack}
              className="text-orange-100 hover:text-white text-sm underline underline-offset-2 transition"
            >
              ← Change
            </button>
          </div>

          {/* Calorie stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/20 rounded-xl p-3 text-center">
              <Flame className="w-5 h-5 text-white mx-auto mb-1" />
              <div className="text-xl font-bold text-white">{caloriesBurned}</div>
              <div className="text-xs text-orange-100">Burned</div>
            </div>
            <div className="bg-white/20 rounded-xl p-3 text-center">
              <Clock className="w-5 h-5 text-white mx-auto mb-1" />
              <div className="text-xl font-bold text-white">{caloriesRemaining}</div>
              <div className="text-xs text-orange-100">Remaining</div>
            </div>
            <div className="bg-white/20 rounded-xl p-3 text-center">
              <Dumbbell className="w-5 h-5 text-white mx-auto mb-1" />
              <div className="text-xl font-bold text-white">{totalCalories}</div>
              <div className="text-xs text-orange-100">Total Goal</div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-orange-100 mb-1">
              <span>{completedCount} / {exercises.length} exercises</span>
              <span>{Math.round(progressPct)}%</span>
            </div>
            <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Exercise checklist */}
        <div className="bg-gray-800 rounded-2xl overflow-hidden border border-gray-700">
          <div className="px-5 py-3 border-b border-gray-700">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Exercises</h3>
          </div>
          <div className="divide-y divide-gray-700">
            {exercises.map((ex) => (
              <button
                key={ex.id}
                onClick={() => toggleExercise(ex.id)}
                className={`w-full flex items-center gap-4 px-5 py-4 text-left transition-all ${
                  ex.completed
                    ? 'bg-green-500/10 hover:bg-green-500/15'
                    : 'hover:bg-gray-700/50'
                }`}
              >
                <div className="flex-shrink-0">
                  {ex.completed ? (
                    <CheckCircle className="w-6 h-6 text-green-400" />
                  ) : (
                    <Circle className="w-6 h-6 text-gray-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`font-medium ${ex.completed ? 'text-green-300 line-through decoration-green-500' : 'text-white'}`}>
                    {ex.name}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">~{ex.duration_minutes} min</div>
                </div>
                <div className="flex-shrink-0 text-right">
                  <div className={`text-sm font-semibold ${ex.completed ? 'text-green-400' : 'text-orange-400'}`}>
                    {ex.adjusted_calories} cal
                  </div>
                  {ex.completed && (
                    <div className="text-xs text-green-500 mt-0.5">✓ Done</div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Calorie burn animation */}
        {caloriesBurned > 0 && (
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 flex items-center gap-3">
            <Flame className="w-8 h-8 text-orange-400 flex-shrink-0" />
            <div>
              <p className="text-orange-300 font-semibold">
                You&apos;ve burned <span className="text-orange-400 text-lg">{caloriesBurned}</span> calories so far!
              </p>
              <p className="text-gray-400 text-sm">
                {caloriesRemaining > 0
                  ? `${caloriesRemaining} more calories to go — keep pushing!`
                  : 'You hit your calorie goal! Amazing work! 🎉'}
              </p>
            </div>
          </div>
        )}

        {/* Done button */}
        <button
          onClick={handleDoneWorkout}
          disabled={saving}
          className="w-full bg-gradient-to-r from-orange-600 to-orange-400 hover:from-orange-500 hover:to-orange-300 disabled:opacity-60 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 text-lg shadow-lg shadow-orange-500/20"
        >
          {saving ? (
            <>Saving workout...</>
          ) : (
            <>
              <ChevronUp className="w-5 h-5" />
              Done Workout
            </>
          )}
        </button>
      </div>

      {showSummary && (
        <SummaryModal
          workoutType={workoutType}
          exercises={exercises}
          totalCalories={totalCalories}
          caloriesBurned={caloriesBurned}
          profile={profile}
          onClose={() => {
            setShowSummary(false)
            onBack()
          }}
          onNewWorkout={() => {
            setShowSummary(false)
            onBack()
          }}
        />
      )}
    </>
  )
}
