'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { CustomPlanExercise, CustomWorkoutPlan, UserProfile, WorkoutType } from '@/lib/types'
import WorkoutSession from './WorkoutSession'
import CustomWorkoutBuilder from './CustomWorkoutBuilder'
import CustomWorkoutSession from './CustomWorkoutSession'
import HistoryModal from './HistoryModal'
import SubscriptionModal from './SubscriptionModal'
import SubscriptionQuestionnaire from './SubscriptionQuestionnaire'
import CartDrawer, { CartItem } from './CartDrawer'
import BottomNav, { Tab } from './BottomNav'
import GalleryTab from './GalleryTab'
import ProTab from './ProTab'
import ProfileTab from './ProfileTab'
import AdminPanel from './AdminPanel'
import { Flame, Calendar, Target, ChevronRight, Trophy, Plus, Pencil, Dumbbell, Trash2, ShoppingCart, Sparkles, Crown, Zap } from 'lucide-react'
import { QuestionnaireAnswers } from '@/lib/planGenerator'

interface Props {
  profile: UserProfile
  onLogout: () => void
}

const goalLabels: Record<string, string> = {
  lose_weight: '🔥 Lose Weight',
  gain_muscle: '💪 Gain Muscle',
  maintain:    '⚖️ Maintain',
}

type View =
  | { type: 'dashboard' }
  | { type: 'preset'; workout: WorkoutType }
  | { type: 'builder' }
  | { type: 'custom-session'; plan: CustomWorkoutPlan }

