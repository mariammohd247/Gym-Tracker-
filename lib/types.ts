export type TargetGoal = 'lose_weight' | 'gain_muscle' | 'maintain'

export interface UserProfile {
  id: string
  auth_user_id: string | null
  name: string
  age: number
  height: number // cm
  weight: number // kg
  target_goal: TargetGoal
  created_at: string
}

export interface WorkoutType {
  id: string
  name: string
  slug: string
  emoji: string
}

export interface Exercise {
  id: string
  workout_type_id: string
  name: string
  base_calories: number
  duration_minutes: number
  order_index: number
}

export interface WorkoutSession {
  id: string
  user_profile_id: string
  workout_type_id: string
  date: string
  total_calories_burned: number
  completed_at: string | null
  created_at: string
}

export interface SessionExercise {
  id: string
  session_id: string
  exercise_id: string
  exercise_name: string
  calories_burned: number
  completed: boolean
  completed_at: string | null
}

export interface ExerciseWithState extends Exercise {
  adjusted_calories: number
  completed: boolean
}

export interface CustomWorkoutPlan {
  id: string
  user_profile_id: string
  name: string
  created_at: string
}

export type MachineType = 'treadmill' | 'bike' | 'stairs' | 'row' | 'ski'
export type CardioUnit = 'meters' | 'calories'

export interface CustomPlanExercise {
  id: string
  plan_id: string
  name: string
  exercise_type: 'strength' | 'cardio'
  // strength fields
  reps: number
  rounds: number
  weight_kg: number
  // cardio fields
  machine_type: MachineType | null
  duration_minutes: number | null
  speed: number | null
  incline: number | null
  machine_mode: 'run' | 'walk' | null
  machine_level: number | null
  cardio_unit: CardioUnit | null
  cardio_target: number | null
  estimated_calories: number
  order_index: number
}

export interface CustomPlanExerciseWithState extends CustomPlanExercise {
  completed: boolean
  actual_weight_kg: number
  actual_calories: number
  calculating: boolean
}
