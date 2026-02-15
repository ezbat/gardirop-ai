"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowLeft, Radio, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function StartLivePage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [isCreating, setIsCreating] = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    description: ''
  })

  if (!session) {
    router.push('/auth/signin')
    return null
  }

  const handleStartLive = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreating(true)

    try {
      const channelName = `live_${Date.now()}_${session.user.id}`
      const streamKey = crypto.randomUUID()

      // Check if user is a seller
      const { data: seller } = await supabase
        .from('sellers')
        .select('id')
        .eq('user_id', session.user.id)
        .single()

      if (!seller) {
        alert('You must be a seller to start a live stream')
        router.push('/seller-application')
        return
      }

      // Create live stream record
      const { data: stream, error } = await supabase
        .from('live_streams')
        .insert({
          seller_id: seller.id,
          title: formData.title,
          description: formData.description,
          channel_name: channelName,
          stream_key: streamKey,
          is_live: true,
          started_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      // Redirect to live stream page
      router.push(`/live/${stream.id}?mode=broadcaster`)
    } catch (error) {
      console.error('Error starting live:', error)
      alert('Failed to start live stream')
    } finally {
      setIsCreating(false)
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
          <h1 className="text-xl font-bold flex-1">Go Live</h1>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleStartLive} className="p-4 space-y-6">
        {/* Preview placeholder */}
        <div className="relative h-64 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center overflow-hidden">
          <div className="text-center text-white">
            <Radio className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-semibold">Camera preview</p>
            <p className="text-sm opacity-75">Preview will show when live starts</p>
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="text-sm font-medium mb-2 block">Stream Title</label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            className="w-full h-12 px-4 bg-secondary rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="What are you selling today?"
            maxLength={100}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {formData.title.length}/100 characters
          </p>
        </div>

        {/* Description */}
        <div>
          <label className="text-sm font-medium mb-2 block">
            Description (optional)
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className="w-full h-24 p-4 bg-secondary rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Tell viewers what to expect..."
            maxLength={300}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {formData.description.length}/300 characters
          </p>
        </div>

        {/* Info boxes */}
        <div className="space-y-3">
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
            <p className="text-sm text-blue-600 dark:text-blue-400">
              💡 <strong>Tip:</strong> Pin products during your live stream to boost sales
            </p>
          </div>
          <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
            <p className="text-sm text-purple-600 dark:text-purple-400">
              ⚡ <strong>Live features:</strong> Real-time chat, instant purchases, viewer notifications
            </p>
          </div>
        </div>

        {/* Start button */}
        <button
          type="submit"
          disabled={isCreating || !formData.title.trim()}
          className="w-full h-14 rounded-full bg-gradient-to-r from-red-500 to-pink-500 text-white font-semibold flex items-center justify-center gap-2 tap-highlight-none active:scale-95 transition-transform disabled:opacity-50 disabled:scale-100"
        >
          {isCreating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Starting Live...</span>
            </>
          ) : (
            <>
              <Radio className="w-5 h-5" />
              <span>Go Live Now</span>
            </>
          )}
        </button>
      </form>
    </div>
  )
}
