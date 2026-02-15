"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Send, Loader2, Star, TrendingUp, Award, Package, Clock, Check, XCircle } from "lucide-react"
import FloatingParticles from "@/components/floating-particles"

interface SellerRequest {
  id: string
  request_type: string
  current_value: string
  requested_value: string
  reason: string
  status: string
  admin_response: string
  created_at: string
}

export default function SellerRequestsPage() {
  const { data: session } = useSession()
  const userId = session?.user?.id

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [requests, setRequests] = useState<SellerRequest[]>([])
  const [showForm, setShowForm] = useState(false)

  const [formData, setFormData] = useState({
    requestType: 'increase_product_limit',
    currentValue: '',
    requestedValue: '',
    reason: ''
  })

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
  }, [userId])

  const loadRequests = async () => {
    try {
      const response = await fetch('/api/seller/requests', {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return

    setSubmitting(true)
    try {
      const response = await fetch('/api/seller/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.error || 'Fehler beim Erstellen der Anfrage!')
        return
      }

      alert('✅ Anfrage erfolgreich gesendet!')
      setFormData({
        requestType: 'increase_product_limit',
        currentValue: '',
        requestedValue: '',
        reason: ''
      })
      setShowForm(false)
      loadRequests()
    } catch (error) {
      console.error('Submit error:', error)
      alert('Fehler beim Senden!')
    } finally {
      setSubmitting(false)
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

  const getRequestTypeLabel = (type: string) => {
    const requestType = requestTypes.find(rt => rt.value === type)
    return requestType?.label || type
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
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-8">
            <Send className="w-16 h-16 text-primary mx-auto mb-4" />
            <h1 className="font-serif text-4xl font-bold mb-2">Meine Anfragen</h1>
            <p className="text-muted-foreground">Shop-Verbesserungen beantragen</p>
          </div>

          {/* New Request Button */}
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="w-full mb-6 px-6 py-4 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <Send className="w-5 h-5" />
              Neue Anfrage erstellen
            </button>
          )}

          {/* New Request Form */}
          {showForm && (
            <div className="glass border border-border rounded-2xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Neue Anfrage</h2>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-sm text-muted-foreground hover:text-primary"
                >
                  Abbrechen
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Anfragetyp *</label>
                  <select
                    value={formData.requestType}
                    onChange={(e) => setFormData({ ...formData, requestType: e.target.value })}
                    className="w-full px-4 py-2 glass border border-border rounded-xl outline-none focus:border-primary"
                  >
                    {requestTypes.map((type) => {
                      const Icon = type.icon
                      return (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      )
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Aktueller Wert</label>
                  <input
                    type="text"
                    value={formData.currentValue}
                    onChange={(e) => setFormData({ ...formData, currentValue: e.target.value })}
                    placeholder="z.B. 50 Produkte"
                    className="w-full px-4 py-2 glass border border-border rounded-xl outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Gewünschter Wert</label>
                  <input
                    type="text"
                    value={formData.requestedValue}
                    onChange={(e) => setFormData({ ...formData, requestedValue: e.target.value })}
                    placeholder="z.B. 100 Produkte"
                    className="w-full px-4 py-2 glass border border-border rounded-xl outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Begründung *</label>
                  <textarea
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="Erklären Sie, warum Sie diese Anfrage stellen..."
                    required
                    rows={6}
                    className="w-full px-4 py-2 glass border border-border rounded-xl outline-none focus:border-primary resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  {submitting ? 'Wird gesendet...' : 'Anfrage senden'}
                </button>
              </form>
            </div>
          )}

          {/* Requests List */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold mb-4">Meine Anfragen</h2>

            {requests.length === 0 ? (
              <div className="text-center py-12 glass border border-border rounded-2xl">
                <Send className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Noch keine Anfragen</p>
              </div>
            ) : (
              requests.map((req) => {
                const requestType = requestTypes.find(rt => rt.value === req.request_type)
                const Icon = requestType?.icon || Send

                return (
                  <div key={req.id} className="glass border border-border rounded-2xl p-6 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg">{getRequestTypeLabel(req.request_type)}</h3>
                          <p className="text-sm text-muted-foreground">
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

                    {req.current_value && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Von:</span>
                        <span className="font-semibold">{req.current_value}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="font-semibold text-primary">{req.requested_value}</span>
                      </div>
                    )}

                    <div className="glass border border-border rounded-xl p-4">
                      <p className="text-sm font-semibold text-primary mb-2">Ihre Begründung:</p>
                      <p className="text-sm whitespace-pre-wrap">{req.reason}</p>
                    </div>

                    {req.admin_response && (
                      <div className={`glass border rounded-xl p-4 ${
                        req.status === 'approved' ? 'border-green-500/50 bg-green-500/5' :
                        req.status === 'rejected' ? 'border-red-500/50 bg-red-500/5' :
                        'border-primary/50 bg-primary/5'
                      }`}>
                        <p className="text-sm font-semibold text-primary mb-2">Admin-Antwort:</p>
                        <p className="text-sm whitespace-pre-wrap">{req.admin_response}</p>
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
