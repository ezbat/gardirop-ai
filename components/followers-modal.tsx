"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { X, Loader2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { supabase } from "@/lib/supabase"

interface User {
  id: string
  name: string
  username: string | null
  avatar_url: string | null
}

interface FollowersModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  initialTab?: 'followers' | 'following'
}

export default function FollowersModal({ isOpen, onClose, userId, initialTab = 'followers' }: FollowersModalProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(initialTab)
  const [followers, setFollowers] = useState<User[]>([])
  const [following, setFollowing] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen && userId) {
      loadFollowers()
      loadFollowing()
    }
  }, [isOpen, userId])

  const loadFollowers = async () => {
    setLoading(true)
    try {
      const { data: followsData, error } = await supabase.from('follows').select('follower_id').eq('following_id', userId)
      if (error) throw error
      const followerIds = (followsData || []).map(f => f.follower_id)
      if (followerIds.length > 0) {
        const { data: usersData } = await supabase.from('users').select('id, name, username, avatar_url').in('id', followerIds)
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
    try {
      const { data: followsData, error } = await supabase.from('follows').select('following_id').eq('follower_id', userId)
      if (error) throw error
      const followingIds = (followsData || []).map(f => f.following_id)
      if (followingIds.length > 0) {
        const { data: usersData } = await supabase.from('users').select('id, name, username, avatar_url').in('id', followingIds)
        setFollowing(usersData || [])
      } else {
        setFollowing([])
      }
    } catch (error) {
      console.error('Load following error:', error)
    }
  }

  const handleUserClick = (clickedUserId: string) => {
    onClose()
    router.push(`/profile/${clickedUserId}`)
  }

  if (!isOpen) return null

  const currentList = activeTab === 'followers' ? followers : following

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="relative w-full max-w-md bg-background rounded-2xl overflow-hidden max-h-[80vh] flex flex-col">
          <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between z-10">
            <h2 className="text-xl font-bold">{activeTab === 'followers' ? 'Takipçiler' : 'Takip Edilenler'}</h2>
            <button onClick={onClose} className="p-2 hover:bg-secondary rounded-lg transition-colors"><X className="w-5 h-5" /></button>
          </div>
          <div className="flex border-b border-border bg-background sticky top-[73px] z-10">
            <button onClick={() => setActiveTab('followers')} className={`flex-1 py-3 font-semibold transition-colors ${activeTab === 'followers' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}>Takipçiler</button>
            <button onClick={() => setActiveTab('following')} className={`flex-1 py-3 font-semibold transition-colors ${activeTab === 'following' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}>Takip Edilenler</button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : currentList.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">👥</div>
                <h3 className="text-xl font-bold mb-2">{activeTab === 'followers' ? 'Takipçi yok' : 'Kimseyi takip etmiyor'}</h3>
                <p className="text-sm text-muted-foreground">{activeTab === 'followers' ? 'Henüz takipçi yok' : 'Henüz kimseyi takip etmiyor'}</p>
              </div>
            ) : (
              <div className="p-4 space-y-2">
                {currentList.map((user) => (
                  <button key={user.id} onClick={() => handleUserClick(user.id)} className="w-full flex items-center gap-3 p-3 hover:bg-secondary rounded-xl transition-colors">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-primary">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg">{user.name[0].toUpperCase()}</div>
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-bold">{user.name}</p>
                      {user.username && <p className="text-sm text-muted-foreground">@{user.username}</p>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}