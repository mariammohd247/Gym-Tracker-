'use client'

import { useState } from 'react'
import { X, ShoppingCart, Trash2, Loader2, Zap, Crown, ArrowRight } from 'lucide-react'
import { UserProfile } from '@/lib/types'
import { supabase } from '@/lib/supabase'

const EDGE_FN = 'payment'

export interface CartItem {
  planId: 'pro' | 'elite'
  planName: string
  price: number
  period: string
}

interface Props {
  cart: CartItem | null
  profile: UserProfile
  onRemove: () => void
  onClose: () => void
}

const PLAN_ICONS: Record<string, React.ReactNode> = {
  pro: <Zap className="w-5 h-5 text-orange-400" />,
  elite: <Crown className="w-5 h-5 text-purple-400" />,
}

const PLAN_COLORS: Record<string, string> = {
  pro: 'from-orange-600 to-orange-400',
  elite: 'from-purple-600 to-purple-400',
}

const PLAN_BORDER: Record<string, string> = {
  pro: 'border-orange-500/40',
  elite: 'border-purple-500/40',
}

export default function CartDrawer({ cart, profile, onRemove, onClose }: Props) {
  const [checkingOut, setCheckingOut] = useState(false)
  const [error, setError] = useState('')

  async function handleCheckout() {
    if (!cart) return
    setCheckingOut(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const email = user?.email ?? 'customer@gymtracker.app'

      // Call Supabase Edge Function (MyFatoorah API key lives only in Supabase secrets)
      const { data, error: fnError } = await supabase.functions.invoke(EDGE_FN, {
        body: {
          action:         'checkout',
          planId:          cart.planId,
          planName:       `Gym Tracker ${cart.planName} Plan`,
          amount:          cart.price,
          profileId:       profile.id,
          customerName:    profile.name,
          customerEmail:   email,
          callbackOrigin:  window.location.origin,
        },
      })

      if (fnError || data?.error) {
        setError(data?.error ?? fnError?.message ?? 'Checkout failed. Please try again.')
        setCheckingOut(false)
        return
      }

      window.location.href = data.paymentUrl
    } catch {
      setError('Something went wrong. Please try again.')
      setCheckingOut(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-full max-w-sm bg-gray-900 border-l border-gray-700 z-50 flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-orange-400" />
            <h2 className="text-lg font-bold text-white">Your Cart</h2>
            {cart && (
              <span className="bg-orange-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                1
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {!cart ? (
            /* Empty cart */
            <div className="flex flex-col items-center justify-center h-full text-center pb-16">
              <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mb-4">
                <ShoppingCart className="w-8 h-8 text-gray-600" />
              </div>
              <p className="text-gray-300 font-semibold">Your cart is empty</p>
              <p className="text-gray-500 text-sm mt-1">
                Browse plans and add one to get started
              </p>
              <button
                onClick={onClose}
                className="mt-6 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 font-semibold px-5 py-2.5 rounded-xl transition text-sm"
              >
                Browse Plans
              </button>
            </div>
          ) : (
            /* Cart item */
            <div className="space-y-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Selected Plan</p>

              <div className={`bg-gray-800 border-2 ${PLAN_BORDER[cart.planId]} rounded-2xl overflow-hidden`}>
                {/* Plan header */}
                <div className={`bg-gradient-to-r ${PLAN_COLORS[cart.planId]} p-4 flex items-center justify-between`}>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                      {PLAN_ICONS[cart.planId]}
                    </div>
                    <span className="text-white font-bold text-lg">{cart.planName}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-bold text-xl">{cart.price} KWD</div>
                    <div className="text-white/70 text-xs">{cart.period}</div>
                  </div>
                </div>

                {/* Remove */}
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Qty: 1</span>
                  <button
                    onClick={onRemove}
                    className="flex items-center gap-1.5 text-red-400 hover:text-red-300 text-sm transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </button>
                </div>
              </div>

              {/* Order summary */}
              <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 space-y-3">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Order Summary</p>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">{cart.planName} Plan</span>
                  <span className="text-white font-medium">{cart.price} KWD</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Billing period</span>
                  <span className="text-white font-medium">Monthly</span>
                </div>
                <div className="border-t border-gray-700 pt-3 flex justify-between">
                  <span className="text-white font-bold">Total</span>
                  <span className="text-orange-400 font-bold text-lg">{cart.price} KWD</span>
                </div>
              </div>

              <p className="text-xs text-gray-500 text-center">
                🔒 Secured by MyFatoorah · Cancel anytime
              </p>
            </div>
          )}
        </div>

        {/* Footer — only shown when cart has an item */}
        {cart && (
          <div className="px-5 py-4 border-t border-gray-800 space-y-3">
            {error && (
              <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            <button
              onClick={handleCheckout}
              disabled={checkingOut}
              className="w-full bg-gradient-to-r from-orange-600 to-orange-400 hover:from-orange-500 hover:to-orange-300 disabled:opacity-60 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-orange-500/20 text-base"
            >
              {checkingOut ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Redirecting…
                </>
              ) : (
                <>
                  Checkout · {cart.price} KWD
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="w-full text-gray-400 hover:text-white text-sm transition py-1"
            >
              Continue browsing
            </button>
          </div>
        )}
      </div>
    </>
  )
}
