'use client'

import { useState } from 'react'
import { UserProfile } from '@/lib/types'
import { Crown, Dumbbell } from 'lucide-react'
import ElitePlanBuilder from './ElitePlanBuilder'
import PreWorkoutAdmin from './PreWorkoutAdmin'

type AdminTab = 'elite' | 'preworkout'

interface Props {
  profile: UserProfile
}

export default function AdminPanel({ profile }: Props) {
  const [tab, setTab] = useState<AdminTab>('elite')

  return (
    <div className="pb-28">
      {/* Header */}
      <div className="px-4 pt-5 pb-3">
        <h1 className="text-white text-xl font-bold">Admin Panel</h1>
        <p className="text-gray-500 text-xs mt-0.5 capitalize">Logged in as {profile.role}</p>
      </div>

      {/* Tab switcher */}
      <div className="px-4 mb-1">
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-1 flex gap-1">
          <button
            onClick={() => setTab('elite')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition ${
              tab === 'elite'
                ? 'bg-purple-600 text-white shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Crown className="w-4 h-4" />
            Elite Plans
          </button>
          <button
            onClick={() => setTab('preworkout')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition ${
              tab === 'preworkout'
                ? 'bg-orange-600 text-white shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Dumbbell className="w-4 h-4" />
            Pre-workouts
          </button>
        </div>
      </div>

      {/* Content */}
      {tab === 'elite' && <ElitePlanBuilder adminProfile={profile} onBack={() => {}} />}
      {tab === 'preworkout' && <PreWorkoutAdmin />}
    </div>
  )
}
