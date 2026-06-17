import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { exerciseName, weightKg, reps, rounds, userWeightKg } = await req.json()

  if (!exerciseName || reps == null || rounds == null) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const calories = metBasedCalories(exerciseName, weightKg, reps, rounds, userWeightKg)
  return NextResponse.json({ calories })
}

// MET-based calorie calculation (ACSM / Compendium of Physical Activities)
function metBasedCalories(
  exerciseName: string,
  weightKg: number,
  reps: number,
  rounds: number,
  userWeightKg: number
): number {
  const name = exerciseName.toLowerCase()

  let met = 3.5 // default: light strength training
  if (/deadlift|squat|clean|snatch|thruster/i.test(name)) met = 6.0
  else if (/bench|row|press|pull.?up|chin.?up/i.test(name)) met = 5.0
  else if (/lunge|leg.?press|rdl|romanian/i.test(name)) met = 5.0
  else if (/curl|extension|fly|raise|pushdown/i.test(name)) met = 3.5
  else if (/burpee|jump|sprint|hiit|box/i.test(name)) met = 8.0

  if (weightKg > 0) {
    const relativeLoad = weightKg / userWeightKg
    if (relativeLoad > 1.0) met *= 1.2
    else if (relativeLoad > 0.5) met *= 1.1
  }

  const activeSeconds = reps * rounds * 3
  const restSeconds = (rounds - 1) * 75
  const totalMinutes = (activeSeconds + restSeconds) / 60

  const kcal = met * userWeightKg * (totalMinutes / 60)
  return Math.max(10, Math.round(kcal))
}
