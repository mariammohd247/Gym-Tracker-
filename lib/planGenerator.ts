export interface QuestionnaireAnswers {
  goal: string
  health_issues: string
  workout_days: string
  fitness_level: string
  timeline: string
}

export interface WorkoutBlock {
  name: string
  emoji: string
  focus: string
  duration: number   // minutes
  calories: number
  exercises: string[]
  note?: string
}

export interface DaySchedule {
  day: string
  workout: WorkoutBlock | null  // null = rest day
}

export interface WeekPlan {
  weekNum: number
  theme: string
  schedule: DaySchedule[]
}

// ── Workout libraries ──────────────────────────────────────────

const LOSS_WORKOUTS: Record<string, WorkoutBlock[]> = {
  beginner: [
    { name: 'Full Body Circuit', emoji: '⚡', focus: 'Total Body', duration: 40, calories: 300, exercises: ['Bodyweight Squats ×15', 'Push-ups ×10', 'Reverse Lunges ×12', 'Plank 30 s', 'Jumping Jacks ×30'] },
    { name: 'Cardio Blast',      emoji: '🏃', focus: 'Cardio',     duration: 35, calories: 330, exercises: ['Treadmill Walk/Jog 20 min', 'High Knees ×20', 'Jump Rope 5 min', 'Cool-down Stretch'] },
    { name: 'Core & Burn',       emoji: '🔥', focus: 'Core',       duration: 30, calories: 210, exercises: ['Crunches ×20', 'Leg Raises ×15', 'Russian Twists ×20', 'Bicycle Crunch ×20', 'Plank 45 s'] },
    { name: 'Lower Body Tone',   emoji: '🦵', focus: 'Lower Body', duration: 45, calories: 280, exercises: ['Squats ×20', 'Glute Bridges ×15', 'Side Lunges ×12', 'Calf Raises ×20', 'Wall Sit 45 s'] },
    { name: 'HIIT Starter',      emoji: '💥', focus: 'HIIT',       duration: 25, calories: 360, exercises: ['Burpees ×8', 'Mountain Climbers ×20', 'Jump Squats ×10', 'High Knees ×30', 'Rest 60 s — repeat ×3'] },
  ],
  intermediate: [
    { name: 'Metabolic Circuit', emoji: '⚡', focus: 'Total Body', duration: 50, calories: 420, exercises: ['Barbell Squats ×12', 'Dumbbell Press ×12', 'Kettlebell Swings ×15', 'Box Jumps ×10', 'Battle Ropes 30 s'] },
    { name: 'Cardio Power',      emoji: '🏃', focus: 'Cardio',     duration: 45, calories: 500, exercises: ['Treadmill Run 30 min', 'Sprint Intervals ×6', 'Stairmaster 10 min'] },
    { name: 'HIIT Advanced',     emoji: '🔥', focus: 'HIIT',       duration: 35, calories: 480, exercises: ['Burpees ×15', 'Jump Lunges ×12', 'Plyo Push-ups ×10', 'Sprint 30 s, Rest 30 s — ×8'] },
    { name: 'Core Shred',        emoji: '💪', focus: 'Core',       duration: 40, calories: 290, exercises: ['Hanging Knee Raises ×15', 'Cable Crunches ×15', 'Ab Wheel Rollout ×10', 'Plank Variations 2 min'] },
    { name: 'Lower Body Blast',  emoji: '🦵', focus: 'Lower Body', duration: 55, calories: 380, exercises: ['Romanian Deadlift ×12', 'Goblet Squat ×15', 'Bulgarian Split Squat ×10', 'Leg Curl ×12', 'Glute Kickbacks ×15'] },
  ],
  advanced: [
    { name: 'Power Circuit',     emoji: '⚡', focus: 'Total Body', duration: 60, calories: 550, exercises: ['Barbell Complex', 'Kettlebell Circuits', 'Battle Ropes AMRAP', 'Sprint Finisher'] },
    { name: 'Track Intervals',   emoji: '🏃', focus: 'Cardio',     duration: 50, calories: 600, exercises: ['400 m Sprints ×6', 'Rest 90 s between sets', 'Cool-down Jog 10 min'] },
    { name: 'CrossFit-style WOD',emoji: '🔥', focus: 'HIIT',       duration: 40, calories: 580, exercises: ['Thrusters ×15', 'Pull-ups ×10', 'Box Jumps ×15', 'Double-unders ×50 — AMRAP 20 min'] },
    { name: 'Weighted Core',     emoji: '💪', focus: 'Core',       duration: 45, calories: 320, exercises: ['Weighted Sit-ups ×15', 'Dragon Flag ×8', 'Toes-to-Bar ×12', 'Pallof Press ×15'] },
    { name: 'Plyometric Legs',   emoji: '🦵', focus: 'Lower Body', duration: 55, calories: 460, exercises: ['Jump Squat ×20', 'Bulgarian Split Squat ×12', 'Box Jump ×15', 'Sled Push 4 rounds'] },
  ],
}

