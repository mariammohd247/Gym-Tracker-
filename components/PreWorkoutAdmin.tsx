'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { WorkoutType, MachineType, CardioUnit } from '@/lib/types'
import { calcCardioCalories, MACHINE_LABELS } from '@/lib/cardioCalories'
import {
  Plus, Trash2, Loader2, CheckCircle, ChevronDown, ChevronUp,
  Dumbbell, RotateCcw, Weight, Repeat, Activity, Save
} from 'lucide-react'

// ── Standard body weight used for calorie estimation on templates ──
const TEMPLATE_WEIGHT_KG = 70

const EMOJIS = ['💪', '🏃', '🔥', '⚡', '🦵', '🏋️', '🎯', '💥', '🧘', '🤸', '🚴', '🏊', '⛹️', '🤾']
const DIFFICULTIES = ['beginner', 'intermediate', 'advanced']

// ── Draft exercise types (mirrors CustomWorkoutBuilder) ───────────
interface StrengthDraft {
  exercise_type: 'strength'
  name: string
  reps: number
  rounds: number
  weight_kg: number
  estimated_calories: number
  calculating: boolean
  // DB id if already saved
  id?: string
}

interface CardioDraft {
  exercise_type: 'cardio'
  machine_type: MachineType
  duration_minutes: number
  speed: number
  incline: number
  machine_mode: 'run' | 'walk'
  machine_level: number
  cardio_unit: CardioUnit
  cardio_target: number
  estimated_calories: number
  calculating: boolean
  id?: string
}

type DraftExercise = StrengthDraft | CardioDraft

function defaultStrength(): StrengthDraft {
  return { exercise_type: 'strength', name: '', reps: 10, rounds: 3, weight_kg: 0, estimated_calories: 0, calculating: false }
}

function defaultCardio(machine_type: MachineType = 'treadmill'): CardioDraft {
  return {
    exercise_type: 'cardio', machine_type, duration_minutes: 20, speed: 8,
    incline: 0, machine_mode: 'run', machine_level: 5,
    cardio_unit: 'meters', cardio_target: 0, estimated_calories: 0, calculating: false,
  }
}

