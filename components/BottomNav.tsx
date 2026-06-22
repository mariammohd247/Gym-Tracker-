'use client'

import { Home, Image, User, Zap, Crown, ShieldCheck } from 'lucide-react'
import { UserProfile } from '@/lib/types'

export type Tab = 'home' | 'plan' | 'gallery' | 'profile' | 'admin'

interface Props {
  active: Tab
  profile: UserProfile
  onChange: (tab: Tab) => void
}

export default function BottomNav({ active, profile, onChange }: Props) {
  const plan = profile.subscription_plan
  const isStaff = ['admin', 'coach', 'owner'].includes(profile.role)

  const tabs: { id: Tab; label: string; icon: React.ReactNode; premium?: boolean; staff?: boolean }[] = [
    { id: 'home',    label: 'Home',    icon: <Home    className="w-5 h-5" /> },
    {
      id: 'plan',
      label: plan === 'elite' ? 'Elite' : 'Pro',
      icon: plan === 'elite'
        ? <Crown className="w-5 h-5" />
        : <Zap  className="w-5 h-5" />,
      premium: true,
    },
    { id: 'gallery', label: 'Gallery', icon: <Image   className="w-5 h-5" /> },
    { id: 'profile', label: 'Profile', icon: <User    className="w-5 h-5" /> },
    ...(isStaff ? [{ id: 'admin' as Tab, label: 'Admin', icon: <ShieldCheck className="w-5 h-5" />, staff: true }] : []),
  ]

  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 bg-gray-900/95 backdrop-blur border-t border-gray-800 flex">
      {tabs.map(tab => {
        const isActive  = active === tab.id
        const locked    = tab.premium && plan === 'free'
        const color     = tab.id === 'admin'
          ? 'text-green-400'
          : tab.id === 'plan'
            ? (plan === 'elite' ? 'text-purple-400' : 'text-orange-400')
            : 'text-orange-400'

        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-all relative ${
              locked ? 'opacity-40' : 'active:scale-95'
            }`}
          >
            <span className={isActive ? color : 'text-gray-500'}>
              {tab.icon}
            </span>
            <span className={`text-[10px] font-semibold ${isActive ? color : 'text-gray-500'}`}>
              {tab.label}
            </span>

            {/* Active indicator dot */}
            {isActive && (
              <span className={`absolute top-1.5 w-1 h-1 rounded-full ${
                tab.id === 'admin' ? 'bg-green-400' :
                tab.id === 'plan' && plan === 'elite' ? 'bg-purple-400' : 'bg-orange-400'
              }`} />
            )}

            {/* Lock badge for non-subscribers */}
            {locked && (
              <span className="absolute top-1 right-[calc(50%-14px)] text-[8px] bg-orange-500 text-white px-1 rounded-full font-bold">
                PRO
              </span>
            )}
          </button>
        )
      })}
    </nav>
  )
}
