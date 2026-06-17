'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { UserProfile } from '@/lib/types'
import { X, Calendar, CheckCircle, XCircle, Dumbbell, ChevronDown, ChevronUp, Paperclip, FileText } from 'lucide-react'

interface SessionRow {
  id: string
  date: string
  completed_at: string | null
  total_calories_burned: number
  attachment_url: string | null
  workout_type: { name: string; emoji: string } | null
  custom_plan: { name: string } | null
  exercises: { exercise_name: string; calories_burned: number; potential_calories: number; completed: boolean; weight_kg: number }[]
}

interface Props {
  profile: UserProfile
  defaultTab: 'workouts' | 'calories'
  onClose: () => void
}

export default function HistoryModal({ profile, defaultTab, onClose }: Props) {
  const [tab, setTab] = useState<'workouts' | 'calories'>(defaultTab)
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<string | null>(null)

  async function loadHistory() {
    const { data } = await supabase
      .from('workout_sessions')
      .select(`
        id, date, completed_at, total_calories_burned, attachment_url,
        workout_type:workout_types(name, emoji),
        custom_plan:custom_workout_plans(name),
        exercises:session_exercises(exercise_name, calories_burned, potential_calories, completed, weight_kg)
      `)
      .eq('user_profile_id', profile.id)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })

    if (data) setSessions(data as unknown as SessionRow[])
    setLoading(false)
  }

  useEffect(() => { loadHistory() }, [])

  const totalBurned = sessions.reduce((s, r) => s + r.total_calories_burned, 0)
  const totalPossible = sessions.reduce((s, r) =>
    s + r.exercises.reduce((a, e) => a + (e.potential_calories || 0), 0), 0
  )

  function getSessionName(s: SessionRow) {
    if (s.workout_type) return `${s.workout_type.emoji} ${s.workout_type.name}`
    if (s.custom_plan) return `✏️ ${s.custom_plan.name}`
    return '🏋️ Workout'
  }

  function getSessionTotal(s: SessionRow) {
    return s.exercises.reduce((a, e) => a + (e.potential_calories || 0), 0)
  }

  function getPct(s: SessionRow) {
    const total = getSessionTotal(s)
    return total > 0 ? Math.round((s.total_calories_burned / total) * 100) : 0
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric'
    })
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-gray-900 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg border border-gray-700 shadow-2xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-800 flex-shrink-0">
          <h2 className="text-xl font-bold text-white">Your Progress</h2>
          <button onClick={onClose} className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-5 pt-4 flex-shrink-0">
          {(['workouts', 'calories'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold capitalize transition ${
                tab === t
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {t === 'workouts' ? `🗓 Workouts` : `🔥 Calories`}
            </button>
          ))}
        </div>

        {/* Summary strip */}
        <div className="px-5 pt-4 flex-shrink-0">
          {tab === 'workouts' ? (
            <div className="bg-gray-800 rounded-2xl p-4 flex items-center justify-between">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{sessions.length}</div>
                <div className="text-xs text-gray-400 mt-0.5">Total Sessions</div>
              </div>
              <div className="h-10 w-px bg-gray-700" />
              <div className="text-center">
                <div className="text-2xl font-bold text-white">
                  {sessions.filter(s => getSessionTotal(s) > 0 && getPct(s) === 100).length}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">Full Completions</div>
              </div>
              <div className="h-10 w-px bg-gray-700" />
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-400">{totalBurned.toLocaleString()}</div>
                <div className="text-xs text-gray-400 mt-0.5">Cal Burned Total</div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-800 rounded-2xl p-4 space-y-3">
              <div className="flex justify-between items-end">
                <div>
                  <div className="text-3xl font-bold text-orange-400">{totalBurned.toLocaleString()}</div>
                  <div className="text-xs text-gray-400 mt-0.5">calories burned</div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-gray-300">{totalPossible.toLocaleString()}</div>
                  <div className="text-xs text-gray-500">total possible</div>
                </div>
              </div>
              {totalPossible > 0 && (
                <>
                  <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full transition-all"
                      style={{ width: `${Math.min(100, Math.round((totalBurned / totalPossible) * 100))}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 text-center">
                    You&apos;ve burned <span className="text-orange-400 font-semibold">{Math.round((totalBurned / totalPossible) * 100)}%</span> of all possible calories across {sessions.length} sessions
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Session list */}
        <div className="flex-1 overflow-y-auto px-5 pt-3 pb-6 space-y-2.5 mt-2">
          {loading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-800 rounded-2xl h-20 animate-pulse" />
            ))
          ) : sessions.length === 0 ? (
            <div className="text-center py-16">
              <Dumbbell className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">No workouts yet</p>
              <p className="text-gray-600 text-sm mt-1">Complete your first workout to see history here</p>
            </div>
          ) : (
            sessions.map(session => {
              const total = getSessionTotal(session)
              const pct = getPct(session)
              const isExpanded = expandedId === session.id
              const doneExs = session.exercises.filter(e => e.completed)
              const skippedExs = session.exercises.filter(e => !e.completed)

              return (
                <div key={session.id} className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden">
                  {/* Session row */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : session.id)}
                    className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-750 transition"
                  >
                    {/* Color dot based on completion */}
                    <div className={`w-2 h-10 rounded-full flex-shrink-0 ${
                      pct === 100 ? 'bg-green-400' : pct >= 70 ? 'bg-orange-400' : pct >= 40 ? 'bg-yellow-400' : 'bg-gray-500'
                    }`} />

                    <div className="flex-1 min-w-0">
                      <div className="text-white font-semibold text-sm truncate">{getSessionName(session)}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="w-3 h-3 text-gray-500" />
                        <span className="text-xs text-gray-400">{formatDate(session.date)}</span>
                        <span className="text-gray-600">·</span>
                        <span className="text-xs text-gray-400">{session.exercises.length} exercises</span>
                        {session.attachment_url && (
                          <>
                            <span className="text-gray-600">·</span>
                            <Paperclip className="w-3 h-3 text-orange-400" />
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex-shrink-0 text-right">
                      {/* "210 / 500 cal" */}
                      <div className="text-sm font-bold text-orange-400">
                        {session.total_calories_burned}
                        {total > 0 && <span className="text-gray-500 font-normal"> / {total}</span>}
                        <span className="text-gray-500 font-normal text-xs"> cal</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">{pct}% done</div>
                    </div>

                    {isExpanded
                      ? <ChevronUp className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      : <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    }
                  </button>

                  {/* Progress bar (always shown) */}
                  {total > 0 && (
                    <div className="px-4 pb-3 -mt-1">
                      <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            pct === 100 ? 'bg-green-400' : 'bg-orange-400'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Expanded attachments */}
                  {isExpanded && session.attachment_url && (
                    <div className="border-t border-gray-700 px-4 py-3">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1 mb-2">
                        <Paperclip className="w-3 h-3 text-orange-400" /> Attachments
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {session.attachment_url.split(',').map((url, i) => {
                          const isImage = /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url)
                          return isImage ? (
                            <button key={i} onClick={() => setLightbox(url)} className="w-full">
                              <img src={url} alt={`Attachment ${i + 1}`} className="w-full h-20 object-cover rounded-xl border border-gray-700 hover:border-orange-500 transition" />
                            </button>
                          ) : (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                              className="flex flex-col items-center justify-center h-20 bg-gray-700 rounded-xl border border-gray-600 hover:border-orange-500 transition gap-1">
                              <FileText className="w-6 h-6 text-orange-400" />
                              <span className="text-xs text-gray-400">View file</span>
                            </a>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Expanded exercise breakdown */}
                  {isExpanded && session.exercises.length > 0 && (
                    <div className="border-t border-gray-700 px-4 py-3 space-y-2">
                      {doneExs.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-green-400" /> Completed
                          </p>
                          {doneExs.map((ex, i) => (
                            <div key={i} className="flex justify-between items-center">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-green-400 text-xs">✓</span>
                                <span className="text-sm text-gray-300 truncate">{ex.exercise_name}</span>
                                {ex.weight_kg > 0 && (
                                  <span className="text-xs text-gray-500 flex-shrink-0">@ {ex.weight_kg}kg</span>
                                )}
                              </div>
                              <span className="text-xs text-green-400 font-semibold flex-shrink-0 ml-2">
                                -{ex.calories_burned} cal
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      {skippedExs.length > 0 && (
                        <div className="space-y-1.5 mt-2">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                            <XCircle className="w-3 h-3 text-gray-500" /> Skipped
                          </p>
                          {skippedExs.map((ex, i) => (
                            <div key={i} className="flex justify-between items-center">
                              <span className="text-sm text-gray-500 truncate">{ex.exercise_name}</span>
                              <span className="text-xs text-gray-600 flex-shrink-0 ml-2">
                                {ex.potential_calories > 0 ? `${ex.potential_calories} cal missed` : 'skipped'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <img
            src={lightbox}
            alt="Attachment"
            className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
