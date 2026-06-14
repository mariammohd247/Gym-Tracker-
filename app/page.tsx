'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { UserProfile } from '@/lib/types'
import ProfileSetup from '@/components/ProfileSetup'
import Dashboard from '@/components/Dashboard'

export default function Home() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  async function checkProfile() {
    const savedId = localStorage.getItem('gym_user_id')
    if (savedId) {
      const { data } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', savedId)
        .single()
      if (data) setProfile(data)
    }
    setLoading(false)
  }

  useEffect(() => { checkProfile() }, [])

  function handleLogout() {
    localStorage.removeItem('gym_user_id')
    setProfile(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-bounce">🏋️</div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return <ProfileSetup onComplete={setProfile} />
  }

  return <Dashboard profile={profile} onLogout={handleLogout} />
}
