'use client'

import dynamic from 'next/dynamic'

// ssr: false prevents Supabase from being instantiated during server-side
// prerendering at build time (it requires env vars only available at runtime).
const HomeClient = dynamic(() => import('./HomeClient'), { ssr: false })

export default function Home() {
  return <HomeClient />
}
