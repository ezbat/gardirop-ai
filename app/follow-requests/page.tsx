"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Loader2, X, Check } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface FollowRequest {
  id: string
  requester_id: string
  status: string
  created_at: string
  requester: {
    id: string
    name: string
    username: string | null
    avatar_url: string | null
  }
}

export default function FollowRequestsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const userId = session?.user?.id
  const [requests, setRequests] = useState<FollowRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)

  useEffect(() => {
    if (userId) loadRequests()
  }, [userId])

  const loadRequests = async () => {
    if (!userId) return
    setLoading(true)
    try {
      const { data: requestsData, error } = await supabase.from('follow_requests').select('id, requester_id, status, created_at').eq('requested_id', userId).eq('status', 'pending').order('created_at', { ascending: false })
      if (error) throw error
      
      const requesterIds = (requestsData || []).map(r => r.requester_id)
      if (requesterIds.length > 0) {
        const { data: usersData } = await supabase.from('users').select('id, name, username, avatar_url').in('id', requesterIds)
        const requestsWithUsers = (requestsData || []).map(req => {
          const user = usersData?.find(u => u.id === req.requester_id)
          return { ...req, requester: user }
        }).filter(r => r.requester)
        setRequests(requestsWithUsers as FollowRequest[])
      }
    } catch (error) {
      console.error('Load requests error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (requesterId: string) => {
    if (!userId || processing) return
    setProcessing(requesterId)
    try {
      const response = await fetch('/api/follow-request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requesterId, requestedId: userId, action: 'approve' }) })
      if (!response.ok) throw new Error('Failed')
      setRequests(prev => prev.filter(r => r.requester_id !== requesterId))
    } catch (error) {
      console.error('Approve error:', error)
      alert('İşlem başarısız!')
    } finally {
      setProcessing(null)
    }
  }

  const handleReject = async (requesterId: string) => {
    if (!userId || processing) return
    setProcessing(requesterId)
    try {
      const response = await fetch('/api/follow-request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requesterId, requestedId: userId, action: 'reject' }) })
      if (!response.ok) throw new Error('Failed')
      setRequests(prev => prev.filter(r => r.requester_id !== requesterId))
    } catch (error) {
      console.error('Reject error:', error)
      alert('İşlem başarısız!')
    } finally {
      setProcessing(null)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 hover:bg-secondary rounded-lg"><ChevronLeft className="w-6 h-6" /></button>
        <h1 className="text-xl font-bold">Takip İstekleri</h1>
      </div>
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-20 px-4">
          <div className="text-6xl mb-4">👥</div>
          <h3 className="text-xl font-bold mb-2">Takip isteği yok</h3>
          <p className="text-sm text-muted-foreground">Hesabın gizli olduğunda, takip istekleri burada görünür</p>
        </div>
      ) : (
        <div className="p-4 space-y-2">
          {requests.map((request) => (
            <div key={request.id} className="flex items-center gap-3 p-3 glass border border-border rounded-xl">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-primary">
                {request.requester.avatar_url ? (
                  <img src={request.requester.avatar_url} alt={request.requester.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg">{request.requester.name[0].toUpperCase()}</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold truncate">{request.requester.name}</p>
                {request.requester.username && <p className="text-sm text-muted-foreground truncate">@{request.requester.username}</p>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleApprove(request.requester_id)} disabled={processing === request.requester_id} className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-50">
                  {processing === request.requester_id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                </button>
                <button onClick={() => handleReject(request.requester_id)} disabled={processing === request.requester_id} className="w-10 h-10 rounded-full glass border border-border flex items-center justify-center hover:bg-secondary transition-colors disabled:opacity-50">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}