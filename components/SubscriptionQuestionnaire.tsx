'use client'

import { useState } from 'react'
import { X, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { UserProfile } from '@/lib/types'
import { QuestionnaireAnswers } from '@/lib/planGenerator'

interface Props {
  profile: UserProfile
  onComplete: (answers: QuestionnaireAnswers) => void
  onClose: () => void
}

interface Step {
  key: keyof QuestionnaireAnswers
  question: string
  emoji: string
  options: { value: string; label: string; desc: string; icon: string }[]
}

const STEPS: Step[] = [
  {
    key: 'goal',
    question: 'What is your main fitness goal?',
    emoji: '🎯',
    options: [
      { value: 'lose_weight',       label: 'Lose Weight',        desc: 'Burn fat & get lean',         icon: '🔥' },
      { value: 'gain_muscle',       label: 'Gain Muscle',        desc: 'Build strength & size',        icon: '💪' },
      { value: 'maintain',          label: 'Maintain',           desc: 'Stay fit & healthy',           icon: '⚖️' },
      { value: 'improve_endurance', label: 'Improve Endurance',  desc: 'Boost stamina & cardio',       icon: '🏃' },
    ],
  },
  {
    key: 'health_issues',
    question: 'Do you have any health issues we should know about?',
    emoji: '🏥',
    options: [
      { value: 'none',             label: 'None',            desc: 'I\'m healthy & injury-free',   icon: '✅' },
      { value: 'back_pain',        label: 'Back Pain',       desc: 'Lower / upper back issues',     icon: '🦴' },
      { value: 'knee_issues',      label: 'Knee Issues',     desc: 'Knee pain or past injuries',    icon: '🦵' },
      { value: 'heart_condition',  label: 'Heart Condition', desc: 'Cardiac or blood pressure',     icon: '❤️' },
    ],
  },
  {
    key: 'workout_days',
    question: 'How many days a week do you work out?',
    emoji: '📅',
    options: [
      { value: '1-2',      label: '1–2 days',  desc: 'Just getting started',       icon: '🌱' },
      { value: '3-4',      label: '3–4 days',  desc: 'Regular gym-goer',           icon: '💪' },
      { value: '5-6',      label: '5–6 days',  desc: 'Dedicated & consistent',     icon: '🏆' },
      { value: 'everyday', label: 'Every day', desc: 'Full commitment mode',        icon: '🔥' },
    ],
  },
  {
    key: 'fitness_level',
    question: 'What is your fitness level?',
    emoji: '📊',
    options: [
      { value: 'beginner',      label: 'Beginner',      desc: 'New to working out',           icon: '🌱' },
      { value: 'intermediate',  label: 'Intermediate',  desc: '1–2 years experience',         icon: '💪' },
      { value: 'advanced',      label: 'Advanced',      desc: '3+ years, serious training',   icon: '🏋️' },
      { value: 'professional',  label: 'Professional',  desc: 'Athlete or trainer level',     icon: '🏆' },
    ],
  },
  {
    key: 'timeline',
    question: 'When do you want to reach your goal?',
    emoji: '⏱️',
    options: [
      { value: '1_month',  label: '1 Month',   desc: 'Fast & focused',          icon: '⚡' },
      { value: '3_months', label: '3 Months',  desc: 'Steady & sustainable',    icon: '📈' },
      { value: '6_months', label: '6 Months',  desc: 'Solid transformation',    icon: '🎯' },
      { value: '1_year',   label: '1 Year',    desc: 'Long-term lifestyle',      icon: '🏆' },
    ],
  },
]

export default function SubscriptionQuestionnaire({ profile, onComplete, onClose }: Props) {
  const [step, setStep]       = useState(0)
  const [saving, setSaving]   = useState(false)
  const [answers, setAnswers] = useState<Partial<QuestionnaireAnswers>>({})

  const current    = STEPS[step]
  const total      = STEPS.length
  const progress   = ((step) / total) * 100
  const selected   = answers[current.key]

  function handleSelect(value: string) {
    setAnswers(prev => ({ ...prev, [current.key]: value }))
  }

  async function handleNext() {
    if (!selected) return
    if (step < total - 1) { setStep(s => s + 1); return }

    // Last step — save & complete
    setSaving(true)
    const full = answers as QuestionnaireAnswers

    await supabase
      .from('subscription_questionnaire')
      .upsert({
        user_profile_id: profile.id,
        ...full,
      }, { onConflict: 'user_profile_id' })

    setSaving(false)
    onComplete(full)
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-gray-900 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md border border-gray-700 shadow-2xl flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
          <div>
            <p className="text-xs text-gray-500 font-medium">Step {step + 1} of {total}</p>
            <h2 className="text-lg font-bold text-white mt-0.5">Personalise Your Plan</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-5 pb-4 flex-shrink-0">
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-600 to-orange-400 rounded-full transition-all duration-500"
              style={{ width: `${progress + (100 / total)}%` }}
            />
          </div>
        </div>

        {/* Question */}
        <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-4">
          <div className="text-center mb-2">
            <div className="text-4xl mb-2">{current.emoji}</div>
            <p className="text-white font-semibold text-base">{current.question}</p>
          </div>

          <div className="space-y-2.5">
            {current.options.map(opt => (
              <button
                key={opt.value}
                onClick={() => handleSelect(opt.value)}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all active:scale-[0.98] ${
                  selected === opt.value
                    ? 'border-orange-500 bg-orange-500/10'
                    : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                }`}
              >
                <span className="text-2xl flex-shrink-0">{opt.icon}</span>
                <div className="flex-1">
                  <div className={`font-semibold text-sm ${selected === opt.value ? 'text-orange-300' : 'text-white'}`}>
                    {opt.label}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">{opt.desc}</div>
                </div>
                {selected === opt.value && (
                  <div className="w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-800 flex gap-3 flex-shrink-0">
          {step > 0 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="flex items-center gap-1.5 px-4 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 transition font-semibold text-sm"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={!selected || saving}
            className="flex-1 bg-gradient-to-r from-orange-600 to-orange-400 hover:from-orange-500 hover:to-orange-300 disabled:opacity-40 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
            ) : step === total - 1 ? (
              <>Build My Plan ✨</>
            ) : (
              <>Next <ChevronRight className="w-4 h-4" /></>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
