'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { UserProfile } from '@/lib/types'
import { LogOut, Flame, Calendar, Target, Zap, Crown, Trophy } from 'lucide-react'

interface Props {
  profile: UserProfile
  onLogout: () => void
}

interface Stats {
  sessions: number
  totalCals: number
  thisWeek: number
}

interface Questionnaire {
  goal: string
  health_issues: string
  workout_days: string
  fitness_level: string
  timeline: string
}

export default function ProfileTab({ profile, onLogout }: Props) {
  const [stats, setStats]               = useState<Stats>({ sessions: 0, totalCals: 0, thisWeek: 0 })
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null)
  const [loading, setLoading]           = useState(true)

  const load = useCallback(async () => {
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    weekStart.setHours(0, 0, 0, 0)

    const [sessRes, qRes] = await Promise.all([
      supabase
        .from('workout_sessions')
        .select('total_calories_burned, completed_at')
        .eq('user_profile_id', profile.id)
        .not('completed_at', 'is', null),
      supabase
        .from('subscription_questionnaire')
        .select('*')
        .eq('user_profile_id', profile.id)
        .maybeSingle(),
    ])

    if (sessRes.data) {
      const sessions  = sessRes.data.length
      const totalCals = sessRes.data.reduce((s: number, r: { total_calories_burned: number }) => s + r.total_calories_burned, 0)
      const thisWeek  = sessRes.data.filter((r: { completed_at: string }) =>
        new Date(r.completed_at) >= weekStart
      ).length
      setStats({ sessions, totalCals, thisWeek })
    }

    if (qRes.data) setQuestionnaire(qRes.data)
    setLoading(false)
  }, [profile.id])

  useEffect(() => { load() }, [load])

  const planColor = profile.subscription_plan === 'elite'
    ? 'text-purple-400'
    : profile.subscription_plan === 'pro'
    ? 'text-orange-400'
    : 'text-gray-400'

  const planBg = profile.subscription_plan === 'elite'
    ? 'bg-purple-500/10 border-purple-500/30'
    : profile.subscription_plan === 'pro'
    ? 'bg-orange-500/10 border-orange-500/30'
    : 'bg-gray-800 border-gray-700'

  return (
    <div className="pb-28 space-y-5 px-4 pt-4">

      {/* Avatar + name */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center text-orange-400 font-bold text-2xl flex-shrink-0">
          {profile.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-white truncate">{profile.name}</h2>
          <div className={`flex items-center gap-1.5 mt-1 text-sm font-semibold ${planColor}`}>
            {profile.subscription_plan === 'elite' && <Crown className="w-4 h-4" />}
            {profile.subscription_plan === 'pro'   && <Zap   className="w-4 h-4" />}
            <span className="capitalize">{profile.subscription_plan} Member</span>
          </div>
        </div>
        {stats.sessions >= 5 && <Trophy className="w-7 h-7 text-yellow-400 flex-shrink-0" />}
      </div>

      {/* Subscription chip */}
      <div className={`border rounded-2xl px-4 py-3 flex items-center justify-between ${planBg}`}>
        <div>
          <p className={`font-bold capitalize ${planColor}`}>
            {profile.subscription_plan === 'free' ? 'Free Plan' : `${profile.subscription_plan} Plan`}
          </p>
          {profile.subscription_expires_at && (
            <p className="text-gray-400 text-xs mt-0.5">
              Active until {new Date(profile.subscription_expires_at).toLocaleDateString()}
            </p>
          )}
        </div>
        {profile.subscription_plan !== 'free' && (
          profile.subscription_plan === 'elite'
            ? <Crown className={`w-6 h-6 ${planColor}`} />
            : <Zap   className={`w-6 h-6 ${planColor}`} />
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-3 text-center">
          <Calendar className="w-5 h-5 text-orange-400 mx-auto mb-1" />
          <div className="text-white font-bold text-lg">{loading ? '–' : stats.sessions}</div>
          <div className="text-gray-400 text-xs">Sessions</div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-3 text-center">
          <Flame className="w-5 h-5 text-orange-400 mx-auto mb-1" />
          <div className="text-white font-bold text-lg">{loading ? '–' : stats.totalCals.toLocaleString()}</div>
          <div className="text-gray-400 text-xs">Total Cal</div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-3 text-center">
          <Target className="w-5 h-5 text-orange-400 mx-auto mb-1" />
          <div className="text-white font-bold text-lg">{loading ? '–' : stats.thisWeek}</div>
          <div className="text-gray-400 text-xs">This Week</div>
        </div>
      </div>

      {/* Body stats */}
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 grid grid-cols-3 gap-3 text-center">
        {[
          { label: 'Age',    value: `${profile.age} yrs`  },
          { label: 'Height', value: `${profile.height} cm` },
          { label: 'Weight', value: `${profile.weight} kg` },
        ].map(({ label, value }) => (
          <div key={label}>
            <div className="text-white font-bold">{value}</div>
            <div className="text-gray-500 text-xs mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Questionnaire answers */}
      {questionnaire && (
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4">
          <h3 className="text-white font-bold text-sm mb-3">Your Fitness Profile</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[
              { label: 'Main Goal',     value: questionnaire.goal.replace(/_/g, ' ') },
              { label: 'Fitness Level', value: questionnaire.fitness_level },
              { label: 'Days/Week',     value: questionnaire.workout_days },
              { label: 'Timeline',      value: questionnaire.timeline.replace(/_/g, ' ') },
              { label: 'Health Notes',  value: questionnaire.health_issues.replace(/_/g, ' ') },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-700/50 rounded-xl p-2.5">
                <div className="text-gray-400 text-xs">{label}</div>
                <div className="text-white font-semibold capitalize mt-0.5">{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Logout */}
      <button
        onClick={onLogout}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gray-800 border border-gray-700 hover:border-red-500/50 hover:text-red-400 text-gray-400 transition font-semibold text-sm"
      >
        <LogOut className="w-4 h-4" /> Log Out
      </button>
    </div>
  )
}
