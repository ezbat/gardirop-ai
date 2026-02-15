"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Radio, Users, Eye, ArrowLeft } from 'lucide-react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'

interface LiveStream {
  id: string
  seller_id: string
  title: string
  description: string
  viewer_count: number
  thumbnail_url: string
  is_live: boolean
  seller: {
    user: {
      id: string
      name: string
      avatar_url: string
    }
  }
}

export default function LiveStreamsPage() {
  const router = useRouter()
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadLiveStreams()

    // Real-time subscription for live streams
    const channel = supabase
      .channel('live-streams-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_streams',
          filter: 'is_live=eq.true'
        },
        () => {
          loadLiveStreams()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const loadLiveStreams = async () => {
    try {
      const { data, error } = await supabase
        .from('live_streams')
        .select(`
          id,
          seller_id,
          title,
          description,
          viewer_count,
          thumbnail_url,
          is_live,
          seller:sellers!seller_id (
            user:users!user_id (
              id,
              name,
              avatar_url
            )
          )
        `)
        .eq('is_live', true)
        .order('started_at', { ascending: false })

      if (error) throw error
      setLiveStreams((data || []) as any)
    } catch (error) {
      console.error('Error loading live streams:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen-mobile bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-10 safe-area-top">
        <div className="flex items-center gap-4 p-4">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center tap-highlight-none"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Live Now</h1>
            <p className="text-sm text-muted-foreground">
              {liveStreams.length} active {liveStreams.length === 1 ? 'stream' : 'streams'}
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 text-red-500 rounded-full">
            <Radio className="w-4 h-4 animate-pulse" />
            <span className="text-sm font-semibold">LIVE</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-secondary rounded-2xl animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && liveStreams.length === 0 && (
          <div className="text-center py-16">
            <Radio className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-semibold mb-2">No live streams</p>
            <p className="text-muted-foreground">Check back later for live shopping events</p>
          </div>
        )}

        {liveStreams.map((stream) => (
          <motion.button
            key={stream.id}
            layout
            onClick={() => router.push(`/live/${stream.id}`)}
            className="w-full mb-4 relative rounded-2xl overflow-hidden tap-highlight-none active:scale-[0.98] transition-transform"
          >
            {/* Thumbnail/Preview */}
            <div className="relative h-48 bg-gradient-to-br from-purple-600 to-pink-500">
              {stream.thumbnail_url && (
                <img
                  src={stream.thumbnail_url}
                  alt={stream.title}
                  className="w-full h-full object-cover"
                />
              )}

              {/* Live badge */}
              <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1 bg-red-500 rounded-full">
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span className="text-white text-sm font-semibold">LIVE</span>
              </div>

              {/* Viewer count */}
              <div className="absolute top-3 right-3 flex items-center gap-1 px-3 py-1 bg-black/60 backdrop-blur-sm rounded-full">
                <Eye className="w-4 h-4 text-white" />
                <span className="text-white text-sm font-semibold">
                  {stream.viewer_count}
                </span>
              </div>
            </div>

            {/* Info */}
            <div className="p-4 bg-secondary text-left">
              <div className="flex items-start gap-3">
                <img
                  src={stream.seller.user.avatar_url || '/default-avatar.png'}
                  alt={stream.seller.user.name}
                  className="w-10 h-10 rounded-full"
                />
                <div className="flex-1">
                  <h3 className="font-semibold line-clamp-1">{stream.title}</h3>
                  <p className="text-sm text-muted-foreground">{stream.seller.user.name}</p>
                  {stream.description && (
                    <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                      {stream.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  )
}
