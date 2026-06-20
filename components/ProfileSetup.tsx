'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { TargetGoal, UserProfile } from '@/lib/types'
import { User, Ruler, Weight, Target, ChevronRight } from 'lucide-react'

interface Props {
  authUserId: string
  onComplete: (profile: UserProfile) => void
}

export default function ProfileSetup({ authUserId, onComplete }: Props) {
  const [form, setForm] = useState({
    name: '',
    age: '',
    height: '',
    weight: '',
    target_goal: 'maintain' as TargetGoal,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const goals: { value: TargetGoal; label: string; desc: string; icon: string }[] = [
    { value: 'lose_weight', label: 'Lose Weight', desc: 'Burn fat & get lean', icon: '🔥' },
    { value: 'gain_muscle', label: 'Gain Muscle', desc: 'Build strength & size', icon: '💪' },
    { value: 'maintain', label: 'Maintain', desc: 'Stay fit & healthy', icon: '⚖️' },
  ]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.age || !form.height || !form.weight) {
      setError('Please fill in all fields.')
      return
    }
    setLoading(true)
    setError('')

    const { data, error: dbError } = await supabase
      .from('user_profiles')
      .insert({
        auth_user_id: authUserId,
        name: form.name.trim(),
        age: parseInt(form.age),
        height: parseFloat(form.height),
        weight: parseFloat(form.weight),
        target_goal: form.target_goal,
      })
      .select()
      .single()

    if (dbError) {
      setError('Failed to save profile. Please try again.')
      setLoading(false)
      return
    }

    onComplete(data)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🏋️</div>
          <h1 className="text-3xl font-bold text-white mb-2">Gym Tracker</h1>
          <p className="text-gray-400">Set up your profile to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-gray-800 rounded-2xl p-6 space-y-5 shadow-2xl border border-gray-700">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Your name"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
              />
            </div>
          </div>

          {/* Age + Height + Weight */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Age</label>
              <input
                type="number"
                value={form.age}
                onChange={e => setForm(f => ({ ...f, age: e.target.value }))}
                placeholder="25"
                min="10" max="100"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                <Ruler className="inline w-3 h-3 mr-1" />Height (cm)
              </label>
              <input
                type="number"
                value={form.height}
                onChange={e => setForm(f => ({ ...f, height: e.target.value }))}
                placeholder="170"
                min="100" max="250"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                <Weight className="inline w-3 h-3 mr-1" />Weight (kg)
              </label>
              <input
                type="number"
                value={form.weight}
                onChange={e => setForm(f => ({ ...f, weight: e.target.value }))}
                placeholder="70"
                min="30" max="300"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
              />
            </div>
          </div>

          {/* Target Goal */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Target className="inline w-4 h-4 mr-1" />Target Goal
            </label>
            <div className="grid grid-cols-3 gap-2">
              {goals.map(goal => (
                <button
                  key={goal.value}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, target_goal: goal.value }))}
                  className={`p-3 rounded-xl border-2 text-center transition-all ${
                    form.target_goal === goal.value
                      ? 'border-orange-500 bg-orange-500/20 text-white'
                      : 'border-gray-600 bg-gray-700 text-gray-400 hover:border-gray-500'
                  }`}
                >
                  <div className="text-2xl mb-1">{goal.icon}</div>
                  <div className="text-xs font-semibold">{goal.label}</div>
                  <div className="text-xs text-gray-400 mt-0.5 leading-tight">{goal.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-400/10 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            {loading ? 'Saving...' : 'Get Started'}
            {!loading && <ChevronRight className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  )
}
