import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { exerciseName, weightKg, reps, rounds, userWeightKg } = await req.json()

  if (!exerciseName || reps == null || rounds == null) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const apiKey = process.env.OPENROUTER_API_KEY

  // Always compute the science-based estimate first — used as fallback and sanity-check bound
  const physicsEstimate = metBasedCalories(exerciseName, weightKg, reps, rounds, userWeightKg)

  if (!apiKey) {
    return NextResponse.json({ calories: physicsEstimate })
  }

  const prompt = `You are an expert exercise physiologist. A person weighing ${userWeightKg} kg performed the following strength training exercise:

- Exercise: ${exerciseName}
- Weight lifted: ${weightKg > 0 ? `${weightKg} kg` : 'bodyweight only'}
- Reps per set: ${reps}
- Number of sets: ${rounds}
- Total reps: ${reps * rounds}

Using MET values (strength training ≈ 3–6 METs), time under tension (~3 s/rep), and rest periods (~60–90 s between sets), calculate the total net calories burned for this exercise session.

Typical range for this kind of session: 20–200 kcal.

Respond with ONE integer only. No text, no units, no explanation.`

  // Try models in order of quality, fall back to next on failure
  const models = [
    'mistralai/mistral-7b-instruct:free',
    'meta-llama/llama-3.1-8b-instruct:free',
    'meta-llama/llama-3.2-3b-instruct:free',
  ]

  for (const model of models) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://gym-tracker.app',
          'X-Title': 'Gym Tracker',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 8,
          temperature: 0,
        }),
      })

      if (!response.ok) continue

      const data = await response.json()
      const text = data.choices?.[0]?.message?.content?.trim() ?? ''
      const calories = parseInt(text.replace(/[^\d]/g, ''), 10)

      // Accept if plausible: between 10 and 500 kcal, and within 3× of physics estimate
      if (!isNaN(calories) && calories >= 10 && calories <= 500 && calories <= physicsEstimate * 3) {
        return NextResponse.json({ calories })
      }
    } catch {
      // Try next model
    }
  }

  return NextResponse.json({ calories: physicsEstimate })
}

// MET-based calorie calculation (the gold standard for exercise science)
function metBasedCalories(
  exerciseName: string,
  weightKg: number,
  reps: number,
  rounds: number,
  userWeightKg: number
): number {
  const name = exerciseName.toLowerCase()

  // MET values for different exercise categories (from Compendium of Physical Activities)
  let met = 3.5 // default: light strength training
  if (/deadlift|squat|clean|snatch|thruster/i.test(name)) met = 6.0   // heavy compound
  else if (/bench|row|press|pull.?up|chin.?up/i.test(name)) met = 5.0  // compound upper
  else if (/lunge|leg.?press|rdl|romanian/i.test(name)) met = 5.0     // compound lower
  else if (/curl|extension|fly|raise|pushdown/i.test(name)) met = 3.5  // isolation
  else if (/burpee|jump|sprint|hiit|box/i.test(name)) met = 8.0       // explosive / HIIT

  // Intensity modifier based on weight lifted vs bodyweight
  if (weightKg > 0) {
    const relativeLoad = weightKg / userWeightKg
    if (relativeLoad > 1.0) met *= 1.2       // heavy (>100% BW)
    else if (relativeLoad > 0.5) met *= 1.1  // moderate (50–100% BW)
  }

  // Time estimate: 3 s per rep + 75 s rest between sets (not last set)
  const activeSeconds = reps * rounds * 3
  const restSeconds = (rounds - 1) * 75
  const totalMinutes = (activeSeconds + restSeconds) / 60

  // Mifflin–St Jeor-scaled calorie formula: METs × kg × hours
  const kcal = met * userWeightKg * (totalMinutes / 60)

  return Math.max(10, Math.round(kcal))
}
