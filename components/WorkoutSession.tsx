'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Exercise, ExerciseWithState, UserProfile, WorkoutType } from '@/lib/types'
import { CheckCircle, Circle, ChevronUp, Flame, Dumbbell, Clock, Paperclip, X, FileText, Image, Loader2 } from 'lucide-react'
import SummaryModal from './SummaryModal'

interface Props {
  workoutType: WorkoutType
  profile: UserProfile
  onBack: () => void
}

function adjustCalories(base: number, weightKg: number): number {
  return Math.round(base * (weightKg / 70))
}

function fileIcon(type: string) {
  if (type.startsWith('image/')) return <Image className="w-4 h-4 text-blue-400" />
  return <FileText className="w-4 h-4 text-orange-400" />
}

export default function WorkoutSession({ workoutType, profile, onBack }: Props) {
  const [exercises, setExercises] = useState<ExerciseWithState[]>([])
  const [loading, setLoading] = useState(true)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [showSummary, setShowSummary] = useState(false)
  const [saving, setSaving] = useState(false)

  // Attachment / share state
  const [attachments, setAttachments] = useState<{ file: File; url: string; uploading: boolean; publicUrl?: string }[]>([])
  const [showShareWarning, setShowShareWarning] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return

    for (const file of files) {
      const localUrl = URL.createObjectURL(file)
      const idx = attachments.length
      setAttachments(prev => [...prev, { file, url: localUrl, uploading: true }])

      const path = `${workoutType.slug}/${Date.now()}-${file.name.replace(/\s+/g, '_')}`
      const { data, error } = await supabase.storage
        .from('preset-workout-attachments')
        .upload(path, file, { upsert: true })

      if (!error && data) {
        const { data: pub } = supabase.storage
          .from('preset-workout-attachments')
          .getPublicUrl(data.path)
        const publicUrl = pub.publicUrl
        setAttachments(prev =>
          prev.map((a, i) => i === idx ? { ...a, uploading: false, publicUrl } : a)
        )
        // Also insert into shared_images so it appears in the gallery
        if (sessionId && file.type.startsWith('image/')) {
          await supabase.from('shared_images').insert({
            user_profile_id: profile.id,
            session_id: sessionId,
            image_url: publicUrl,
          })
        }
      } else {
        setAttachments(prev => prev.map((a, i) => i === idx ? { ...a, uploading: false } : a))
      }
    }

    // Reset input so same file can be re-selected
    e.target.value = ''
  }

  function removeAttachment(idx: number) {
    setAttachments(prev => prev.filter((_, i) => i !== idx))
  }

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

    // Collect all uploaded attachment URLs
    const attachmentUrls = attachments
      .filter(a => a.publicUrl)
      .map(a => a.publicUrl!)
      .join(',')

    if (sessionId) {
      await supabase
        .from('workout_sessions')
        .update({
          total_calories_burned: caloriesBurned,
          completed_at: now,
          attachment_url: attachmentUrls || null,
        })
        .eq('id', sessionId)

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

        {/* ── Share Images ── */}
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-orange-400" />
              Share Images
            </h3>
            <button
              type="button"
              onClick={() => setShowShareWarning(true)}
              className="text-xs bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 px-3 py-1.5 rounded-lg transition font-medium"
            >
              + Share image
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,application/pdf,video/mp4,video/quicktime"
            className="hidden"
            onChange={handleFileChange}
          />

          {attachments.length === 0 ? (
            <button
              type="button"
              onClick={() => setShowShareWarning(true)}
              className="w-full border-2 border-dashed border-gray-600 hover:border-orange-500/50 rounded-xl py-6 flex flex-col items-center gap-2 transition group"
            >
              <Paperclip className="w-6 h-6 text-gray-500 group-hover:text-orange-400 transition" />
              <p className="text-gray-500 text-sm group-hover:text-gray-400 transition">
                Share images with the gym community
              </p>
            </button>
          ) : (
            <div className="space-y-2">
              {attachments.map((a, i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-700/50 rounded-xl px-3 py-2.5">
                  {a.uploading ? (
                    <Loader2 className="w-4 h-4 text-orange-400 animate-spin flex-shrink-0" />
                  ) : (
                    fileIcon(a.file.type)
                  )}
                  <div className="flex-1 min-w-0">
                    {a.file.type.startsWith('image/') && !a.uploading && (
                      <img
                        src={a.url}
                        alt={a.file.name}
                        className="w-full max-h-40 object-cover rounded-lg mb-2"
                      />
                    )}
                    <p className="text-sm text-gray-300 truncate">{a.file.name}</p>
                    <p className="text-xs text-gray-500">
                      {a.uploading ? 'Uploading…' : a.publicUrl ? '✓ Shared publicly' : 'Upload failed'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAttachment(i)}
                    className="text-gray-500 hover:text-red-400 transition flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={() => setShowShareWarning(true)}
                className="w-full border border-dashed border-gray-600 hover:border-orange-500/50 rounded-xl py-2 text-xs text-gray-500 hover:text-orange-400 transition"
              >
                + Share another image
              </button>
            </div>
          )}
        </div>

        {/* ── Share Warning Popup ── */}
        {showShareWarning && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl text-center">
              <div className="text-4xl mb-3">📢</div>
              <h3 className="text-white font-bold text-lg mb-2">Public Image</h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-5">
                This image will be <span className="text-orange-400 font-semibold">publicly visible</span> to all gym members in the Community Gallery. Make sure you&apos;re happy sharing it!
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowShareWarning(false)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-700 hover:bg-gray-600 text-gray-300 font-semibold text-sm transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { setShowShareWarning(false); fileInputRef.current?.click() }}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-orange-400 hover:from-orange-500 hover:to-orange-300 text-white font-semibold text-sm transition active:scale-95"
                >
                  Share Image
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Calorie burn banner */}
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
          disabled={saving || attachments.some(a => a.uploading)}
          className="w-full bg-gradient-to-r from-orange-600 to-orange-400 hover:from-orange-500 hover:to-orange-300 disabled:opacity-60 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 text-lg shadow-lg shadow-orange-500/20"
        >
          {saving ? (
            <>Saving workout...</>
          ) : attachments.some(a => a.uploading) ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Uploading files...</>
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