// ── Cardio card (same as CustomWorkoutBuilder) ────────────────────
function CardioCard({ ex, idx, onChange, onRemove, onCalcCalories }: {
  ex: CardioDraft; idx: number
  onChange: (idx: number, next: CardioDraft) => void
  onRemove: (idx: number) => void
  onCalcCalories: (idx: number) => void
}) {
  const [showMachineMenu, setShowMachineMenu] = useState(false)
  const isRowSki   = ex.machine_type === 'row' || ex.machine_type === 'ski'
  const isTreadmill = ex.machine_type === 'treadmill'
  const isStairs   = ex.machine_type === 'stairs'

  function update(patch: Partial<CardioDraft>) {
    const next = { ...ex, ...patch }
    const cals = calcCardioCalories({ ...next, userWeightKg: TEMPLATE_WEIGHT_KG })
    onChange(idx, { ...next, estimated_calories: cals })
  }

  const { label, emoji } = MACHINE_LABELS[ex.machine_type]

  return (
    <div className="bg-gray-800 border border-purple-700/40 rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 text-xs font-bold flex items-center justify-center flex-shrink-0">
          {idx + 1}
        </div>
        <div className="relative flex-1">
          <button type="button" onClick={() => setShowMachineMenu(v => !v)}
            className="w-full flex items-center gap-2 bg-gray-700 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 transition"
          >
            <span className="text-base">{emoji}</span>
            <span className="flex-1 text-left font-medium">{label}</span>
            <span className="text-xs text-purple-400 font-semibold uppercase tracking-wider">Cardio</span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>
          {showMachineMenu && (
            <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-gray-800 border border-gray-600 rounded-xl overflow-hidden shadow-xl">
              {(Object.entries(MACHINE_LABELS) as [MachineType, { label: string; emoji: string }][]).map(([key, val]) => (
                <button key={key} type="button"
                  onClick={() => {
                    const next = defaultCardio(key)
                    const cals = calcCardioCalories({ ...next, userWeightKg: TEMPLATE_WEIGHT_KG })
                    onChange(idx, { ...next, estimated_calories: cals })
                    setShowMachineMenu(false)
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition ${
                    ex.machine_type === key ? 'bg-purple-500/20 text-purple-300' : 'text-gray-200 hover:bg-gray-700'
                  }`}
                >
                  <span>{val.emoji}</span>{val.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <button onClick={() => onRemove(idx)} className="p-2 text-gray-500 hover:text-red-400 transition flex-shrink-0">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Row / Ski */}
      {isRowSki && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Unit</label>
            <div className="flex rounded-xl overflow-hidden border border-gray-600">
              {(['meters', 'calories'] as const).map(u => (
                <button key={u} type="button" onClick={() => update({ cardio_unit: u })}
                  className={`flex-1 py-2 text-xs font-semibold transition ${
                    ex.cardio_unit === u ? 'bg-purple-500 text-white' : 'bg-gray-700 text-gray-400 hover:text-white'
                  }`}
                >
                  {u === 'meters' ? 'Meters' : 'Calories'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">
              {ex.cardio_unit === 'meters' ? 'Distance (m)' : 'Target Cal'}
            </label>
            <input type="number" value={ex.cardio_target || ''} min={0}
              placeholder={ex.cardio_unit === 'meters' ? '2000' : '100'}
              onChange={e => update({ cardio_target: parseInt(e.target.value) || 0 })}
              onBlur={() => onCalcCalories(idx)}
              className="w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm text-center focus:outline-none focus:border-purple-500 transition"
            />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-gray-400 mb-1.5 block">Resistance Level (1–10)</label>
            <div className="flex items-center gap-3">
              <input type="range" min={1} max={10} value={ex.machine_level}
                onChange={e => update({ machine_level: parseInt(e.target.value) })}
                className="flex-1 accent-purple-500"
              />
              <span className="text-white font-bold w-6 text-center">{ex.machine_level}</span>
            </div>
          </div>
        </div>
      )}

      {/* Treadmill / Bike / Stairs */}
      {!isRowSki && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">Duration (min)</label>
              <input type="number" value={ex.duration_minutes} min={1} max={300}
                onChange={e => update({ duration_minutes: parseInt(e.target.value) || 1 })}
                onBlur={() => onCalcCalories(idx)}
                className="w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm text-center focus:outline-none focus:border-purple-500 transition"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">
                {isStairs ? 'Speed (steps/min)' : 'Speed (km/h)'}
              </label>
              <input type="number" value={ex.speed} min={0} step={0.5}
                onChange={e => update({ speed: parseFloat(e.target.value) || 0 })}
                onBlur={() => onCalcCalories(idx)}
                className="w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm text-center focus:outline-none focus:border-purple-500 transition"
              />
            </div>
          </div>
          {isTreadmill && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Mode</label>
                <div className="flex rounded-xl overflow-hidden border border-gray-600">
                  {(['run', 'walk'] as const).map(m => (
                    <button key={m} type="button" onClick={() => update({ machine_mode: m })}
                      className={`flex-1 py-2 text-xs font-semibold transition capitalize ${
                        ex.machine_mode === m ? 'bg-purple-500 text-white' : 'bg-gray-700 text-gray-400 hover:text-white'
                      }`}
                    >
                      {m === 'run' ? '🏃 Run' : '🚶 Walk'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Incline (%)</label>
                <input type="number" value={ex.incline} min={0} max={30} step={0.5}
                  onChange={e => update({ incline: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm text-center focus:outline-none focus:border-purple-500 transition"
                />
              </div>
            </div>
          )}
          {!isTreadmill && (
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">Resistance Level (1–20)</label>
              <div className="flex items-center gap-3">
                <input type="range" min={1} max={20} value={ex.machine_level}
                  onChange={e => update({ machine_level: parseInt(e.target.value) })}
                  className="flex-1 accent-purple-500"
                />
                <span className="text-white font-bold w-6 text-center">{ex.machine_level}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Calorie result */}
      <div className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm ${
        ex.estimated_calories > 0 ? 'bg-purple-500/10 border border-purple-500/20' : 'bg-gray-700/50'
      }`}>
        {ex.calculating ? (
          <span className="text-gray-400 flex items-center gap-2">
            <span className="inline-block w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
            Calculating…
          </span>
        ) : ex.estimated_calories > 0 ? (
          <>
            <span className="text-purple-300 font-medium">🔥 {ex.estimated_calories} cal (70 kg baseline)</span>
            <button onClick={() => onCalcCalories(idx)} className="text-xs text-gray-500 hover:text-purple-400 transition">Recalc</button>
          </>
        ) : (
          <span className="text-gray-500 text-xs">Fill in details above to estimate calories</span>
        )}
      </div>
    </div>
  )
}

// ── Strength card (same as CustomWorkoutBuilder) ──────────────────
function StrengthCard({ ex, idx, onChange, onRemove, onCalcCalories }: {
  ex: StrengthDraft; idx: number
  onChange: (idx: number, field: keyof StrengthDraft, value: string | number) => void
  onRemove: (idx: number) => void
  onCalcCalories: (idx: number) => void
}) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-orange-500/20 text-orange-400 text-xs font-bold flex items-center justify-center flex-shrink-0">
          {idx + 1}
        </div>
        <div className="flex-1 relative">
          <Dumbbell className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={ex.name}
            onChange={e => onChange(idx, 'name', e.target.value)}
            onBlur={() => { if (ex.name.trim()) onCalcCalories(idx) }}
            placeholder="Exercise name (e.g. Bench Press)"
            className="w-full bg-gray-700 border border-gray-600 rounded-xl pl-9 pr-4 py-2 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-orange-500 transition"
          />
        </div>
        <button onClick={() => onRemove(idx)} className="p-2 text-gray-500 hover:text-red-400 transition flex-shrink-0">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="flex items-center gap-1 text-xs text-gray-400 mb-1.5"><Repeat className="w-3 h-3" /> Reps</label>
          <input type="number" value={ex.reps} min={1} max={100}
            onChange={e => onChange(idx, 'reps', parseInt(e.target.value) || 1)}
            onBlur={() => { if (ex.name.trim()) onCalcCalories(idx) }}
            className="w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm text-center focus:outline-none focus:border-orange-500 transition"
          />
        </div>
        <div>
          <label className="flex items-center gap-1 text-xs text-gray-400 mb-1.5"><RotateCcw className="w-3 h-3" /> Sets</label>
          <input type="number" value={ex.rounds} min={1} max={20}
            onChange={e => onChange(idx, 'rounds', parseInt(e.target.value) || 1)}
            onBlur={() => { if (ex.name.trim()) onCalcCalories(idx) }}
            className="w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm text-center focus:outline-none focus:border-orange-500 transition"
          />
        </div>
        <div>
          <label className="flex items-center gap-1 text-xs text-gray-400 mb-1.5"><Weight className="w-3 h-3" /> kg</label>
          <input type="number" value={ex.weight_kg === 0 ? '' : ex.weight_kg} min={0} max={500} step={0.5}
            placeholder="BW"
            onChange={e => onChange(idx, 'weight_kg', parseFloat(e.target.value) || 0)}
            onBlur={() => { if (ex.name.trim()) onCalcCalories(idx) }}
            className="w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm text-center placeholder-gray-500 focus:outline-none focus:border-orange-500 transition"
          />
        </div>
      </div>

      <div className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm ${
        ex.estimated_calories > 0 ? 'bg-orange-500/10 border border-orange-500/20' : 'bg-gray-700/50'
      }`}>
        {ex.calculating ? (
          <span className="text-gray-400 flex items-center gap-2">
            <span className="inline-block w-3 h-3 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
            Calculating with AI…
          </span>
        ) : ex.estimated_calories > 0 ? (
          <>
            <span className="text-orange-300 font-medium">🔥 {ex.estimated_calories} cal (70 kg baseline)</span>
            <button onClick={() => onCalcCalories(idx)} className="text-xs text-gray-500 hover:text-orange-400 transition">Recalculate</button>
          </>
        ) : (
          <span className="text-gray-500 text-xs">Fill in details above to estimate calories</span>
        )}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────
export default function PreWorkoutAdmin() {
  const [workoutTypes, setWorkoutTypes] = useState<WorkoutType[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedType, setSelectedType] = useState<WorkoutType | null>(null)
  const [expandedType, setExpandedType] = useState<string | null>(null)
  const [exercises, setExercises] = useState<DraftExercise[]>([])
  const [loadingExercises, setLoadingExercises] = useState(false)
  const [savingExercises, setSavingExercises] = useState(false)
  const [savedExercises, setSavedExercises] = useState(false)

  // New workout type form
  const [newTypeName, setNewTypeName] = useState('')
  const [newTypeEmoji, setNewTypeEmoji] = useState('💪')
  const [newTypeDifficulty, setNewTypeDifficulty] = useState('intermediate')
  const [newTypeDuration, setNewTypeDuration] = useState(45)
  const [savingType, setSavingType] = useState(false)
  const [showNewTypeForm, setShowNewTypeForm] = useState(false)

  const loadTypes = useCallback(async () => {
    const { data } = await supabase.from('workout_types').select('*').order('name')
    setWorkoutTypes(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { loadTypes() }, [loadTypes])

  // ── Workout type CRUD ─────────────────────────────────────────
  async function addWorkoutType() {
    if (!newTypeName.trim()) return
    setSavingType(true)
    const slug = newTypeName.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
    const { data, error } = await supabase
      .from('workout_types')
      .insert({ name: newTypeName.trim(), slug, emoji: newTypeEmoji, difficulty: newTypeDifficulty, estimated_duration: newTypeDuration })
      .select().single()
    setSavingType(false)
    if (!error && data) {
      setWorkoutTypes(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      setNewTypeName('')
      setNewTypeEmoji('💪')
      setShowNewTypeForm(false)
    }
  }

  async function deleteWorkoutType(typeId: string) {
    if (!confirm('Delete this workout type and all its exercises?')) return
    await supabase.from('workout_types').delete().eq('id', typeId)
    setWorkoutTypes(prev => prev.filter(t => t.id !== typeId))
    if (selectedType?.id === typeId) { setSelectedType(null); setExpandedType(null); setExercises([]) }
  }

  // ── Load exercises for a type ─────────────────────────────────
  async function loadExercises(type: WorkoutType) {
    setSelectedType(type)
    setExpandedType(type.id)
    setLoadingExercises(true)
    const { data } = await supabase.from('exercises').select('*').eq('workout_type_id', type.id).order('order_index')
    const drafts: DraftExercise[] = (data ?? []).map((e: Record<string, unknown>) => {
      if (e.exercise_type === 'cardio') {
        return {
          id: e.id as string,
          exercise_type: 'cardio',
          machine_type: (e.machine_type ?? 'treadmill') as MachineType,
          duration_minutes: (e.duration_minutes as number) ?? 20,
          speed: (e.speed as number) ?? 8,
          incline: (e.incline as number) ?? 0,
          machine_mode: (e.machine_mode ?? 'run') as 'run' | 'walk',
          machine_level: (e.machine_level as number) ?? 5,
          cardio_unit: (e.cardio_unit ?? 'meters') as CardioUnit,
          cardio_target: (e.cardio_target as number) ?? 0,
          estimated_calories: (e.estimated_calories as number) ?? (e.base_calories as number) ?? 0,
          calculating: false,
        } as CardioDraft
      }
      return {
        id: e.id as string,
        exercise_type: 'strength',
        name: e.name as string,
        reps: (e.reps as number) ?? 10,
        rounds: (e.rounds as number) ?? 3,
        weight_kg: (e.weight_kg as number) ?? 0,
        estimated_calories: (e.estimated_calories as number) ?? (e.base_calories as number) ?? 0,
        calculating: false,
      } as StrengthDraft
    })
    setExercises(drafts)
    setLoadingExercises(false)
  }

  function collapseType() {
    setSelectedType(null)
    setExpandedType(null)
    setExercises([])
  }

  // ── Exercise state helpers ────────────────────────────────────
  function updateStrength(idx: number, field: keyof StrengthDraft, value: string | number) {
    setExercises(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } as StrengthDraft : e))
  }

  function updateCardio(idx: number, next: CardioDraft) {
    setExercises(prev => prev.map((e, i) => i === idx ? next : e))
  }

  function removeExercise(idx: number) {
    setExercises(prev => prev.filter((_, i) => i !== idx))
  }

  // ── Calorie calculation (uses same edge function) ─────────────
  async function calcStrengthCalories(idx: number) {
    const ex = exercises[idx] as StrengthDraft
    if (!ex.name.trim()) return
    setExercises(prev => prev.map((e, i) => i === idx ? { ...e, calculating: true } as StrengthDraft : e))
    try {
      const { data } = await supabase.functions.invoke('calculate-calories', {
        body: {
          type: 'strength',
          exerciseName: ex.name,
          weightKg: ex.weight_kg,
          reps: ex.reps,
          rounds: ex.rounds,
          userWeightKg: TEMPLATE_WEIGHT_KG,
        },
      })
      setExercises(prev => prev.map((e, i) => i === idx
        ? { ...e, estimated_calories: data?.calories ?? 0, calculating: false } as StrengthDraft : e))
    } catch {
      setExercises(prev => prev.map((e, i) => i === idx ? { ...e, calculating: false } as StrengthDraft : e))
    }
  }

  async function calcCardioCaloriesAI(idx: number) {
    const ex = exercises[idx] as CardioDraft
    setExercises(prev => prev.map((e, i) => i === idx ? { ...e, calculating: true } as CardioDraft : e))
    try {
      const { data } = await supabase.functions.invoke('calculate-calories', {
        body: {
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
          userWeightKg: TEMPLATE_WEIGHT_KG,
        },
      })
      setExercises(prev => prev.map((e, i) => i === idx
        ? { ...e, estimated_calories: data?.calories ?? (e as CardioDraft).estimated_calories, calculating: false } as CardioDraft : e))
    } catch {
      setExercises(prev => prev.map((e, i) => i === idx ? { ...e, calculating: false } as CardioDraft : e))
    }
  }

  // ── Save all exercises for the selected type ──────────────────
  async function saveAllExercises() {
    if (!selectedType) return
    setSavingExercises(true)

    // Delete all existing exercises for this type, then re-insert
    await supabase.from('exercises').delete().eq('workout_type_id', selectedType.id)

    const rows = exercises.map((ex, i) => {
      if (ex.exercise_type === 'cardio') {
        const c = ex as CardioDraft
        const name = MACHINE_LABELS[c.machine_type]?.label ?? c.machine_type
        return {
          workout_type_id: selectedType.id,
          name,
          exercise_type: 'cardio',
          base_calories: c.estimated_calories,
          estimated_calories: c.estimated_calories,
          duration_minutes: c.duration_minutes ?? 20,
          machine_type: c.machine_type,
          speed: c.speed,
          incline: c.incline,
          machine_mode: c.machine_mode,
          machine_level: c.machine_level,
          cardio_unit: c.cardio_unit,
          cardio_target: c.cardio_target,
          reps: 0,
          rounds: 0,
          weight_kg: 0,
          order_index: i,
        }
      }
      const s = ex as StrengthDraft
      return {
        workout_type_id: selectedType.id,
        name: s.name.trim() || 'Exercise',
        exercise_type: 'strength',
        base_calories: s.estimated_calories,
        estimated_calories: s.estimated_calories,
        duration_minutes: Math.max(1, Math.round((s.reps * s.rounds * 3) / 60)),
        reps: s.reps,
        rounds: s.rounds,
        weight_kg: s.weight_kg,
        machine_type: null,
        speed: null,
        incline: null,
        machine_mode: null,
        machine_level: null,
        cardio_unit: null,
        cardio_target: null,
        order_index: i,
      }
    })

    if (rows.length > 0) {
      await supabase.from('exercises').insert(rows)
    }

    setSavingExercises(false)
    setSavedExercises(true)
    setTimeout(() => setSavedExercises(false), 3000)
  }

  const totalCals = exercises.reduce((s, e) => s + (e.estimated_calories || 0), 0)

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="pb-28 space-y-5 px-4 pt-4">
      <div>
        <h2 className="text-white font-bold text-base">Pre-Workout Manager</h2>
        <p className="text-gray-500 text-xs mt-0.5">Create workout types with AI-calculated calories</p>
      </div>

      {/* Add new workout type */}
      <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden">
        <button onClick={() => setShowNewTypeForm(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3.5"
        >
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-orange-400" />
            <span className="text-white font-semibold text-sm">Add New Workout Type</span>
          </div>
          {showNewTypeForm ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>

        {showNewTypeForm && (
          <div className="border-t border-gray-700 p-4 space-y-3">
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">Pick an Emoji</label>
              <div className="flex flex-wrap gap-2">
                {EMOJIS.map(em => (
                  <button key={em} onClick={() => setNewTypeEmoji(em)}
                    className={`text-xl transition ${newTypeEmoji === em ? 'opacity-100 scale-125' : 'opacity-40 hover:opacity-80'}`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>
            <input value={newTypeName} onChange={e => setNewTypeName(e.target.value)}
              placeholder="Workout type name (e.g. Push Day)"
              className="w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500"
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Difficulty</label>
                <select value={newTypeDifficulty} onChange={e => setNewTypeDifficulty(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500"
                >
                  {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Est. Duration (min)</label>
                <input type="number" value={newTypeDuration} onChange={e => setNewTypeDuration(Number(e.target.value))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>
            <button onClick={addWorkoutType} disabled={savingType || !newTypeName.trim()}
              className="w-full bg-gradient-to-r from-orange-600 to-orange-400 hover:from-orange-500 hover:to-orange-300 disabled:opacity-40 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition active:scale-95"
            >
              {savingType ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {savingType ? 'Adding…' : 'Add Workout Type'}
            </button>
          </div>
        )}
      </div>

      {/* Workout type list */}
      {loading ? (
        <div className="flex items-center gap-2 text-gray-400 text-sm justify-center py-6">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      ) : workoutTypes.length === 0 ? (
        <div className="text-center py-8">
          <Dumbbell className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No workout types yet.</p>
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
                  <button onClick={() => isOpen ? collapseType() : loadExercises(type)}
                    className="text-xs text-orange-400 hover:text-orange-300 transition flex items-center gap-1"
                  >
                    {isOpen ? 'Close' : 'Edit exercises'}
                    {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                  <button onClick={() => deleteWorkoutType(type.id)}
                    className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Exercise editor */}
                {isOpen && (
                  <div className="border-t border-gray-700 p-4 space-y-4">
                    {loadingExercises ? (
                      <div className="flex items-center gap-2 text-gray-400 text-sm">
                        <Loader2 className="w-4 h-4 animate-spin" /> Loading exercises…
                      </div>
                    ) : (
                      <>
                        {/* Exercise cards */}
                        <div className="space-y-3">
                          {exercises.map((ex, idx) =>
                            ex.exercise_type === 'cardio' ? (
                              <CardioCard key={idx} ex={ex as CardioDraft} idx={idx}
                                onChange={updateCardio}
                                onRemove={removeExercise}
                                onCalcCalories={calcCardioCaloriesAI}
                              />
                            ) : (
                              <StrengthCard key={idx} ex={ex as StrengthDraft} idx={idx}
                                onChange={updateStrength}
                                onRemove={removeExercise}
                                onCalcCalories={calcStrengthCalories}
                              />
                            )
                          )}
                        </div>

                        {/* Add strength / cardio buttons */}
                        <div className="grid grid-cols-2 gap-2">
                          <button onClick={() => setExercises(prev => [...prev, defaultStrength()])}
                            className="border-2 border-dashed border-orange-500/40 hover:border-orange-500 rounded-2xl py-3 text-orange-400 hover:text-orange-300 transition flex items-center justify-center gap-1.5 text-sm font-medium"
                          >
                            <Plus className="w-4 h-4" /><Dumbbell className="w-4 h-4" /> Strength
                          </button>
                          <button onClick={() => setExercises(prev => [...prev, defaultCardio('treadmill')])}
                            className="border-2 border-dashed border-purple-500/40 hover:border-purple-500 rounded-2xl py-3 text-purple-400 hover:text-purple-300 transition flex items-center justify-center gap-1.5 text-sm font-medium"
                          >
                            <Plus className="w-4 h-4" /><Activity className="w-4 h-4" /> Cardio
                          </button>
                        </div>

                        {/* Total calories */}
                        {totalCals > 0 && (
                          <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl px-4 py-3 flex justify-between items-center">
                            <span className="text-orange-300 text-sm font-medium">Estimated total burn</span>
                            <span className="text-orange-400 font-bold text-lg">{totalCals} cal</span>
                          </div>
                        )}

                        {/* Save all button */}
                        <button onClick={saveAllExercises} disabled={savingExercises}
                          className="w-full bg-gradient-to-r from-orange-600 to-orange-400 hover:from-orange-500 hover:to-orange-300 disabled:opacity-40 text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition active:scale-95 shadow-lg shadow-orange-500/20"
                        >
                          {savingExercises
                            ? <><Loader2 className="w-5 h-5 animate-spin" /> Saving…</>
                            : savedExercises
                            ? <><CheckCircle className="w-5 h-5" /> Saved!</>
                            : <><Save className="w-5 h-5" /> Save All Exercises</>
                          }
                        </button>
                      </>
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
