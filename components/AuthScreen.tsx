'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Mail, Lock, Eye, EyeOff, ChevronRight, Loader2 } from 'lucide-react'

interface Props {
  onAuth: (userId: string) => void
}

export default function AuthScreen({ onAuth }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccessMsg('')

    if (!email || !password) {
      setError('Please enter your email and password.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setLoading(true)

    if (mode === 'register') {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      })

      if (signUpError) {
        setError(signUpError.message)
        setLoading(false)
        return
      }

      if (data.user) {
        // If email confirmation is disabled, user is immediately active
        if (data.session) {
          onAuth(data.user.id)
        } else {
          // Email confirmation is enabled
          setSuccessMsg('Check your email for a confirmation link, then come back to log in.')
        }
      }
    } else {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (signInError) {
        setError(signInError.message)
        setLoading(false)
        return
      }

      if (data.user) {
        onAuth(data.user.id)
      }
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🏋️</div>
          <h1 className="text-3xl font-bold text-white mb-2">Gym Tracker</h1>
          <p className="text-gray-400">
            {mode === 'login' ? 'Welcome back! Sign in to continue.' : 'Create an account to get started.'}
          </p>
        </div>

        {/* Tab toggle */}
        <div className="flex bg-gray-800 rounded-2xl p-1 mb-6 border border-gray-700">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(''); setSuccessMsg('') }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ${
              mode === 'login'
                ? 'bg-orange-500 text-white shadow-lg'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setError(''); setSuccessMsg('') }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ${
              mode === 'register'
                ? 'bg-orange-500 text-white shadow-lg'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Register
          </button>
        </div>

        {/* Form card */}
        <form
          onSubmit={handleSubmit}
          className="bg-gray-800 rounded-2xl p-6 space-y-5 shadow-2xl border border-gray-700"
        >
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className="w-full bg-gray-700 border border-gray-600 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                className="w-full bg-gray-700 border border-gray-600 rounded-xl pl-10 pr-12 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {mode === 'register' && (
              <p className="text-xs text-gray-500 mt-1.5">Minimum 6 characters</p>
            )}
          </div>

          {/* Error / Success */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
          {successMsg && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3">
              <p className="text-green-400 text-sm">{successMsg}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-orange-600 to-orange-400 hover:from-orange-500 hover:to-orange-300 disabled:opacity-50 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-orange-500/20"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                {mode === 'login' ? 'Sign In' : 'Create Account'}
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Switch mode hint */}
          <p className="text-center text-sm text-gray-500">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setSuccessMsg('') }}
              className="text-orange-400 hover:text-orange-300 font-medium transition"
            >
              {mode === 'login' ? 'Register' : 'Log in'}
            </button>
          </p>
        </form>
      </div>
    </div>
  )
}
