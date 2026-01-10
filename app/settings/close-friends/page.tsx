"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { X, Search, Loader2, Check } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface User {
  id: string
  name: string
  username: string | null
  avatar_url: string | null
}

export default function CloseFriendsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const userId = session?.user?.id
  const [closeFriends, setCloseFriends] = useState<User[]>([])
  const [suggestions, setSuggestions] = useState<User[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)

  useEffect(() => {
    if (userId) {
      loadCloseFriends()
      loadSuggestions()
    }
  }, [userId])

  const loadCloseFriends = async () => {
    if (!userId) return
    setLoading(true)
    try {
      const { data: friendsData, error } = await supabase.from('close_friends').select('friend_id').eq('user_id', userId)
      if (error) throw error
      const friendIds = (friendsData || []).map(f => f.friend_id)
      if (friendIds.length > 0) {
        const { data: usersData } = await supabase.from('users').select('id, name, username, avatar_url').in('id', friendIds)
        setCloseFriends(usersData || [])
      }
    } catch (error) {
      console.error('Load close friends error:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadSuggestions = async () => {
    if (!userId) return
    try {
      const { data: followingData } = await supabase.from('follows').select('following_id').eq('follower_id', userId)
      const followingIds = (followingData || []).map(f => f.following_id)
      if (followingIds.length > 0) {
        const { data: usersData } = await supabase.from('users').select('id, name, username, avatar_url').in('id', followingIds).limit(20)
        setSuggestions(usersData || [])
      }
    } catch (error) {
      console.error('Load suggestions error:', error)
    }
  }

  const handleToggle = async (friendId: string, isAdded: boolean) => {
    if (!userId || processing) return
    setProcessing(friendId)
    try {
      const response = await fetch('/api/close-friends', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, friendId, action: isAdded ? 'remove' : 'add' }) })
      if (!response.ok) throw new Error('Failed')
      if (isAdded) {
        setCloseFriends(prev => prev.filter(u => u.id !== friendId))
      } else {
        const user = suggestions.find(u => u.id === friendId)
        if (user) setCloseFriends(prev => [...prev, user])
      }
    } catch (error) {
      console.error('Toggle error:', error)
      alert('İşlem başarısız!')
    } finally {
      setProcessing(null)
    }
  }

  const filteredSuggestions = suggestions.filter(u => !closeFriends.find(cf => cf.id === u.id) && (u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.username?.toLowerCase().includes(searchQuery.toLowerCase())))

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
        <button onClick={() => router.back()} className="p-2 hover:bg-secondary rounded-lg"><X className="w-6 h-6" /></button>
        <h1 className="text-xl font-bold flex-1 text-center">Yakın Arkadaşlar</h1>
        <div className="w-10" />
      </div>
      <div className="p-4">
        <p className="text-sm text-muted-foreground mb-4">Yakın Arkadaşlar listeni düzenlediğinde bildirim göndermeyiz. Nasıl çalışır?</p>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Ara" className="w-full pl-10 pr-4 py-2 glass border border-border rounded-xl outline-none focus:border-primary" />
        </div>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-6">
            {closeFriends.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-bold">{closeFriends.length} kişi</p>
                  <button className="text-sm text-primary font-semibold">Tümünü Temizle</button>
                </div>
                <div className="space-y-2">
                  {closeFriends.map(user => (
                    <div key={user.id} className="flex items-center gap-3 p-2">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-primary">
                        {user.avatar_url ? (<img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />) : (<div className="w-full h-full flex items-center justify-center text-white font-bold text-lg">{user.name[0].toUpperCase()}</div>)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold truncate">{user.name}</p>
                        {user.username && <p className="text-sm text-muted-foreground truncate">@{user.username}</p>}
                      </div>
                      <button onClick={() => handleToggle(user.id, true)} disabled={processing === user.id} className="w-10 h-10 rounded-full flex items-center justify-center bg-primary text-white">
                        {processing === user.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {filteredSuggestions.length > 0 && (
              <div>
                <p className="text-sm font-bold mb-3">Öneriler</p>
                <div className="space-y-2">
                  {filteredSuggestions.map(user => (
                    <div key={user.id} className="flex items-center gap-3 p-2">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-primary">
                        {user.avatar_url ? (<img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />) : (<div className="w-full h-full flex items-center justify-center text-white font-bold text-lg">{user.name[0].toUpperCase()}</div>)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold truncate">{user.name}</p>
                        {user.username && <p className="text-sm text-muted-foreground truncate">@{user.username}</p>}
                      </div>
                      <button onClick={() => handleToggle(user.id, false)} disabled={processing === user.id} className="w-20 px-3 py-1 glass border border-border rounded-lg font-semibold text-sm hover:bg-secondary transition-colors">
                        {processing === user.id ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Ekle'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}