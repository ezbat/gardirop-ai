"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Download, Loader2, Check, XCircle, Clock, Building2, CreditCard } from "lucide-react"
import FloatingParticles from "@/components/floating-particles"

interface WithdrawalRequest {
  id: string
  seller_id: string
  amount: number
  method: string
  bank_name: string
  account_holder: string
  iban: string
  paypal_email: string
  status: string
  admin_notes: string
  created_at: string
  seller: {
    id: string
    shop_name: string
    phone: string
  }
}

export default function AdminWithdrawalsPage() {
  const { data: session } = useSession()
  const [userId, setUserId] = useState<string>('')

  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [requests, setRequests] = useState<WithdrawalRequest[]>([])
  const [filter, setFilter] = useState<string>('pending')
  const [selectedRequest, setSelectedRequest] = useState<WithdrawalRequest | null>(null)
  const [adminNotes, setAdminNotes] = useState('')

  useEffect(() => {
    // Always use m3000 as admin user to avoid localStorage tracking prevention issues
    setUserId('m3000')
  }, [])

  useEffect(() => {
    if (userId) {
      loadRequests()
    }
  }, [userId, filter])

  const loadRequests = async () => {
    if (!userId) return

    try {
      const url = filter ? `/api/admin/withdrawals?status=${filter}` : '/api/admin/withdrawals'
      const response = await fetch(url, {
        headers: { 'x-user-id': userId }
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
    if (!confirm(`Diese Anfrage wirklich ${status === 'completed' ? 'genehmigen' : 'ablehnen'}?`)) {
      return
    }

    setProcessing(requestId)
    try {
      const response = await fetch('/api/admin/withdrawals', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId!
        },
        body: JSON.stringify({
          requestId,
          status,
          adminNotes
        })
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.error || 'Fehler beim Aktualisieren!')
        return
      }

      alert('✅ Status erfolgreich aktualisiert!')
      setSelectedRequest(null)
      setAdminNotes('')
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
      approved: { icon: Check, text: 'Genehmigt', color: 'bg-blue-500/20 text-blue-500' },
      processing: { icon: Loader2, text: 'In Bearbeitung', color: 'bg-blue-500/20 text-blue-500' },
      completed: { icon: Check, text: 'Abgeschlossen', color: 'bg-green-500/20 text-green-500' },
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
            <Download className="w-16 h-16 text-primary mx-auto mb-4" />
            <h1 className="font-serif text-4xl font-bold mb-2">Auszahlungsanträge</h1>
            <p className="text-muted-foreground">Verkäufer-Auszahlungen verwalten</p>
          </div>

          {/* Filter */}
          <div className="flex items-center gap-3 mb-6 overflow-x-auto pb-2">
            {['pending', 'approved', 'processing', 'completed', 'rejected'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-xl font-semibold whitespace-nowrap transition-colors ${
                  filter === status
                    ? 'bg-primary text-primary-foreground'
                    : 'glass border border-border hover:bg-primary/5'
                }`}
              >
                {status === 'pending' && 'Ausstehend'}
                {status === 'approved' && 'Genehmigt'}
                {status === 'processing' && 'In Bearbeitung'}
                {status === 'completed' && 'Abgeschlossen'}
                {status === 'rejected' && 'Abgelehnt'}
              </button>
            ))}
          </div>

          {/* Requests List */}
          <div className="space-y-4">
            {requests.length === 0 ? (
              <div className="text-center py-12 glass border border-border rounded-2xl">
                <Download className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Keine Anfragen in dieser Kategorie</p>
              </div>
            ) : (
              requests.map((req) => (
                <div key={req.id} className="glass border border-border rounded-2xl p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-xl mb-1">{req.seller.shop_name}</h3>
                      <p className="text-sm text-muted-foreground">{req.seller.phone}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(req.created_at).toLocaleDateString('de-DE', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-primary mb-2">€{req.amount.toFixed(2)}</p>
                      {getStatusBadge(req.status)}
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div className="glass border border-border rounded-xl p-4 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      {req.method === 'bank_transfer' ? <Building2 className="w-5 h-5 text-primary" /> : <CreditCard className="w-5 h-5 text-primary" />}
                      <p className="font-semibold">{req.method === 'bank_transfer' ? 'Banküberweisung' : 'PayPal'}</p>
                    </div>

                    {req.method === 'bank_transfer' && (
                      <div className="space-y-1 text-sm">
                        <p><span className="text-muted-foreground">Bank:</span> {req.bank_name}</p>
                        <p><span className="text-muted-foreground">Kontoinhaber:</span> {req.account_holder}</p>
                        <p><span className="text-muted-foreground">IBAN:</span> <code className="bg-primary/10 px-2 py-1 rounded">{req.iban}</code></p>
                      </div>
                    )}

                    {req.method === 'paypal' && (
                      <p className="text-sm"><span className="text-muted-foreground">E-Mail:</span> {req.paypal_email}</p>
                    )}
                  </div>

                  {/* Admin Notes */}
                  {req.admin_notes && (
                    <div className="glass border border-primary/50 rounded-xl p-4 bg-primary/5 mb-4">
                      <p className="text-sm font-semibold text-primary mb-1">Admin-Hinweis:</p>
                      <p className="text-sm">{req.admin_notes}</p>
                    </div>
                  )}

                  {/* Actions */}
                  {req.status === 'pending' && (
                    <div className="space-y-3">
                      <textarea
                        value={selectedRequest?.id === req.id ? adminNotes : ''}
                        onChange={(e) => {
                          setSelectedRequest(req)
                          setAdminNotes(e.target.value)
                        }}
                        placeholder="Admin-Hinweis hinzufügen..."
                        rows={2}
                        className="w-full px-4 py-2 glass border border-border rounded-xl outline-none focus:border-primary resize-none"
                      />

                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleUpdateStatus(req.id, 'completed')}
                          disabled={processing === req.id}
                          className="flex-1 px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {processing === req.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                          Genehmigen & Auszahlen
                        </button>

                        <button
                          onClick={() => handleUpdateStatus(req.id, 'rejected')}
                          disabled={processing === req.id}
                          className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          <XCircle className="w-5 h-5" />
                          Ablehnen
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