const MUSCLE_WORKOUTS: Record<string, WorkoutBlock[]> = {
  beginner: [
    { name: 'Push Day',       emoji: '💪', focus: 'Chest / Shoulders / Triceps', duration: 55, calories: 240, exercises: ['Bench Press 3×10', 'Dumbbell Shoulder Press 3×10', 'Incline Push-ups 3×12', 'Tricep Dips 3×10', 'Lateral Raises 3×12'] },
    { name: 'Pull Day',       emoji: '🏋️', focus: 'Back / Biceps',               duration: 55, calories: 250, exercises: ['Assisted Pull-ups 3×8', 'Dumbbell Rows 3×10', 'Bicep Curls 3×12', 'Face Pulls 3×15', 'Shrugs 3×15'] },
    { name: 'Leg Day',        emoji: '🦵', focus: 'Quads / Hamstrings / Glutes', duration: 60, calories: 310, exercises: ['Barbell Squat 3×10', 'Leg Press 3×12', 'Leg Curl 3×12', 'Calf Raises 4×15', 'Glute Bridges 3×15'] },
    { name: 'Upper Body',     emoji: '💪', focus: 'Full Upper Body',              duration: 60, calories: 260, exercises: ['Bench Press 3×10', 'Rows 3×10', 'Military Press 3×10', 'Curls 3×12', 'Tricep Pushdown 3×12'] },
    { name: 'Full Body Lift', emoji: '🏋️', focus: 'Compound Movements',          duration: 65, calories: 290, exercises: ['Deadlift 3×6', 'Squat 3×8', 'Bench Press 3×8', 'Pull-ups 3×6', 'Core Finisher'] },
  ],
  intermediate: [
    { name: 'Chest & Tri',     emoji: '💪', focus: 'Chest / Triceps',   duration: 65, calories: 290, exercises: ['Bench Press 4×8', 'Incline DB Press 3×10', 'Cable Fly 3×12', 'Skull Crushers 3×10', 'Tricep Pushdown 3×12'] },
    { name: 'Back & Bi',       emoji: '🏋️', focus: 'Back / Biceps',    duration: 65, calories: 300, exercises: ['Weighted Pull-ups 4×6', 'Barbell Row 4×8', 'Seated Cable Row 3×10', 'Hammer Curls 3×10', 'EZ-Bar Curl 3×10'] },
    { name: 'Legs Power',      emoji: '🦵', focus: 'Legs',              duration: 70, calories: 360, exercises: ['Squat 4×8', 'Romanian Deadlift 3×10', 'Leg Press 4×12', 'Lunges 3×10', 'Seated Calf Raises 4×15'] },
    { name: 'Shoulder & Core', emoji: '🎯', focus: 'Shoulders / Core',  duration: 60, calories: 260, exercises: ['Military Press 4×8', 'Arnold Press 3×10', 'Lateral Raises 3×15', 'Front Raises 3×12', 'Weighted Planks 3×45 s'] },
    { name: 'Power Compound',  emoji: '🏋️', focus: 'Strength & Power', duration: 70, calories: 320, exercises: ['Deadlift 4×5', 'Squat 4×5', 'Bench Press 4×5', 'Pull-ups 4×6'] },
  ],
  advanced: [
    { name: 'Chest Hypertrophy', emoji: '💪', focus: 'Chest',      duration: 75, calories: 330, exercises: ['Flat Bench 5×5', 'Incline Press 4×8', 'DB Fly 4×12', 'Cable Crossover 3×15', 'Dips to failure'] },
    { name: 'Back Thickness',    emoji: '🏋️', focus: 'Back',       duration: 75, calories: 340, exercises: ['Deadlift 4×4', 'Weighted Pull-ups 4×6', 'T-Bar Row 4×8', 'Meadows Row 3×10'] },
    { name: 'Leg Strength',      emoji: '🦵', focus: 'Legs',       duration: 80, calories: 420, exercises: ['Squat 5×5', 'Leg Press 4×10', 'RDL 4×8', 'Leg Curl 4×10', 'Sissy Squat 3×12'] },
    { name: 'Shoulder Width',    emoji: '🎯', focus: 'Shoulders',  duration: 65, calories: 270, exercises: ['Overhead Press 5×5', 'Lateral Raises 5×15', 'Rear Delt Fly 4×15', 'Upright Row 3×10'] },
    { name: 'Arm Specialization',emoji: '💪', focus: 'Arms',       duration: 60, calories: 240, exercises: ['Barbell Curl 4×8', 'Skull Crushers 4×8', 'Hammer Curl 3×10', 'Tricep Dips 3×10'] },
  ],
}

