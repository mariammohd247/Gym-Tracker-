'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { CustomPlanExercise, CustomWorkoutPlan, MachineType, UserProfile } from '@/lib/types'
import { calcCardioCalories, MACHINE_LABELS } from '@/lib/cardioCalories'
import {
  Plus, Trash2, ChevronLeft, Save, Dumbbell, RotateCcw, Weight, Repeat, Activity,
  ChevronDown
} from 'lucide-react'

// ─── Draft types ────────────────────────────────────────────────────────────

interface StrengthDraft {
  exercise_type: 'strength'
  name: string
  reps: number
  rounds: number
  weight_kg: number
  estimated_calories: number
  calculating: boolean
}

interface CardioDraft {
  exercise_type: 'cardio'
  machine_type: MachineType
  duration_minutes: number
  speed: number
  incline: number
  machine_mode: 'run' | 'walk'
  machine_level: number
  cardio_unit: 'meters' | 'calories'
  cardio_target: number
  estimated_calories: number
  calculating: boolean
}

type DraftExercise = StrengthDraft | CardioDraft

interface Props {
  profile: UserProfile
  onSaved: (plan: CustomWorkoutPlan & { exercises: CustomPlanExercise[] }) => void
  onBack: () => void
}

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

// ─── Cardio card ────────────────────────────────────────────────────────────

