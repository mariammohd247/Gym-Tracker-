'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { UserProfile } from '@/lib/types'
import { X, ImageIcon } from 'lucide-react'

interface SharedImage {
  id: string
  image_url: string
  created_at: string
  user_profile: { name: string } | null
  reactions: { reaction: string; count: number; reacted: boolean }[]
}

const REACTIONS = [
  { key: 'heart',     emoji: '❤️' },
  { key: 'fire',      emoji: '🔥' },
  { key: 'muscle',    emoji: '💪' },
  { key: 'thumbs_up', emoji: '👍' },
]

interface Props {
  profile: UserProfile
}

export default function GalleryTab({ profile }: Props) {
  const [images, setImages]   = useState<SharedImage[]>([])
  const [loading, setLoading] = useState(true)
  const [lightbox, setLightbox] = useState<string | null>(null)

  const loadImages = useCallback(async () => {
    setLoading(true)

    // Fetch images + who reacted with what
    const { data: imgs } = await supabase
      .from('shared_images')
      .select('id, image_url, created_at, user_profile:user_profiles(name)')
      .order('created_at', { ascending: false })

    if (!imgs) { setLoading(false); return }

    // Fetch all reactions for these images
    const imageIds = imgs.map(i => i.id)
    const { data: allReactions } = await supabase
      .from('image_reactions')
      .select('image_id, reaction, user_profile_id')
      .in('image_id', imageIds)

    const reactions = allReactions ?? []

    const enriched: SharedImage[] = imgs.map(img => ({
      id: img.id,
      image_url: img.image_url,
      created_at: img.created_at,
      user_profile: Array.isArray(img.user_profile) ? img.user_profile[0] : img.user_profile,
      reactions: REACTIONS.map(r => ({
        reaction: r.key,
        count: reactions.filter(rx => rx.image_id === img.id && rx.reaction === r.key).length,
        reacted: reactions.some(rx => rx.image_id === img.id && rx.reaction === r.key && rx.user_profile_id === profile.id),
      })),
    }))

    setImages(enriched)
    setLoading(false)
  }, [profile.id])

  useEffect(() => { loadImages() }, [loadImages])

  async function toggleReaction(imageId: string, reaction: string) {
    const img = images.find(i => i.id === imageId)
    if (!img) return
    const rx = img.reactions.find(r => r.reaction === reaction)
    if (!rx) return

    // Optimistic update
    setImages(prev => prev.map(i => i.id !== imageId ? i : {
      ...i,
      reactions: i.reactions.map(r => r.reaction !== reaction ? r : {
        ...r,
        reacted: !r.reacted,
        count: r.reacted ? r.count - 1 : r.count + 1,
      }),
    }))

    if (rx.reacted) {
      await supabase
        .from('image_reactions')
        .delete()
        .eq('image_id', imageId)
        .eq('user_profile_id', profile.id)
        .eq('reaction', reaction)
    } else {
      await supabase
        .from('image_reactions')
        .insert({ image_id: imageId, user_profile_id: profile.id, reaction })
    }
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <h2 className="text-xl font-bold text-white">Community Gallery</h2>
        <p className="text-gray-400 text-xs mt-0.5">Shared moments from the gym community</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-2 px-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-gray-800 rounded-2xl aspect-square animate-pulse" />
          ))}
        </div>
      ) : images.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
            <ImageIcon className="w-7 h-7 text-gray-600" />
          </div>
          <p className="text-gray-300 font-semibold">No shared images yet</p>
          <p className="text-gray-500 text-sm mt-1">
            Be the first to share a gym photo during a workout session!
          </p>
        </div>
      ) : (
        <div className="space-y-4 px-4">
          {images.map(img => (
            <div key={img.id} className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden">
              {/* User + time */}
              <div className="flex items-center gap-2.5 px-3 py-2.5">
                <div className="w-8 h-8 bg-orange-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-orange-400 font-bold text-sm">
                    {img.user_profile?.name?.charAt(0).toUpperCase() ?? '?'}
                  </span>
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">{img.user_profile?.name ?? 'Member'}</p>
                  <p className="text-gray-500 text-xs">{timeAgo(img.created_at)}</p>
                </div>
              </div>

              {/* Image */}
              <button
                className="w-full"
                onClick={() => setLightbox(img.image_url)}
              >
                <img
                  src={img.image_url}
                  alt="Shared workout"
                  className="w-full object-cover max-h-72"
                />
              </button>

              {/* Reactions */}
              <div className="flex items-center gap-2 px-3 py-2.5">
                {img.reactions.map(rx => {
                  const emoji = REACTIONS.find(r => r.key === rx.reaction)?.emoji ?? ''
                  return (
                    <button
                      key={rx.reaction}
                      onClick={() => toggleReaction(img.id, rx.reaction)}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-sm font-semibold transition-all active:scale-90 ${
                        rx.reacted
                          ? 'bg-orange-500/20 border border-orange-500/40 text-orange-300'
                          : 'bg-gray-700 border border-gray-600 text-gray-300 hover:border-gray-500'
                      }`}
                    >
                      <span>{emoji}</span>
                      {rx.count > 0 && <span className="text-xs">{rx.count}</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <img
            src={lightbox}
            alt="Full size"
            className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
