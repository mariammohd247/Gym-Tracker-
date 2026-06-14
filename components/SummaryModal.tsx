'use client'

import { ExerciseWithState, UserProfile, WorkoutType } from '@/lib/types'
import { CheckCircle, XCircle, Flame, X, Trophy } from 'lucide-react'

interface Props {
  workoutType: WorkoutType
  exercises: ExerciseWithState[]
  totalCalories: number
  caloriesBurned: number
  profile: UserProfile
  onClose: () => void
  onNewWorkout: () => void
}

const motivationalMessages = {
  all_done: [
    "Absolutely crushed it! You're unstoppable! 🔥",
    "100% complete! That's what champions look like!",
    "BEAST MODE ACTIVATED! Perfect session!",
    "Nothing can stop you! Full send every time!",
  ],
  mostly_done: [
    "Great effort! Every rep counts — keep pushing!",
    "Strong session! A little more each day builds legends.",
    "Almost there! Your consistency is your superpower.",
    "Solid work! Progress over perfection, always.",
  ],
  half_done: [
    "Good start! Even half a workout beats zero. Show up again tomorrow!",
    "You got moving, and that matters. Build on this!",
    "Half the battle is showing up — you did that!",
    "Keep going! Every workout makes the next one easier.",
  ],
  low: [
    "Something is always better than nothing. Come back stronger!",
    "You started, and that's the hardest part. Keep it up!",
    "Rest days happen. Come back tomorrow with fire!",
  ],
}

function getMotivationalMessage(percentage: number): string {
  const msgs =
    percentage === 100
      ? motivationalMessages.all_done
      : percentage >= 70
      ? motivationalMessages.mostly_done
      : percentage >= 40
      ? motivationalMessages.half_done
      : motivationalMessages.low
  return msgs[Math.floor(Math.random() * msgs.length)]
}

export default function SummaryModal({
  workoutType,
  exercises,
  caloriesBurned,
  profile,
  onClose,
  onNewWorkout,
}: Props) {
  const done = exercises.filter(e => e.completed)
  const skipped = exercises.filter(e => !e.completed)
  const percentage = Math.round((done.length / exercises.length) * 100)
  const message = getMotivationalMessage(percentage)

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl border border-gray-700 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-orange-600 to-orange-400 rounded-t-2xl p-6 text-center">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="text-4xl mb-2">
            {percentage === 100 ? '🏆' : percentage >= 70 ? '💪' : percentage >= 40 ? '👊' : '🌱'}
          </div>
          <h2 className="text-2xl font-bold text-white">Workout Complete!</h2>
          <p className="text-orange-100 text-sm mt-1">{workoutType.emoji} {workoutType.name}</p>
        </div>

        <div className="p-6 space-y-5">
          {/* Calorie summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-orange-500/20 border border-orange-500/30 rounded-xl p-4 text-center">
              <Flame className="w-6 h-6 text-orange-400 mx-auto mb-1" />
              <div className="text-2xl font-bold text-orange-400">{caloriesBurned}</div>
              <div className="text-xs text-gray-400">Calories Burned</div>
            </div>
            <div className="bg-gray-700 rounded-xl p-4 text-center">
              <Trophy className="w-6 h-6 text-yellow-400 mx-auto mb-1" />
              <div className="text-2xl font-bold text-white">{percentage}%</div>
              <div className="text-xs text-gray-400">Completed</div>
            </div>
          </div>

          {/* Progress bar */}
          <div>
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>{done.length} done</span>
              <span>{skipped.length} skipped</span>
            </div>
            <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full transition-all"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>

          {/* Completed exercises */}
          {done.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-green-400" /> Completed
              </h3>
              <div className="space-y-1.5">
                {done.map(ex => (
                  <div key={ex.id} className="flex justify-between items-center bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
                    <span className="text-sm text-white">{ex.name}</span>
                    <span className="text-xs text-green-400 font-semibold">-{ex.adjusted_calories} cal</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skipped exercises */}
          {skipped.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-1.5">
                <XCircle className="w-4 h-4 text-red-400" /> Skipped
              </h3>
              <div className="space-y-1.5">
                {skipped.map(ex => (
                  <div key={ex.id} className="flex justify-between items-center bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2">
                    <span className="text-sm text-gray-400">{ex.name}</span>
                    <span className="text-xs text-gray-500">{ex.adjusted_calories} cal missed</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Motivational message */}
          <div className="bg-gradient-to-r from-orange-500/10 to-orange-400/5 border border-orange-500/20 rounded-xl p-4 text-center">
            <p className="text-orange-300 font-medium text-sm leading-relaxed">{message}</p>
            <p className="text-gray-500 text-xs mt-1">— Great job, {profile.name}! 🎉</p>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onClose}
              className="py-3 rounded-xl bg-gray-700 hover:bg-gray-600 text-white font-medium transition-all active:scale-95 text-sm"
            >
              View History
            </button>
            <button
              onClick={onNewWorkout}
              className="py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold transition-all active:scale-95 text-sm"
            >
              New Workout
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
