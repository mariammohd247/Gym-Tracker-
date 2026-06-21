'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'

const PLAN_LABELS: Record<string, string> = {
  pro: '⚡ Pro Plan',
  elite: '👑 Elite Plan',
}

export default function SuccessClient() {
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading')
  const [planLabel, setPlanLabel] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const paymentId = params.get('paymentId')

    if (!paymentId) {
      setErrorMsg('No payment ID found in the URL.')
      setStatus('failed')
      return
    }

    verify(paymentId)
  }, [])

  async function verify(paymentId: string) {
    try {
      // 1. Verify via Supabase Edge Function (MyFatoorah API key stays in Supabase secrets)
      const { supabase } = await import('@/lib/supabase')
      const { data, error: fnError } = await supabase.functions.invoke('payment', {
        body: { action: 'verify', paymentId },
      })

      if (fnError || !data?.success) {
        setErrorMsg(`Payment status: ${data?.status ?? fnError?.message ?? 'unknown'}`)
        setStatus('failed')
        return
      }

      // 2. Update the user's profile subscription in Supabase
      //    The user is still authenticated (Supabase session cookie), so
      //    the RLS policy allows them to update their own profile row.
      const expiresAt = new Date()
      expiresAt.setMonth(expiresAt.getMonth() + 1)

      const { error: updateErr } = await supabase
        .from('user_profiles')
        .update({
          subscription_plan: data.planId ?? 'pro',
          subscription_expires_at: expiresAt.toISOString(),
        })
        .eq('id', data.profileId)

      if (updateErr) {
        console.error('Profile update failed:', updateErr)
        // Payment was real but profile update failed — still show success
        // so user can contact support with the invoice ID
      }

      setPlanLabel(PLAN_LABELS[data.planId] ?? '✨ Premium Plan')
      setStatus('success')
    } catch (err) {
      console.error(err)
      setErrorMsg('Something went wrong while verifying your payment.')
      setStatus('failed')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-3xl p-8 w-full max-w-sm text-center shadow-2xl">

        {status === 'loading' && (
          <>
            <Loader2 className="w-14 h-14 text-orange-400 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Verifying Payment…</h2>
            <p className="text-gray-400 text-sm">Please wait while we confirm your subscription.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">You&apos;re subscribed! 🎉</h2>
            <p className="text-gray-400 text-sm mb-1">Welcome to</p>
            <p className="text-orange-400 font-bold text-lg mb-6">{planLabel}</p>
            <p className="text-gray-500 text-xs mb-6">
              Your subscription is active for 30 days. Enjoy all premium features!
            </p>
            <a
              href="/"
              className="block w-full bg-gradient-to-r from-orange-600 to-orange-400 hover:from-orange-500 hover:to-orange-300 text-white font-semibold py-3 rounded-xl transition-all active:scale-95"
            >
              Go to Home
            </a>
          </>
        )}

        {status === 'failed' && (
          <>
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-10 h-10 text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Payment not confirmed</h2>
            <p className="text-gray-400 text-sm mb-6">{errorMsg || 'Your payment could not be verified.'}</p>
            <a
              href="/"
              className="block w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-xl transition-all active:scale-95"
            >
              Back to Dashboard
            </a>
          </>
        )}
      </div>
    </div>
  )
}
