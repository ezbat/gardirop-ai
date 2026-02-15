"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Send, Loader2, Check, XCircle, Clock, Star, TrendingUp, Award, Package } from "lucide-react"
import FloatingParticles from "@/components/floating-particles"

interface SellerRequest {
  id: string
  seller_id: string
  request_type: string
  current_value: string
  requested_value: string
  reason: string
  status: string
  admin_response: string
  created_at: string
  seller: {
    id: string
    shop_name: string
    phone: string
  }
}

export default function AdminRequestsPage() {
  const { data: session } = useSession()
  const userId = session?.user?.id

  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [requests, setRequests] = useState<SellerRequest[]>([])
  const [filter, setFilter] = useState<string>('pending')
  const [selectedRequest, setSelectedRequest] = useState<SellerRequest | null>(null)
  const [adminResponse, setAdminResponse] = useState('')

  const requestTypes = [
    { value: 'increase_product_limit', label: 'Produktlimit erhöhen', icon: Package },
    { value: 'featured_store', label: 'Empfohlener Shop', icon: Star },
    { value: 'verified_badge', label: 'Verifiziertes Abzeichen', icon: Award },
    { value: 'premium_plan', label: 'Premium-Plan', icon: TrendingUp },
    { value: 'other', label: 'Andere', icon: Send }
  ]

  useEffect(() => {
    if (userId) {
      loadRequests()
    }
  }, [userId, filter])

  const loadRequests = async () => {
    try {
      const url = filter ? `/api/admin/seller-requests?status=${filter}` : '/api/admin/seller-requests'
      const response = await fetch(url, {
        headers: { 'x-user-id': userId! }
      })
      const data = await response.json()

      if (response.ok) {
        setRequests(data.requests || [])
      }
    } catch (error) {
      console.error('Load requests error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = async (requestId: string, status: string) => {
    if (!adminResponse.trim()) {
      alert('Bitte fügen Sie eine Antwort hinzu!')
      return
    }

    setProcessing(requestId)
    try {
      const response = await fetch('/api/admin/seller-requests', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId!
        },
        body: JSON.stringify({
          requestId,
          status,
          adminResponse
        })
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.error || 'Fehler beim Aktualisieren!')
        return
      }

      alert('✅ Status erfolgreich aktualisiert!')
      setSelectedRequest(null)
      setAdminResponse('')
      loadRequests()
    } catch (error) {
      console.error('Update status error:', error)
      alert('Fehler beim Aktualisieren!')
    } finally {
      setProcessing(null)
    }
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: { icon: Clock, text: 'Ausstehend', color: 'bg-yellow-500/20 text-yellow-500' },
      approved: { icon: Check, text: 'Genehmigt', color: 'bg-green-500/20 text-green-500' },
      rejected: { icon: XCircle, text: 'Abgelehnt', color: 'bg-red-500/20 text-red-500' }
    }

    const badge = badges[status as keyof typeof badges] || badges.pending
    const Icon = badge.icon

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${badge.color}`}>
        <Icon className="w-3 h-3" />
        {badge.text}
      </span>
    )
  }

  const getRequestTypeInfo = (type: string) => {
    return requestTypes.find(rt => rt.value === type) || requestTypes[4]
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <FloatingParticles />
      <section className="relative py-8 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-8">
            <Send className="w-16 h-16 text-primary mx-auto mb-4" />
            <h1 className="font-serif text-4xl font-bold mb-2">Verkäufer-Anfragen</h1>
            <p className="text-muted-foreground">Shop-Verbesserungsanfragen verwalten</p>
          </div>

          {/* Filter */}
          <div className="flex items-center gap-3 mb-6">
            {['pending', 'approved', 'rejected'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-xl font-semibold transition-colors ${
                  filter === status
                    ? 'bg-primary text-primary-foreground'
                    : 'glass border border-border hover:bg-primary/5'
                }`}
              >
                {status === 'pending' && 'Ausstehend'}
                {status === 'approved' && 'Genehmigt'}
                {status === 'rejected' && 'Abgelehnt'}
              </button>
            ))}
          </div>

          {/* Requests List */}
          <div className="space-y-4">
            {requests.length === 0 ? (
              <div className="text-center py-12 glass border border-border rounded-2xl">
                <Send className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Keine Anfragen in dieser Kategorie</p>
              </div>
            ) : (
              requests.map((req) => {
                const typeInfo = getRequestTypeInfo(req.request_type)
                const Icon = typeInfo.icon

                return (
                  <div key={req.id} className="glass border border-border rounded-2xl p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                          <Icon className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-bold text-xl">{req.seller.shop_name}</h3>
                          <p className="text-sm text-muted-foreground">{req.seller.phone}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(req.created_at).toLocaleDateString('de-DE', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(req.status)}
                    </div>

                    {/* Request Type */}
                    <div className="mb-3">
                      <p className="text-sm text-muted-foreground mb-1">Anfragetyp:</p>
                      <p className="font-semibold text-lg">{typeInfo.label}</p>
                    </div>

                    {/* Values */}
                    {req.current_value && (
                      <div className="flex items-center gap-2 mb-4 text-sm">
                        <span className="text-muted-foreground">Von:</span>
                        <span className="font-semibold">{req.current_value}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="font-semibold text-primary">{req.requested_value}</span>
                      </div>
                    )}

                    {/* Seller Reason */}
                    <div className="glass border border-border rounded-xl p-4 mb-4">
                      <p className="text-sm font-semibold text-primary mb-2">Begründung des Verkäufers:</p>
                      <p className="text-sm whitespace-pre-wrap">{req.reason}</p>
                    </div>

                    {/* Admin Response */}
                    {req.admin_response && (
                      <div className={`glass border rounded-xl p-4 mb-4 ${
                        req.status === 'approved' ? 'border-green-500/50 bg-green-500/5' :
                        req.status === 'rejected' ? 'border-red-500/50 bg-red-500/5' :
                        'border-primary/50 bg-primary/5'
                      }`}>
                        <p className="text-sm font-semibold text-primary mb-2">Ihre Antwort:</p>
                        <p className="text-sm whitespace-pre-wrap">{req.admin_response}</p>
                      </div>
                    )}

                    {/* Actions */}
                    {req.status === 'pending' && (
                      <div className="space-y-3">
                        <textarea
                          value={selectedRequest?.id === req.id ? adminResponse : ''}
                          onChange={(e) => {
                            setSelectedRequest(req)
                            setAdminResponse(e.target.value)
                          }}
                          placeholder="Ihre Antwort an den Verkäufer..."
                          rows={3}
                          className="w-full px-4 py-2 glass border border-border rounded-xl outline-none focus:border-primary resize-none"
                        />

                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleUpdateStatus(req.id, 'approved')}
                            disabled={processing === req.id || !adminResponse.trim()}
                            className="flex-1 px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            {processing === req.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                            Genehmigen
                          </button>

                          <button
                            onClick={() => handleUpdateStatus(req.id, 'rejected')}
                            disabled={processing === req.id || !adminResponse.trim()}
                            className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            <XCircle className="w-5 h-5" />
                            Ablehnen
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