function CardioCard({
  ex, idx, userWeightKg, onChange, onRemove
}: {
  ex: CardioDraft
  idx: number
  userWeightKg: number
  onChange: (idx: number, next: CardioDraft) => void
  onRemove: (idx: number) => void
}) {
  const [showMachineMenu, setShowMachineMenu] = useState(false)
  const isRowSki = ex.machine_type === 'row' || ex.machine_type === 'ski'
  const isTreadmill = ex.machine_type === 'treadmill'
  const isStairs = ex.machine_type === 'stairs'

  function update(patch: Partial<CardioDraft>) {
    const next = { ...ex, ...patch }
    const cals = calcCardioCalories({ ...next, userWeightKg })
    onChange(idx, { ...next, estimated_calories: cals })
  }

  const { label, emoji } = MACHINE_LABELS[ex.machine_type]

  return (
    <div className="bg-gray-800 border border-purple-700/40 rounded-2xl p-4 space-y-3">
      {/* Header row */}
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 text-xs font-bold flex items-center justify-center flex-shrink-0">
          {idx + 1}
        </div>

        {/* Machine selector */}
        <div className="relative flex-1">
          <button
            type="button"
            onClick={() => setShowMachineMenu(v => !v)}
            className="w-full flex items-center gap-2 bg-gray-700 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 transition"
          >
            <span className="text-base">{emoji}</span>
            <span className="flex-1 text-left font-medium">{label}</span>
            <span className="text-xs text-purple-400 font-semibold uppercase tracking-wider">Cardio</span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>
          {showMachineMenu && (
            <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-gray-750 border border-gray-600 rounded-xl overflow-hidden shadow-xl">
              {(Object.entries(MACHINE_LABELS) as [MachineType, { label: string; emoji: string }][]).map(([key, val]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    const next = defaultCardio(key)
                    const cals = calcCardioCalories({ ...next, userWeightKg })
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

      {/* ── Row / Ski fields ── */}
      {isRowSki && (
        <div className="grid grid-cols-2 gap-2">
          {/* Unit toggle */}
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Unit</label>
            <div className="flex rounded-xl overflow-hidden border border-gray-600">
              {(['meters', 'calories'] as const).map(u => (
                <button key={u} type="button"
                  onClick={() => update({ cardio_unit: u })}
                  className={`flex-1 py-2 text-xs font-semibold transition ${
                    ex.cardio_unit === u ? 'bg-purple-500 text-white' : 'bg-gray-700 text-gray-400 hover:text-white'
                  }`}
                >
                  {u === 'meters' ? 'Meters' : 'Calories'}
                </button>
              ))}
            </div>
          </div>
          {/* Target value */}
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">
              {ex.cardio_unit === 'meters' ? 'Distance (m)' : 'Target Cal'}
            </label>
            <input type="number" value={ex.cardio_target || ''} min={0}
              placeholder={ex.cardio_unit === 'meters' ? '2000' : '100'}
              onChange={e => update({ cardio_target: parseInt(e.target.value) || 0 })}
              className="w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm text-center focus:outline-none focus:border-purple-500 transition"
            />
          </div>
          {/* Level */}
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

      {/* ── Treadmill / Bike / Stairs fields ── */}
      {!isRowSki && (
        <div className="space-y-3">
          {/* Duration */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">Duration (min)</label>
              <input type="number" value={ex.duration_minutes} min={1} max={300}
                onChange={e => update({ duration_minutes: parseInt(e.target.value) || 1 })}
                className="w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm text-center focus:outline-none focus:border-purple-500 transition"
              />
            </div>

            {/* Speed */}
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">
                {isStairs ? 'Speed (steps/min)' : 'Speed (km/h)'}
              </label>
              <input type="number" value={ex.speed} min={0} step={0.5}
                onChange={e => update({ speed: parseFloat(e.target.value) || 0 })}
                className="w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm text-center focus:outline-none focus:border-purple-500 transition"
              />
            </div>
          </div>

          {/* Treadmill-only: mode + incline */}
          {isTreadmill && (
            <div className="grid grid-cols-2 gap-2">
              {/* Run / Walk mode */}
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Mode</label>
                <div className="flex rounded-xl overflow-hidden border border-gray-600">
                  {(['run', 'walk'] as const).map(m => (
                    <button key={m} type="button"
                      onClick={() => update({ machine_mode: m })}
                      className={`flex-1 py-2 text-xs font-semibold transition capitalize ${
                        ex.machine_mode === m ? 'bg-purple-500 text-white' : 'bg-gray-700 text-gray-400 hover:text-white'
                      }`}
                    >
                      {m === 'run' ? '🏃 Run' : '🚶 Walk'}
                    </button>
                  ))}
                </div>
              </div>
              {/* Incline */}
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Incline (%)</label>
                <input type="number" value={ex.incline} min={0} max={30} step={0.5}
                  onChange={e => update({ incline: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm text-center focus:outline-none focus:border-purple-500 transition"
                />
              </div>
            </div>
          )}

          {/* Bike / Stairs: level */}
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
        {ex.estimated_calories > 0
          ? <span className="text-purple-300 font-medium">🔥 {ex.estimated_calories} calories estimated</span>
          : <span className="text-gray-500 text-xs">Fill in details above to get calorie estimate</span>
        }
      </div>
    </div>
  )
}

// ─── Strength card ───────────────────────────────────────────────────────────

function StrengthCard({
  ex, idx, onChange, onRemove, onCalcCalories
}: {
  ex: StrengthDraft
  idx: number
  onChange: (idx: number, field: keyof StrengthDraft, value: string | number | boolean) => void
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
            className="w-full bg-gray-700 border border-gray-600 rounded-xl pl-9 pr-4 py-2 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
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
            className="w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm text-center focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
          />
        </div>
        <div>
          <label className="flex items-center gap-1 text-xs text-gray-400 mb-1.5"><RotateCcw className="w-3 h-3" /> Sets</label>
          <input type="number" value={ex.rounds} min={1} max={20}
            onChange={e => onChange(idx, 'rounds', parseInt(e.target.value) || 1)}
            onBlur={() => { if (ex.name.trim()) onCalcCalories(idx) }}
            className="w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm text-center focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
          />
        </div>
        <div>
          <label className="flex items-center gap-1 text-xs text-gray-400 mb-1.5"><Weight className="w-3 h-3" /> kg</label>
          <input type="number" value={ex.weight_kg === 0 ? '' : ex.weight_kg} min={0} max={500} step={0.5}
            placeholder="BW"
            onChange={e => onChange(idx, 'weight_kg', parseFloat(e.target.value) || 0)}
            onBlur={() => { if (ex.name.trim()) onCalcCalories(idx) }}
            className="w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm text-center placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
          />
        </div>
      </div>

      <div className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm ${ex.estimated_calories > 0 ? 'bg-orange-500/10 border border-orange-500/20' : 'bg-gray-700/50'}`}>
        {ex.calculating ? (
          <span className="text-gray-400 flex items-center gap-2">
            <span className="inline-block w-3 h-3 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
            Calculating...
          </span>
        ) : ex.estimated_calories > 0 ? (
          <>
            <span className="text-orange-300 font-medium">🔥 {ex.estimated_calories} calories estimated</span>
            <button onClick={() => onCalcCalories(idx)} className="text-xs text-gray-500 hover:text-orange-400 transition">
              Recalculate
            </button>
          </>
        ) : (
          <span className="text-gray-500 text-xs">Fill in details above to get calorie estimate</span>
        )}
      </div>
    </div>
  )
}

// ─── Main builder ────────────────────────────────────────────────────────────

export default function CustomWorkoutBuilder({ profile, onSaved, onBack }: Props) {
  const [planName, setPlanName] = useState('')
  const [exercises, setExercises] = useState<DraftExercise[]>([defaultStrength()])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function updateStrength(idx: number, field: keyof StrengthDraft, value: string | number | boolean) {
    setExercises(prev => prev.map((ex, i) => i === idx ? { ...ex, [field]: value } as StrengthDraft : ex))
  }

  function updateCardio(idx: number, next: CardioDraft) {
    setExercises(prev => prev.map((ex, i) => i === idx ? next : ex))
  }

  function removeExercise(idx: number) {
    if (exercises.length === 1) return
    setExercises(prev => prev.filter((_, i) => i !== idx))
  }

  async function calcStrengthCalories(idx: number) {
    const ex = exercises[idx] as StrengthDraft
    if (!ex.name.trim()) return
    setExercises(prev => prev.map((e, i) => i === idx ? { ...e, calculating: true } as StrengthDraft : e))
    try {
      const res = await fetch('/api/calculate-calories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exerciseName: ex.name, weightKg: ex.weight_kg, reps: ex.reps, rounds: ex.rounds, userWeightKg: profile.weight }),
      })
      const data = await res.json()
      setExercises(prev => prev.map((e, i) => i === idx ? { ...e, estimated_calories: data.calories ?? 0, calculating: false } as StrengthDraft : e))
    } catch {
      setExercises(prev => prev.map((e, i) => i === idx ? { ...e, calculating: false } as StrengthDraft : e))
    }
  }

  async function handleSave() {
    if (!planName.trim()) { setError('Give your workout a name.'); return }
    const valid = exercises.filter(e => e.exercise_type === 'cardio' || (e as StrengthDraft).name.trim())
    if (valid.length === 0) { setError('Add at least one exercise.'); return }
    setSaving(true); setError('')

    const { data: plan, error: planErr } = await supabase
      .from('custom_workout_plans')
      .insert({ user_profile_id: profile.id, name: planName.trim() })
      .select().single()

    if (planErr || !plan) { setError('Failed to save. Try again.'); setSaving(false); return }

    const rows = valid.map((ex, i) => {
      if (ex.exercise_type === 'cardio') {
        const c = ex as CardioDraft
        const name = MACHINE_LABELS[c.machine_type]?.label ?? c.machine_type
        return {
          plan_id: plan.id, name, exercise_type: 'cardio',
          reps: 0, rounds: 0, weight_kg: 0,
          machine_type: c.machine_type, duration_minutes: c.duration_minutes,
          speed: c.speed, incline: c.incline, machine_mode: c.machine_mode,
          machine_level: c.machine_level, cardio_unit: c.cardio_unit,
          cardio_target: c.cardio_target, estimated_calories: c.estimated_calories,
          order_index: i,
        }
      }
      const s = ex as StrengthDraft
      return {
        plan_id: plan.id, name: s.name.trim(), exercise_type: 'strength',
        reps: s.reps, rounds: s.rounds, weight_kg: s.weight_kg,
        machine_type: null, duration_minutes: null, speed: null, incline: null,
        machine_mode: null, machine_level: null, cardio_unit: null, cardio_target: null,
        estimated_calories: s.estimated_calories, order_index: i,
      }
    })

    const { data: savedExercises } = await supabase.from('custom_plan_exercises').insert(rows).select()
    onSaved({ ...plan, exercises: savedExercises ?? [] })
  }

  const totalEstimated = exercises.reduce((s, e) => s + (e.estimated_calories || 0), 0)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl bg-gray-700 hover:bg-gray-600 text-gray-300 transition">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-white">Build Your Workout</h2>
          <p className="text-gray-400 text-xs mt-0.5">Strength + cardio with AI calorie calculation</p>
        </div>
      </div>

      {/* Plan name */}
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">Workout Name</label>
        <input type="text" value={planName} onChange={e => setPlanName(e.target.value)}
          placeholder="e.g. My Power Hour, Monday Grind..."
          className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
        />
      </div>

      {/* Exercise list */}
      <div className="space-y-3">
        {exercises.map((ex, idx) =>
          ex.exercise_type === 'cardio' ? (
            <CardioCard key={idx} ex={ex as CardioDraft} idx={idx}
              userWeightKg={profile.weight}
              onChange={updateCardio}
              onRemove={removeExercise}
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

      {/* Add buttons */}
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

      {/* Total */}
      {totalEstimated > 0 && (
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl px-4 py-3 flex justify-between items-center">
          <span className="text-orange-300 text-sm font-medium">Estimated total burn</span>
          <span className="text-orange-400 font-bold text-lg">{totalEstimated} cal</span>
        </div>
      )}

      {error && <p className="text-red-400 text-sm bg-red-400/10 rounded-xl px-4 py-2">{error}</p>}

      <button onClick={handleSave} disabled={saving}
        className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95"
      >
        <Save className="w-5 h-5" />
        {saving ? 'Saving...' : 'Save Workout Plan'}
      </button>
    </div>
  )
}
