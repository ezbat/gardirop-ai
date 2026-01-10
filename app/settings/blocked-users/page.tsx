"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Search, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface BlockedUser {
  id: string
  name: string
  username: string | null
  avatar_url: string | null
}

export default function BlockedUsersPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const userId = session?.user?.id
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [unblocking, setUnblocking] = useState<string | null>(null)

  useEffect(() => {
    if (userId) loadBlockedUsers()
  }, [userId])

  const loadBlockedUsers = async () => {
    if (!userId) return
    setLoading(true)
    try {
      const { data: blockedData, error } = await supabase.from('blocked_users').select('blocked_id').eq('blocker_id', userId)
      if (error) throw error
      const blockedIds = (blockedData || []).map(b => b.blocked_id)
      if (blockedIds.length > 0) {
        const { data: usersData } = await supabase.from('users').select('id, name, username, avatar_url').in('id', blockedIds)
        setBlockedUsers(usersData || [])
      }
    } catch (error) {
      console.error('Load blocked users error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUnblock = async (blockedId: string) => {
    if (!userId || unblocking) return
    setUnblocking(blockedId)
    try {
      const response = await fetch('/api/blocked-users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ blockerId: userId, blockedId, action: 'unblock' }) })
      if (!response.ok) throw new Error('Failed')
      setBlockedUsers(prev => prev.filter(u => u.id !== blockedId))
    } catch (error) {
      console.error('Unblock error:', error)
      alert('İşlem başarısız!')
    } finally {
      setUnblocking(null)
    }
  }

  const filteredUsers = blockedUsers.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.username?.toLowerCase().includes(searchQuery.toLowerCase()))

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 hover:bg-secondary rounded-lg"><ChevronLeft className="w-6 h-6" /></button>
        <h1 className="text-xl font-bold">Engellenenler</h1>
      </div>
      <div className="p-4">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Ara" className="w-full pl-10 pr-4 py-2 glass border border-border rounded-xl outline-none focus:border-primary" />
        </div>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : blockedUsers.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🚫</div>
            <h3 className="text-xl font-bold mb-2">Engellenen yok</h3>
            <p className="text-sm text-muted-foreground">Engellediğin kullanıcılar burada görünür</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground mb-3">{filteredUsers.length} kişi</p>
            {filteredUsers.map(user => (
              <div key={user.id} className="flex items-center gap-3 p-2">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-primary">
                  {user.avatar_url ? (<img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />) : (<div className="w-full h-full flex items-center justify-center text-white font-bold text-lg">{user.name[0].toUpperCase()}</div>)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate">{user.name}</p>
                  {user.username && <p className="text-sm text-muted-foreground truncate">@{user.username}</p>}
                </div>
                <button onClick={() => handleUnblock(user.id)} disabled={unblocking === user.id} className="px-4 py-2 glass border border-border rounded-lg font-semibold text-sm hover:bg-secondary transition-colors">
                  {unblocking === user.id ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Engeli Kaldır'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}