export default function Dashboard({ profile, onLogout }: Props) {
  const [workoutTypes, setWorkoutTypes] = useState<WorkoutType[]>([])
  const [customPlans,  setCustomPlans]  = useState<(CustomWorkoutPlan & { exercises: CustomPlanExercise[] })[]>([])
  const [recentStats,  setRecentStats]  = useState({ sessions: 0, totalCals: 0 })
  const [loading,      setLoading]      = useState(true)
  const [view,         setView]         = useState<View>({ type: 'dashboard' })
  const [deletingId,   setDeletingId]   = useState<string | null>(null)
  const [historyModal, setHistoryModal] = useState<'workouts' | 'calories' | null>(null)
  const [activeTab,    setActiveTab]    = useState<Tab>('home')

  // Subscription / cart / questionnaire
  const [showSubscription,   setShowSubscription]   = useState(false)
  const [showCart,           setShowCart]           = useState(false)
  const [showQuestionnaire,  setShowQuestionnaire]  = useState(false)
  const [pendingCartItem,    setPendingCartItem]     = useState<CartItem | null>(null)
  const [cart, setCart] = useState<CartItem | null>(() => {
    if (typeof window === 'undefined') return null
    try {
      const saved = localStorage.getItem('gym_cart')
      return saved ? JSON.parse(saved) : null
    } catch { return null }
  })

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [typesRes, statsRes, plansRes] = await Promise.all([
      supabase.from('workout_types').select('*').order('name'),
      supabase
        .from('workout_sessions')
        .select('total_calories_burned')
        .eq('user_profile_id', profile.id)
        .not('completed_at', 'is', null),
      supabase
        .from('custom_workout_plans')
        .select('*, exercises:custom_plan_exercises(*)')
        .eq('user_profile_id', profile.id)
        .order('created_at', { ascending: false }),
    ])

    if (typesRes.data) setWorkoutTypes(typesRes.data)
    if (statsRes.data) {
      setRecentStats({
        sessions:  statsRes.data.length,
        totalCals: statsRes.data.reduce((s: number, r: { total_calories_burned: number }) => s + r.total_calories_burned, 0),
      })
    }
    if (plansRes.data) setCustomPlans(plansRes.data)
    setLoading(false)
  }

  async function deletePlan(planId: string) {
    setDeletingId(planId)
    await supabase.from('custom_workout_plans').delete().eq('id', planId)
    setCustomPlans(prev => prev.filter(p => p.id !== planId))
    setDeletingId(null)
  }

  // Cart helpers
  async function addToCart(item: CartItem) {
    // Check if questionnaire is already filled
    const { data } = await supabase
      .from('subscription_questionnaire')
      .select('id')
      .eq('user_profile_id', profile.id)
      .maybeSingle()

    if (!data) {
      // Show questionnaire first
      setPendingCartItem(item)
      setShowSubscription(false)
      setShowQuestionnaire(true)
      return
    }

    // Already filled — add directly
    setCart(item)
    localStorage.setItem('gym_cart', JSON.stringify(item))
    setShowSubscription(false)
    setShowCart(true)
  }

  function handleQuestionnaireComplete(_answers: QuestionnaireAnswers) {
    setShowQuestionnaire(false)
    if (pendingCartItem) {
      setCart(pendingCartItem)
      localStorage.setItem('gym_cart', JSON.stringify(pendingCartItem))
      setPendingCartItem(null)
    }
    setShowCart(true)
  }

  function removeFromCart() {
    setCart(null)
    localStorage.removeItem('gym_cart')
  }

  const backToDashboard = () => { setView({ type: 'dashboard' }); loadData() }

  const workoutColors: Record<string, string> = {
    legs:  'from-purple-600 to-purple-400',
    pull:  'from-blue-600 to-blue-400',
    push:  'from-green-600 to-green-400',
    upper: 'from-teal-600 to-teal-400',
    hiit:  'from-red-600 to-orange-400',
  }

  // ── Workout sub-views (hide nav) ────────────────────────────
  if (view.type === 'preset') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
        <div className="max-w-lg mx-auto pt-6">
          <WorkoutSession workoutType={view.workout} profile={profile} onBack={backToDashboard} />
        </div>
      </div>
    )
  }
  if (view.type === 'builder') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
        <div className="max-w-lg mx-auto pt-6 pb-10">
          <CustomWorkoutBuilder
            profile={profile}
            onSaved={(plan) => { setView({ type: 'custom-session', plan }) }}
            onBack={backToDashboard}
          />
        </div>
      </div>
    )
  }
  if (view.type === 'custom-session') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
        <div className="max-w-lg mx-auto pt-6 pb-10">
          <CustomWorkoutSession plan={view.plan} profile={profile} onBack={backToDashboard} />
        </div>
      </div>
    )
  }

  // ── Main shell with bottom nav ──────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-lg mx-auto">

        {/* ── Top header (always visible) ── */}
        <div className="flex items-center justify-between px-4 pt-6 pb-3">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              Hey, {profile.name.split(' ')[0]}! 👋
              {profile.subscription_plan === 'elite' && <Crown className="w-5 h-5 text-purple-400" />}
              {profile.subscription_plan === 'pro'   && <Zap   className="w-5 h-5 text-orange-400" />}
            </h1>
            <p className="text-gray-400 text-sm mt-0.5">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {profile.subscription_plan === 'free' ? (
              <button
                onClick={() => setShowSubscription(true)}
                className="flex items-center gap-1.5 bg-gradient-to-r from-orange-600 to-orange-400 hover:from-orange-500 hover:to-orange-300 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition active:scale-95 shadow-md shadow-orange-500/20"
              >
                <Sparkles className="w-3.5 h-3.5" /> Upgrade
              </button>
            ) : (
              <button
                onClick={() => setActiveTab('plan')}
                className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition active:scale-95 ${
                  profile.subscription_plan === 'elite'
                    ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30'
                    : 'bg-orange-500/20 text-orange-300 hover:bg-orange-500/30'
                }`}
              >
                {profile.subscription_plan === 'elite'
                  ? <><Crown className="w-3.5 h-3.5" /> Elite</>
                  : <><Zap   className="w-3.5 h-3.5" /> Pro</>
                }
              </button>
            )}
            <button
              onClick={() => setShowCart(true)}
              className="relative p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition"
            >
              <ShoppingCart className="w-4 h-4" />
              {cart && (
                <span className="absolute -top-0.5 -right-0.5 bg-orange-500 text-white text-[9px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center">
                  1
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ── Tab content ── */}
        <div className="px-4 pb-4">

          {/* HOME TAB */}
          {activeTab === 'home' && (
            <div className="space-y-5">
              {/* Stats cards */}
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setHistoryModal('workouts')}
                  className="bg-gray-800 border border-gray-700 hover:border-orange-500/50 rounded-xl p-3 text-center transition-all active:scale-95 group"
                >
                  <Calendar className="w-5 h-5 text-orange-400 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                  <div className="text-xl font-bold text-white">{recentStats.sessions}</div>
                  <div className="text-xs text-gray-400">Workouts</div>
                </button>
                <button
                  onClick={() => setHistoryModal('calories')}
                  className="bg-gray-800 border border-gray-700 hover:border-orange-500/50 rounded-xl p-3 text-center transition-all active:scale-95 group"
                >
                  <Flame className="w-5 h-5 text-orange-400 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                  <div className="text-xl font-bold text-white">{recentStats.totalCals.toLocaleString()}</div>
                  <div className="text-xs text-gray-400">Total Cal</div>
                </button>
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-3 text-center">
                  <Target className="w-5 h-5 text-orange-400 mx-auto mb-1" />
                  <div className="text-xs font-bold text-white leading-tight">{goalLabels[profile.target_goal]}</div>
                  <div className="text-xs text-gray-400 mt-1">Goal</div>
                </div>
              </div>

              {/* Profile card */}
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center text-orange-400 font-bold text-lg flex-shrink-0">
                  {profile.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-semibold truncate">{profile.name}</div>
                  <div className="text-gray-400 text-xs mt-0.5">
                    {profile.age}y · {profile.height}cm · {profile.weight}kg
                  </div>
                </div>
                {recentStats.sessions >= 5 && <Trophy className="w-6 h-6 text-yellow-400 flex-shrink-0" />}
              </div>

              {/* Custom workouts */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-bold text-white">Your Custom Workouts</h2>
                  <button
                    onClick={() => setView({ type: 'builder' })}
                    className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" /> Create Workout
                  </button>
                </div>
                {loading ? (
                  <div className="bg-gray-800 rounded-2xl h-16 animate-pulse border border-gray-700" />
                ) : customPlans.length === 0 ? (
                  <button
                    onClick={() => setView({ type: 'builder' })}
                    className="w-full border-2 border-dashed border-purple-600/40 hover:border-purple-500 bg-purple-500/5 hover:bg-purple-500/10 rounded-2xl p-5 text-center transition group"
                  >
                    <Pencil className="w-6 h-6 text-purple-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                    <p className="text-purple-300 font-semibold text-sm">Build Your Own Workout</p>
                    <p className="text-gray-500 text-xs mt-1">Add exercises, set reps & weights — AI calculates your calories</p>
                  </button>
                ) : (
                  <div className="space-y-3">
                    {customPlans.map(plan => {
                      const totalCals = plan.exercises.reduce((s, e) => s + e.estimated_calories, 0)
                      return (
                        <div key={plan.id} className="bg-gray-800 border border-gray-700 hover:border-purple-500/50 rounded-2xl overflow-hidden transition-all group">
                          <button
                            onClick={() => setView({ type: 'custom-session', plan })}
                            className="w-full flex items-center gap-4 p-4 text-left"
                          >
                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-600 to-purple-400 flex items-center justify-center flex-shrink-0 shadow-lg">
                              <Dumbbell className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-white font-semibold">{plan.name}</div>
                              <div className="text-gray-400 text-xs mt-0.5">
                                {plan.exercises.length} exercises{totalCals > 0 && ` · ~${totalCals} cal`}
                              </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-purple-400 transition flex-shrink-0" />
                          </button>
                          <div className="px-4 pb-3 flex gap-2">
                            <button
                              onClick={() => setView({ type: 'builder' })}
                              className="text-xs text-gray-500 hover:text-purple-400 transition flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" /> New Plan
                            </button>
                            <span className="text-gray-700">·</span>
                            <button
                              onClick={() => deletePlan(plan.id)}
                              disabled={deletingId === plan.id}
                              className="text-xs text-gray-500 hover:text-red-400 transition flex items-center gap-1 disabled:opacity-50"
                            >
                              <Trash2 className="w-3 h-3" />
                              {deletingId === plan.id ? 'Deleting…' : 'Delete'}
                            </button>
                          </div>
                        </div>
                      )
                    })}
                    <button
                      onClick={() => setView({ type: 'builder' })}
                      className="w-full border border-dashed border-purple-600/40 hover:border-purple-500 rounded-2xl py-3 text-purple-400 hover:text-purple-300 transition text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> Create Another Plan
                    </button>
                  </div>
                )}
              </div>

              {/* Pre-set workouts */}
              <div>
                <h2 className="text-lg font-bold text-white mb-3">Pre-set Workouts</h2>
                <div className="space-y-3">
                  {loading ? (
                    [...Array(5)].map((_, i) => (
                      <div key={i} className="bg-gray-800 rounded-2xl h-20 animate-pulse border border-gray-700" />
                    ))
                  ) : (
                    workoutTypes.map(wt => (
                      <button
                        key={wt.id}
                        onClick={() => setView({ type: 'preset', workout: wt })}
                        className="w-full group relative overflow-hidden bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-orange-500/50 rounded-2xl p-4 flex items-center gap-4 text-left transition-all active:scale-[0.98]"
                      >
                        <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${workoutColors[wt.slug] ?? 'from-gray-600 to-gray-500'} flex items-center justify-center text-2xl flex-shrink-0 shadow-lg`}>
                          {wt.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-semibold text-base">{wt.name}</div>
                          <div className="text-gray-400 text-xs mt-0.5">Tap to start · 7 exercises</div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-orange-400 transition flex-shrink-0" />
                      </button>
                    ))
                  )}
                </div>
              </div>

              {recentStats.sessions === 0 && (
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 text-center">
                  <p className="text-orange-300 text-sm font-medium">💪 Ready for your first workout?</p>
                  <p className="text-gray-400 text-xs mt-1">Choose a preset or build your own above!</p>
                </div>
              )}
            </div>
          )}

          {/* PLAN TAB */}
          {activeTab === 'plan' && (
            <ProTab
              profile={profile}
              onUpgrade={() => setShowSubscription(true)}
            />
          )}

          {/* GALLERY TAB */}
          {activeTab === 'gallery' && (
            <GalleryTab profile={profile} />
          )}

          {/* PROFILE TAB */}
          {activeTab === 'profile' && (
            <ProfileTab profile={profile} onLogout={onLogout} />
          )}

          {/* ADMIN TAB — only for admin / coach / owner */}
          {activeTab === 'admin' && ['admin', 'coach', 'owner'].includes(profile.role) && (
            <AdminPanel profile={profile} />
          )}
        </div>
      </div>

      {/* Bottom navigation */}
      <BottomNav
        active={activeTab}
        profile={profile}
        onChange={(tab) => {
          if (tab === 'plan' && profile.subscription_plan === 'free') {
            setShowSubscription(true)
            return
          }
          setActiveTab(tab)
        }}
      />

      {/* Modals */}
      {historyModal && (
        <HistoryModal
          profile={profile}
          defaultTab={historyModal}
          onClose={() => setHistoryModal(null)}
        />
      )}

      {showSubscription && (
        <SubscriptionModal
          profile={profile}
          cart={cart}
          onAddToCart={addToCart}
          onRemoveFromCart={removeFromCart}
          onOpenCart={() => { setShowSubscription(false); setShowCart(true) }}
          onClose={() => setShowSubscription(false)}
        />
      )}

      {showQuestionnaire && (
        <SubscriptionQuestionnaire
          profile={profile}
          onComplete={handleQuestionnaireComplete}
          onClose={() => { setShowQuestionnaire(false); setPendingCartItem(null) }}
        />
      )}

      {showCart && (
        <CartDrawer
          cart={cart}
          profile={profile}
          onRemove={removeFromCart}
          onClose={() => setShowCart(false)}
        />
      )}
    </div>
  )
}
