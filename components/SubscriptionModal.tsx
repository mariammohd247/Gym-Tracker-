'use client'

import { useState } from 'react'
import { X, Check, ShoppingCart, Loader2, Zap, Crown, Sparkles, Trash2 } from 'lucide-react'
import { UserProfile } from '@/lib/types'

interface Plan {
  id: 'pro' | 'elite'
  name: string
  price: number
  period: string
  tagline: string
  icon: React.ReactNode
  color: string
  borderColor: string
  badgeColor: string
  features: string[]
  recommended?: boolean
}

const PLANS: Plan[] = [
  {
    id: 'pro',
    name: 'Pro',
    price: 4.99,
    period: '/month',
    tagline: 'Perfect for dedicated gym-goers',
    icon: <Zap className="w-6 h-6" />,
    color: 'from-orange-600 to-orange-400',
    borderColor: 'border-orange-500',
    badgeColor: 'bg-orange-500',
    recommended: true,
    features: [
      'Everything in Free',
      'Unlimited custom workouts',
      'AI calorie calculation',
      'File & image uploads',
      'Advanced workout history',
      'Priority support',
    ],
  },
  {
    id: 'elite',
    name: 'Elite',
    price: 9.99,
    period: '/month',
    tagline: 'For serious athletes',
    icon: <Crown className="w-6 h-6" />,
    color: 'from-purple-600 to-purple-400',
    borderColor: 'border-purple-500',
    badgeColor: 'bg-purple-500',
    features: [
      'Everything in Pro',
      'Personal coach access',
      'Custom meal plans',
      'Weekly progress reports',
      'Exclusive workout programs',
      '1-on-1 virtual sessions',
    ],
  },
]

interface CartItem {
  plan: Plan
}

interface Props {
  profile: UserProfile
  onClose: () => void
}

export default function SubscriptionModal({ profile, onClose }: Props) {
  const [cart, setCart] = useState<CartItem | null>(null)
  const [checkingOut, setCheckingOut] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')

  function addToCart(plan: Plan) {
    setCart({ plan })
    setCheckoutError('')
  }

  function removeFromCart() {
    setCart(null)
    setCheckoutError('')
  }

  async function handleCheckout() {
    if (!cart) return
    setCheckingOut(true)
    setCheckoutError('')

    try {
      // Get the user's email from Supabase auth
      const { supabase } = await import('@/lib/supabase')
      const { data: { user } } = await supabase.auth.getUser()
      const email = user?.email ?? 'customer@gymtracker.app'

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: cart.plan.id,
          planName: `Gym Tracker ${cart.plan.name} Plan`,
          amount: cart.plan.price,
          profileId: profile.id,
          customerName: profile.name,
          customerEmail: email,
        }),
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        setCheckoutError(data.error ?? 'Checkout failed. Please try again.')
        setCheckingOut(false)
        return
      }

      // Redirect to MyFatoorah payment page
      window.location.href = data.paymentUrl
    } catch (err) {
      console.error(err)
      setCheckoutError('Something went wrong. Please try again.')
      setCheckingOut(false)
    }
  }

  const currentPlan = profile.subscription_plan ?? 'free'

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-gray-900 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg border border-gray-700 shadow-2xl max-h-[94vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-800 flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-orange-400" /> Upgrade Your Plan
            </h2>
            <p className="text-gray-400 text-xs mt-0.5">Choose a plan that fits your goals</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable plan list */}
        <div className="flex-1 overflow-y-auto px-5 pt-4 pb-4 space-y-4">

          {/* Current plan chip */}
          {currentPlan !== 'free' && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-2.5 flex items-center gap-2">
              <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
              <span className="text-green-300 text-sm font-medium">
                You&apos;re on the <span className="capitalize font-bold">{currentPlan}</span> plan
              </span>
            </div>
          )}

          {/* Free plan (read-only, always shown) */}
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-gray-700 flex items-center justify-center text-gray-300">
                  🏋️
                </div>
                <div>
                  <div className="text-white font-bold">Free</div>
                  <div className="text-xs text-gray-400">Your current plan</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-white">0 <span className="text-sm text-gray-400">KWD</span></div>
                <div className="text-xs text-gray-500">forever</div>
              </div>
            </div>
            <ul className="space-y-1.5">
              {['Pre-set workouts', 'Basic calorie tracking', 'Workout history'].map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-gray-400">
                  <Check className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Paid plans */}
          {PLANS.map(plan => {
            const isActive = currentPlan === plan.id
            const inCart = cart?.plan.id === plan.id

            return (
              <div
                key={plan.id}
                className={`bg-gray-800 border-2 rounded-2xl overflow-hidden transition-all ${
                  inCart ? plan.borderColor : 'border-gray-700'
                }`}
              >
                {/* Recommended badge */}
                {plan.recommended && (
                  <div className={`${plan.badgeColor} text-white text-xs font-bold text-center py-1 tracking-wider uppercase`}>
                    ⭐ Most Popular
                  </div>
                )}

                <div className="p-4">
                  {/* Plan header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center text-white`}>
                        {plan.icon}
                      </div>
                      <div>
                        <div className="text-white font-bold">{plan.name}</div>
                        <div className="text-xs text-gray-400">{plan.tagline}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-white">
                        {plan.price} <span className="text-sm text-gray-400">KWD</span>
                      </div>
                      <div className="text-xs text-gray-500">{plan.period}</div>
                    </div>
                  </div>

                  {/* Features */}
                  <ul className="space-y-1.5 mb-4">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                        <Check className={`w-3.5 h-3.5 flex-shrink-0 ${inCart ? 'text-orange-400' : 'text-green-400'}`} />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {/* CTA button */}
                  {isActive ? (
                    <div className="w-full bg-green-500/20 text-green-400 font-semibold py-2.5 rounded-xl text-center text-sm">
                      ✓ Current Plan
                    </div>
                  ) : inCart ? (
                    <button
                      onClick={removeFromCart}
                      className="w-full bg-gray-700 hover:bg-gray-600 text-gray-300 font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 transition text-sm"
                    >
                      <Trash2 className="w-4 h-4" /> Remove from Cart
                    </button>
                  ) : (
                    <button
                      onClick={() => addToCart(plan)}
                      className={`w-full bg-gradient-to-r ${plan.color} hover:opacity-90 text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 transition active:scale-95 text-sm shadow-lg`}
                    >
                      <ShoppingCart className="w-4 h-4" /> Add to Cart
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Cart / Checkout footer */}
        {cart && (
          <div className="border-t border-gray-700 px-5 py-4 flex-shrink-0 bg-gray-900 rounded-b-2xl space-y-3">
            {/* Cart summary */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-orange-400" />
                <span className="text-white font-semibold text-sm">{cart.plan.name} Plan</span>
              </div>
              <span className="text-orange-400 font-bold">{cart.plan.price} KWD{cart.plan.period}</span>
            </div>

            {checkoutError && (
              <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {checkoutError}
              </p>
            )}

            <button
              onClick={handleCheckout}
              disabled={checkingOut}
              className="w-full bg-gradient-to-r from-orange-600 to-orange-400 hover:from-orange-500 hover:to-orange-300 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-orange-500/20"
            >
              {checkingOut ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Redirecting to payment…
                </>
              ) : (
                <>
                  <ShoppingCart className="w-5 h-5" />
                  Proceed to Checkout · {cart.plan.price} KWD
                </>
              )}
            </button>
            <p className="text-center text-xs text-gray-500">
              🔒 Secured by MyFatoorah · Cancel anytime
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
