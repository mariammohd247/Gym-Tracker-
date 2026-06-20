'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { UserProfile } from '@/lib/types'
import AuthScreen from '@/components/AuthScreen'
import ProfileSetup from '@/components/ProfileSetup'
import Dashboard from '@/components/Dashboard'

type AppState = 'loading' | 'auth' | 'setup' | 'dashboard'

export default function HomeClient() {
  const [appState, setAppState] = useState<AppState>('loading')
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [authUserId, setAuthUserId] = useState<string | null>(null)

  async function loadProfile(userId: string) {
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('auth_user_id', userId)
      .maybeSingle()

    if (data) {
      setProfile(data)
      setAppState('dashboard')
    } else {
      // Logged in but no profile yet → show profile setup
      setAuthUserId(userId)
      setAppState('setup')
    }
  }

  useEffect(() => {
    // Check existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadProfile(session.user.id)
      } else {
        setAppState('auth')
      }
    })

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadProfile(session.user.id)
      } else {
        setProfile(null)
        setAuthUserId(null)
        setAppState('auth')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    // onAuthStateChange will set state to 'auth' automatically
  }

  function handleProfileComplete(newProfile: UserProfile) {
    setProfile(newProfile)
    setAppState('dashboard')
  }

  // ── Loading splash ──
  if (appState === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-bounce">🏋️</div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  // ── Auth (login / register) ──
  if (appState === 'auth') {
    return (
      <AuthScreen
        onAuth={(userId) => {
          setAuthUserId(userId)
          loadProfile(userId)
        }}
      />
    )
  }

  // ── Profile setup (first time after register) ──
  if (appState === 'setup' && authUserId) {
    return (
      <ProfileSetup
        authUserId={authUserId}
        onComplete={handleProfileComplete}
      />
    )
  }

  // ── Main dashboard ──
  if (appState === 'dashboard' && profile) {
    return <Dashboard profile={profile} onLogout={handleLogout} />
  }

  // Fallback
  return null
}
