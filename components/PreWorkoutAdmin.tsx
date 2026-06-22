'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { WorkoutType, Exercise } from '@/lib/types'
import {
  Plus, Trash2, Loader2, CheckCircle, ChevronDown, ChevronUp, Dumbbell
} from 'lucide-react'

const EMOJIS = ['💪', '🏃', '🔥', '⚡', '🦵', '🏋️', '🎯', '💥', '🧘', '🤸', '🚴', '🏊', '⛹️', '🤾', '🏇']
const DIFFICULTIES = ['beginner', 'intermediate', 'advanced']

interface ExerciseRow {
  id?: string
  name: string
  base_calories: number
  duration_minutes: number
  order_index: number
  isNew?: boolean
  saving?: boolean
  deleting?: boolean
}

export default function PreWorkoutAdmin() {
  const [workoutTypes, setWorkoutTypes] = useState<WorkoutType[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedType, setSelectedType] = useState<WorkoutType | null>(null)
  const [exercises, setExercises] = useState<ExerciseRow[]>([])
  const [loadingExercises, setLoadingExercises] = useState(false)
  const [expandedType, setExpandedType] = useState<string | null>(null)

  // New workout type form
  const [newTypeName, setNewTypeName] = useState('')
  const [newTypeEmoji, setNewTypeEmoji] = useState('💪')
  const [newTypeDifficulty, setNewTypeDifficulty] = useState('intermediate')
  const [newTypeDuration, setNewTypeDuration] = useState(45)
  const [savingType, setSavingType] = useState(false)
  const [savedType, setSavedType] = useState(false)
  const [showNewTypeForm, setShowNewTypeForm] = useState(false)

  const loadTypes = useCallback(async () => {
    const { data } = await supabase.from('workout_types').select('*').order('name')
    setWorkoutTypes(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { loadTypes() }, [loadTypes])

  async function loadExercises(type: WorkoutType) {
    setSelectedType(type)
    setExpandedType(type.id)
    setLoadingExercises(true)
    const { data } = await supabase
      .from('exercises')
      .select('*')
      .eq('workout_type_id', type.id)
      .order('order_index')
    setExercises((data ?? []).map((e: Exercise) => ({
      id: e.id,
      name: e.name,
      base_calories: e.base_calories,
      duration_minutes: e.duration_minutes,
      order_index: e.order_index,
    })))
    setLoadingExercises(false)
  }

  function collapseType() {
    setSelectedType(null)
    setExpandedType(null)
    setExercises([])
  }

  // ── Workout Type ────────────────────────────────────────────────
  async function addWorkoutType() {
    if (!newTypeName.trim()) return
    setSavingType(true)
    const slug = newTypeName.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
    const { data, error } = await supabase
      .from('workout_types')
      .insert({
        name: newTypeName.trim(),
        slug,
        emoji: newTypeEmoji,
        difficulty: newTypeDifficulty,
        estimated_duration: newTypeDuration,
      })
      .select()
      .single()
    setSavingType(false)
    if (!error && data) {
      setWorkoutTypes(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      setNewTypeName('')
      setNewTypeEmoji('💪')
      setNewTypeDifficulty('intermediate')
      setNewTypeDuration(45)
      setSavedType(true)
      setShowNewTypeForm(false)
      setTimeout(() => setSavedType(false), 2500)
    }
  }

  async function deleteWorkoutType(typeId: string) {
    if (!confirm('Delete this workout type and ALL its exercises?')) return
    await supabase.from('workout_types').delete().eq('id', typeId)
    setWorkoutTypes(prev => prev.filter(t => t.id !== typeId))
    if (selectedType?.id === typeId) collapseType()
  }

  // ── Exercises ───────────────────────────────────────────────────
  function addExerciseRow() {
    setExercises(prev => [
      ...prev,
      { name: '', base_calories: 50, duration_minutes: 5, order_index: prev.length, isNew: true },
    ])
  }

  function updateExerciseRow(idx: number, patch: Partial<ExerciseRow>) {
    setExercises(prev => prev.map((e, i) => i === idx ? { ...e, ...patch } : e))
  }

  async function saveExercise(idx: number) {
    const ex = exercises[idx]
    if (!ex.name.trim() || !selectedType) return
    updateExerciseRow(idx, { saving: true })

    const payload = {
      workout_type_id: selectedType.id,
      name: ex.name.trim(),
      base_calories: ex.base_calories,
      duration_minutes: ex.duration_minutes,
      order_index: ex.order_index,
    }

    if (ex.id) {
      await supabase.from('exercises').update(payload).eq('id', ex.id)
    } else {
      const { data } = await supabase.from('exercises').insert(payload).select().single()
      if (data) updateExerciseRow(idx, { id: data.id, isNew: false })
    }
    updateExerciseRow(idx, { saving: false, isNew: false })
  }

  async function deleteExercise(idx: number) {
    const ex = exercises[idx]
    if (ex.id) {
      updateExerciseRow(idx, { deleting: true })
      await supabase.from('exercises').delete().eq('id', ex.id)
    }
    setExercises(prev => prev.filter((_, i) => i !== idx))
  }

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div className="pb-28 space-y-5 px-4 pt-4">
      <div>
        <h2 className="text-white font-bold text-base">Pre-Workout Manager</h2>
        <p className="text-gray-500 text-xs mt-0.5">Add and manage workout types and their exercises</p>
      </div>

      {/* Add new workout type */}
      <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden">
        <button
          onClick={() => setShowNewTypeForm(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3.5"
        >
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-orange-400" />
            <span className="text-white font-semibold text-sm">Add New Workout Type</span>
          </div>
          {savedType && <CheckCircle className="w-4 h-4 text-green-400" />}
          {showNewTypeForm
            ? <ChevronUp className="w-4 h-4 text-gray-400" />
            : <ChevronDown className="w-4 h-4 text-gray-400" />
          }
        </button>

        {showNewTypeForm && (
          <div className="border-t border-gray-700 p-4 space-y-3">
            {/* Emoji picker */}
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">Pick an Emoji</label>
              <div className="flex flex-wrap gap-2">
                {EMOJIS.map(em => (
                  <button
                    key={em}
                    onClick={() => setNewTypeEmoji(em)}
                    className={`text-xl transition ${newTypeEmoji === em ? 'opacity-100 scale-125' : 'opacity-40 hover:opacity-80'}`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>

            <input
              value={newTypeName}
              onChange={e => setNewTypeName(e.target.value)}
              placeholder="Workout type name (e.g. Push Day)"
              className="w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500"
            />

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Difficulty</label>
                <select
                  value={newTypeDifficulty}
                  onChange={e => setNewTypeDifficulty(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500"
                >
                  {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Est. Duration (min)</label>
                <input
                  type="number"
                  value={newTypeDuration}
                  onChange={e => setNewTypeDuration(Number(e.target.value))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <button
              onClick={addWorkoutType}
              disabled={savingType || !newTypeName.trim()}
              className="w-full bg-gradient-to-r from-orange-600 to-orange-400 hover:from-orange-500 hover:to-orange-300 disabled:opacity-40 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition active:scale-95"
            >
              {savingType ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {savingType ? 'Adding…' : 'Add Workout Type'}
            </button>
          </div>
        )}
      </div>

      {/* Existing workout types */}
      {loading ? (
        <div className="flex items-center gap-2 text-gray-400 text-sm justify-center py-6">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading workout types…
        </div>
      ) : workoutTypes.length === 0 ? (
        <div className="text-center py-8">
          <Dumbbell className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No workout types yet. Add one above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
            Workout Types ({workoutTypes.length})
          </p>
          {workoutTypes.map(type => {
            const isOpen = expandedType === type.id

            return (
              <div key={type.id} className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden">
                {/* Type header */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className="text-2xl">{type.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm">{type.name}</p>
                    <p className="text-gray-400 text-xs capitalize">{(type as WorkoutType & { difficulty?: string }).difficulty ?? ''}</p>
                  </div>
                  <button
                    onClick={() => isOpen ? collapseType() : loadExercises(type)}
                    className="text-xs text-orange-400 hover:text-orange-300 transition flex items-center gap-1"
                  >
                    {isOpen ? 'Close' : 'Exercises'}
                    {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                  <button
                    onClick={() => deleteWorkoutType(type.id)}
                    className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Exercise list */}
                {isOpen && (
                  <div className="border-t border-gray-700">
                    {loadingExercises ? (
                      <div className="flex items-center gap-2 text-gray-400 text-sm p-4">
                        <Loader2 className="w-4 h-4 animate-spin" /> Loading exercises…
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-700/50">
                        {exercises.map((ex, idx) => (
                          <div key={idx} className="px-4 py-3 space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500 w-5 text-center">{idx + 1}</span>
                              <input
                                value={ex.name}
                                onChange={e => updateExerciseRow(idx, { name: e.target.value })}
                                placeholder="Exercise name"
                                className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-2.5 py-1.5 text-white text-sm focus:outline-none focus:border-orange-500"
                              />
                              <button
                                onClick={() => saveExercise(idx)}
                                disabled={ex.saving || !ex.name.trim()}
                                className="p-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 disabled:opacity-40 transition"
                              >
                                {ex.saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                onClick={() => deleteExercise(idx)}
                                disabled={ex.deleting}
                                className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 disabled:opacity-40 transition"
                              >
                                {ex.deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-2 pl-7">
                              <div>
                                <label className="text-[10px] text-gray-500 block mb-0.5">Base Calories</label>
                                <input
                                  type="number"
                                  value={ex.base_calories}
                                  onChange={e => updateExerciseRow(idx, { base_calories: Number(e.target.value) })}
                                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-orange-500"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-gray-500 block mb-0.5">Duration (min)</label>
                                <input
                                  type="number"
                                  value={ex.duration_minutes}
                                  onChange={e => updateExerciseRow(idx, { duration_minutes: Number(e.target.value) })}
                                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-orange-500"
                                />
                              </div>
                            </div>
                            {ex.isNew && (
                              <p className="text-xs text-yellow-400 pl-7">
                                ⚠️ Click ✓ to save this exercise
                              </p>
                            )}
                          </div>
                        ))}

                        {/* Add exercise row */}
                        <div className="p-4">
                          <button
                            onClick={addExerciseRow}
                            className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-600 hover:border-orange-500/50 text-gray-500 hover:text-orange-400 rounded-xl py-3 text-sm transition"
                          >
                            <Plus className="w-4 h-4" /> Add Exercise
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
