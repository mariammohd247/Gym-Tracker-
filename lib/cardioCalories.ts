import { CardioUnit, MachineType } from './types'

export interface CardioParams {
  machine_type: MachineType
  duration_minutes?: number
  speed?: number
  incline?: number
  machine_mode?: 'run' | 'walk'
  machine_level?: number
  cardio_unit?: CardioUnit
  cardio_target?: number
  userWeightKg: number
}

export function calcCardioCalories(p: CardioParams): number {
  const { machine_type, userWeightKg } = p
  const level = p.machine_level ?? 5

  // Row / Ski — target-based
  if (machine_type === 'row' || machine_type === 'ski') {
    if (p.cardio_unit === 'calories' && p.cardio_target) {
      // User entered target calories directly; adjust for body weight vs 70 kg baseline
      return Math.round(p.cardio_target * (userWeightKg / 70))
    }
    // Distance in meters → calories
    const meters = p.cardio_target ?? 0
    // Concept2 empirical: ~1 kcal per 18–20 m rowing at moderate effort
    const mPerCal = machine_type === 'row' ? 18 : 16 // ski is slightly harder
    const levelMult = 1 + (level - 5) * 0.04 // level 1 = 84%, level 10 = 120%
    return Math.max(5, Math.round((meters / mPerCal) * levelMult * (userWeightKg / 70)))
  }

  const minutes = p.duration_minutes ?? 20
  const hours = minutes / 60
  let met: number

  if (machine_type === 'treadmill') {
    const speed = p.speed ?? 8 // km/h
    const incline = p.incline ?? 0
    if (p.machine_mode === 'walk' || speed <= 6) {
      // ACSM walking: MET ≈ 2.5 + 0.32 × speed(km/h) + 0.06 × speed × incline%
      met = 2.5 + 0.32 * speed + 0.06 * speed * incline
    } else {
      // ACSM running: MET ≈ 0.9 × speed(mph) + 3.5 + incline correction
      const speedMph = speed * 0.621
      met = 0.9 * speedMph + 3.5 + 0.045 * speedMph * incline
    }
  } else if (machine_type === 'bike') {
    const speed = p.speed ?? 20 // km/h
    // Compendium: cycling MET scales with speed
    if (speed < 16) met = 5.5
    else if (speed < 20) met = 8.0
    else if (speed < 25) met = 10.0
    else met = 12.0
    // Level adjusts ~10% per 2 levels from baseline 5
    met += (level - 5) * 0.3
  } else {
    // stairs
    const speed = p.speed ?? 70 // steps per minute
    // Stair climbing: ~0.15 MET per step/min, baseline at 60 spm = ~9 MET
    met = 4 + speed * 0.08
    met += (level - 5) * 0.3
  }

  return Math.max(5, Math.round(met * userWeightKg * hours))
}

export function cardioDisplayLabel(ex: {
  machine_type: MachineType | null
  machine_mode?: string | null
  duration_minutes?: number | null
  speed?: number | null
  incline?: number | null
  machine_level?: number | null
  cardio_unit?: CardioUnit | null
  cardio_target?: number | null
}): string {
  if (!ex.machine_type) return ''
  const parts: string[] = []

  if (ex.machine_type === 'row' || ex.machine_type === 'ski') {
    if (ex.cardio_target) {
      parts.push(`${ex.cardio_target} ${ex.cardio_unit === 'calories' ? 'cal target' : 'm'}`)
    }
    if (ex.machine_level) parts.push(`Level ${ex.machine_level}`)
  } else {
    if (ex.duration_minutes) parts.push(`${ex.duration_minutes} min`)
    if (ex.machine_mode) parts.push(ex.machine_mode)
    if (ex.speed) {
      parts.push(ex.machine_type === 'stairs' ? `${ex.speed} spm` : `${ex.speed} km/h`)
    }
    if (ex.incline) parts.push(`${ex.incline}% incline`)
    if (ex.machine_level && ex.machine_type !== 'treadmill') parts.push(`Level ${ex.machine_level}`)
  }

  return parts.join(' · ')
}

export const MACHINE_LABELS: Record<MachineType, { label: string; emoji: string }> = {
  treadmill: { label: 'Treadmill', emoji: '🏃' },
  bike:      { label: 'Bike',      emoji: '🚴' },
  stairs:    { label: 'Stairs',    emoji: '🪜' },
  row:       { label: 'Row',       emoji: '🚣' },
  ski:       { label: 'Ski Erg',   emoji: '⛷️' },
}
