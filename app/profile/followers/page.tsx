"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface User {
  id: string
  name: string
  username: string | null
  avatar_url: string | null
  bio: string | null
}

export default function FollowersPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const userId = session?.user?.id
  const targetUserId = searchParams.get('userId') || userId
  const initialTab = searchParams.get('tab') || 'followers'
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(initialTab as any)
  const [followers, setFollowers] = useState<User[]>([])
  const [following, setFollowing] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [followStates, setFollowStates] = useState<Record<string, boolean>>({})
  const [processing, setProcessing] = useState<string | null>(null)

  useEffect(() => {
    if (targetUserId) {
      loadFollowers()
      loadFollowing()
      if (userId) loadFollowStates()
    }
  }, [targetUserId, userId])

  const loadFollowers = async () => {
    if (!targetUserId) return
    setLoading(true)
    try {
      const { data: followsData, error } = await supabase.from('follows').select('follower_id').eq('following_id', targetUserId)
      if (error) throw error
      const followerIds = (followsData || []).map(f => f.follower_id)
      if (followerIds.length > 0) {
        const { data: usersData } = await supabase.from('users').select('id, name, username, avatar_url, bio').in('id', followerIds)
        setFollowers(usersData || [])
      } else {
        setFollowers([])
      }
    } catch (error) {
      console.error('Load followers error:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadFollowing = async () => {
    if (!targetUserId) return
    try {
      const { data: followsData, error } = await supabase.from('follows').select('following_id').eq('follower_id', targetUserId)
      if (error) throw error
      const followingIds = (followsData || []).map(f => f.following_id)
      if (followingIds.length > 0) {
        const { data: usersData } = await supabase.from('users').select('id, name, username, avatar_url, bio').in('id', followingIds)
        setFollowing(usersData || [])
      } else {
        setFollowing([])
      }
    } catch (error) {
      console.error('Load following error:', error)
    }
  }

  const loadFollowStates = async () => {
    if (!userId) return
    try {
      const allUserIds = [...followers, ...following].map(u => u.id)
      if (allUserIds.length === 0) return
      const { data } = await supabase.from('follows').select('following_id').eq('follower_id', userId).in('following_id', allUserIds)
      const states: Record<string, boolean> = {}
      allUserIds.forEach(id => { states[id] = false })
      ;(data || []).forEach(follow => { states[follow.following_id] = true })
      setFollowStates(states)
    } catch (error) {
      console.error('Load follow states error:', error)
    }
  }

  const handleFollow = async (targetId: string, currentlyFollowing: boolean) => {
    if (!userId || processing) return
    setProcessing(targetId)
    try {
      const response = await fetch('/api/follow-request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requesterId: userId, requestedId: targetId, action: currentlyFollowing ? 'unfollow' : 'send' }) })
      if (!response.ok) throw new Error('Failed')
      const data = await response.json()
      if (data.following !== undefined) {
        setFollowStates(prev => ({ ...prev, [targetId]: data.following }))
      }
    } catch (error) {
      console.error('Follow action error:', error)
      alert('İşlem başarısız!')
    } finally {
      setProcessing(null)
    }
  }

  const displayUsers = activeTab === 'followers' ? followers : following

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 hover:bg-secondary rounded-lg"><ChevronLeft className="w-6 h-6" /></button>
        <h1 className="text-xl font-bold flex-1">{targetUserId === userId ? 'Takipçiler' : 'Profil'}</h1>
      </div>
      <div className="flex border-b border-border">
        <button onClick={() => setActiveTab('followers')} className={`flex-1 py-3 font-semibold border-b-2 transition-colors ${activeTab === 'followers' ? 'border-primary' : 'border-transparent'}`}>
          Takipçiler
        </button>
        <button onClick={() => setActiveTab('following')} className={`flex-1 py-3 font-semibold border-b-2 transition-colors ${activeTab === 'following' ? 'border-primary' : 'border-transparent'}`}>
          Takip
        </button>
      </div>
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : displayUsers.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">👥</div>
          <h3 className="text-xl font-bold mb-2">{activeTab === 'followers' ? 'Takipçi yok' : 'Kimseyi takip etmiyor'}</h3>
          <p className="text-sm text-muted-foreground">{activeTab === 'followers' ? 'İlk takipçilerin burada görünür' : 'Takip edilenler burada görünür'}</p>
        </div>
      ) : (
        <div className="p-4 space-y-2">
          {displayUsers.map((user) => (
            <div key={user.id} className="flex items-center gap-3 p-3">
              <Link href={user.id === userId ? '/profile' : `/profile/${user.id}`} className="w-12 h-12 rounded-full overflow-hidden bg-primary hover:opacity-80 transition-opacity">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg">{user.name[0].toUpperCase()}</div>
                )}
              </Link>
              <div className="flex-1 min-w-0">
                <Link href={user.id === userId ? '/profile' : `/profile/${user.id}`} className="font-bold hover:underline truncate block">{user.name}</Link>
                {user.username && <p className="text-sm text-muted-foreground truncate">@{user.username}</p>}
                {user.bio && <p className="text-sm text-muted-foreground truncate">{user.bio}</p>}
              </div>
              {userId && user.id !== userId && (
                <button onClick={() => handleFollow(user.id, followStates[user.id] || false)} disabled={processing === user.id} className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${followStates[user.id] ? 'glass border border-border hover:bg-secondary' : 'bg-primary text-primary-foreground hover:opacity-90'} disabled:opacity-50`}>
                  {processing === user.id ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : followStates[user.id] ? 'Takip Ediliyor' : 'Takip Et'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}