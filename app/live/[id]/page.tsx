"use client"

import { useState, useEffect } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { X, Eye, Radio, ShoppingBag, Send } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'

interface LiveStream {
  id: string
  title: string
  seller_id: string
  viewer_count: number
  pinned_product_id: string | null
  channel_name: string
  is_live: boolean
  seller: {
    user: {
      name: string
      avatar_url: string
    }
  }
}

export default function LiveStreamPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const { data: session } = useSession()

  const streamId = params.id as string
  const mode = searchParams.get('mode') // 'broadcaster' or null (viewer)

  const [stream, setStream] = useState<LiveStream | null>(null)
  const [messages, setMessages] = useState<Array<{ user: string; text: string }>>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadStream()
    setupRealtimeChat()
  }, [streamId])

  const loadStream = async () => {
    try {
      const { data, error } = await supabase
        .from('live_streams')
        .select(`
          id,
          title,
          seller_id,
          viewer_count,
          pinned_product_id,
          channel_name,
          is_live,
          seller:sellers!seller_id (
            user:users!user_id (
              name,
              avatar_url
            )
          )
        `)
        .eq('id', streamId)
        .single()

      if (error) throw error
      setStream(data as any)
    } catch (error) {
      console.error('Error loading stream:', error)
      alert('Stream not found')
      router.back()
    } finally {
      setIsLoading(false)
    }
  }

  const setupRealtimeChat = () => {
    const channel = supabase.channel(`live-chat-${streamId}`)

    channel
      .on('broadcast', { event: 'message' }, (payload) => {
        setMessages(prev => [...prev, payload.payload])
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !session) return

    const message = {
      user: session.user.name || 'Anonymous',
      text: newMessage.trim()
    }

    await supabase.channel(`live-chat-${streamId}`).send({
      type: 'broadcast',
      event: 'message',
      payload: message
    })

    setNewMessage('')
  }

  const endStream = async () => {
    if (!confirm('End live stream?')) return

    try {
      await supabase
        .from('live_streams')
        .update({
          is_live: false,
          ended_at: new Date().toISOString()
        })
        .eq('id', streamId)

      router.push('/live')
    } catch (error) {
      console.error('Error ending stream:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-white/20 border-t-white animate-spin" />
      </div>
    )
  }

  if (!stream) return null

  return (
    <div className="fixed inset-0 bg-black z-50">
      {/* Video placeholder (Agora.io video would go here) */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center">
        <div className="text-center text-white">
          <Radio className="w-24 h-24 mx-auto mb-4 animate-pulse" />
          <p className="text-2xl font-bold mb-2">Live Stream Video</p>
          <p className="text-white/80">Agora.io integration required</p>
          <p className="text-sm text-white/60 mt-2">
            Add NEXT_PUBLIC_AGORA_APP_ID to .env.local
          </p>
        </div>
      </div>

      {/* Top overlay */}
      <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent safe-area-top z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={stream.seller.user.avatar_url || '/default-avatar.png'}
              alt={stream.seller.user.name}
              className="w-10 h-10 rounded-full border-2 border-white"
            />
            <div>
              <p className="text-white font-semibold text-sm">{stream.seller.user.name}</p>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 px-2 py-0.5 bg-red-500 rounded-full">
                  <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  <span className="text-white text-xs font-semibold">LIVE</span>
                </div>
                <div className="flex items-center gap-1 text-white text-xs">
                  <Eye className="w-3 h-3" />
                  <span>{stream.viewer_count}</span>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => mode === 'broadcaster' ? endStream() : router.back()}
            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center tap-highlight-none"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Chat overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-4 pb-8 safe-area-bottom z-10">
        {/* Messages */}
        <div className="mb-4 space-y-2 max-h-64 overflow-y-auto hide-scrollbar">
          <AnimatePresence>
            {messages.slice(-10).map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-block px-3 py-2 bg-black/60 backdrop-blur-sm rounded-full text-white text-sm max-w-[80%]"
              >
                <span className="font-semibold">{msg.user}:</span> {msg.text}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Input */}
        {session && (
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Send a message..."
              className="flex-1 h-12 px-4 bg-black/60 backdrop-blur-sm rounded-full text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/30"
            />
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim()}
              className="w-12 h-12 rounded-full bg-primary flex items-center justify-center tap-highlight-none active:scale-95 transition-transform disabled:opacity-50"
            >
              <Send className="w-5 h-5 text-primary-foreground" />
            </button>
          </div>
        )}
      </div>

      {/* Broadcaster controls */}
      {mode === 'broadcaster' && (
        <div className="absolute right-4 bottom-32 z-10 space-y-3 safe-area-bottom safe-area-right">
          <button className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center tap-highlight-none active:scale-95 transition-transform">
            <ShoppingBag className="w-6 h-6 text-white" />
          </button>
        </div>
      )}
    </div>
  )
}