const MAINTAIN_WORKOUTS: Record<string, WorkoutBlock[]> = {
  beginner:     LOSS_WORKOUTS.beginner.slice(0, 4),
  intermediate: [...MUSCLE_WORKOUTS.intermediate.slice(0, 2), ...LOSS_WORKOUTS.intermediate.slice(0, 2)],
  advanced:     [...MUSCLE_WORKOUTS.advanced.slice(0, 2), ...LOSS_WORKOUTS.advanced.slice(0, 2)],
}

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const WEEK_THEMES: Record<string, string[]> = {
  '1_month':  ['Foundation', 'Build', 'Intensify', 'Peak'],
  '3_months': ['Foundation', 'Build', 'Intensify', 'Peak'],
  '6_months': ['Foundation', 'Adaptation', 'Intensify', 'Consolidate'],
  '1_year':   ['Foundation', 'Habit Building', 'Progress', 'Consistency'],
}

function workoutDaysCount(daysStr: string): number {
  const map: Record<string, number> = { '1-2': 2, '3-4': 4, '5-6': 5, 'everyday': 7 }
  return map[daysStr] ?? 3
}

function pickWorkoutDays(totalDays: number): number[] {
  // Return indices of ALL_DAYS to use as workout days
  const patterns: Record<number, number[]> = {
    2: [0, 3],           // Mon, Thu
    4: [0, 1, 3, 4],     // Mon, Tue, Thu, Fri
    5: [0, 1, 2, 3, 4],  // Mon–Fri
    7: [0, 1, 2, 3, 4, 5, 6],
  }
  return patterns[totalDays] ?? patterns[4]
}

export function generateMonthlyPlan(q: QuestionnaireAnswers): WeekPlan[] {
  const level = ['beginner', 'intermediate', 'advanced', 'professional'].includes(q.fitness_level)
    ? (q.fitness_level === 'professional' ? 'advanced' : q.fitness_level)
    : 'beginner'

  const library =
    q.goal === 'gain_muscle'  ? MUSCLE_WORKOUTS[level]  :
    q.goal === 'maintain'     ? MAINTAIN_WORKOUTS[level] :
                                LOSS_WORKOUTS[level]

  const daysCount  = workoutDaysCount(q.workout_days)
  const workoutIdx = pickWorkoutDays(daysCount)
  const themes     = WEEK_THEMES[q.timeline] ?? WEEK_THEMES['3_months']

  const hasKneeIssue = q.health_issues === 'knee_issues'
  const hasBackIssue = q.health_issues === 'back_pain'
  const hasHeart     = q.health_issues === 'heart_condition'

  const plan: WeekPlan[] = []

  for (let w = 0; w < 4; w++) {
    const intensityMult = 1 + w * 0.08  // slight intensity boost each week

    const schedule: DaySchedule[] = ALL_DAYS.map((day, i) => {
      if (!workoutIdx.includes(i)) return { day, workout: null }

      const block = { ...library[w % library.length] }
      block.calories = Math.round(block.calories * intensityMult)

      // Health issue notes
      if (hasKneeIssue && (block.focus.includes('Lower') || block.focus.includes('Legs'))) {
        block.note = '⚠️ Avoid deep squats — use reduced range of motion'
      }
      if (hasBackIssue && block.name.includes('Dead')) {
        block.note = '⚠️ Use light weight, focus on form — consider Romanian DL instead'
      }
      if (hasHeart) {
        block.note = '⚠️ Keep heart rate moderate — consult physician before high-intensity sets'
        block.calories = Math.round(block.calories * 0.8)
      }

      return { day, workout: block }
    })

    plan.push({ weekNum: w + 1, theme: themes[w] ?? `Week ${w + 1}`, schedule })
  }

  return plan
}
