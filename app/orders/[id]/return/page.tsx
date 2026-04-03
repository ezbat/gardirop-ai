'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Loader2, Package, RotateCcw, CheckCircle, AlertTriangle, XCircle,
} from 'lucide-react'

const REASONS = [
  { value: 'size_issue',       label: 'Größe passt nicht' },
  { value: 'wrong_item',       label: 'Falscher Artikel geliefert' },
  { value: 'defective',        label: 'Beschädigt oder defekt' },
  { value: 'not_as_described', label: 'Entspricht nicht der Beschreibung' },
  { value: 'changed_mind',     label: 'Meinungsänderung' },
  { value: 'other',            label: 'Sonstiges' },
]

export default function ReturnRequestPage() {
  const { data: session, status: authStatus } = useSession()
  const params = useParams()
  const router = useRouter()
  const orderId = params.id as string

  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [reason, setReason] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (authStatus === 'unauthenticated') router.push('/auth/signin')
    if (authStatus === 'authenticated') loadOrder()
  }, [authStatus, orderId])

  async function loadOrder() {
    try {
      const res = await fetch(`/api/orders/${orderId}`)
      if (!res.ok) throw new Error('not found')
      const data = await res.json()
      setOrder(data.order)
    } catch {
      setError('Bestellung nicht gefunden.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!reason) {
      setError('Bitte wähle einen Rückgabegrund.')
      return
    }

    setSubmitting(true)

    try {
      const res = await fetch('/api/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, reason, description: description.trim() || undefined }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Rückgabe konnte nicht erstellt werden.')
        return
      }

      setSuccess(true)
    } catch {
      setError('Ein Fehler ist aufgetreten. Bitte versuche es erneut.')
    } finally {
      setSubmitting(false)
    }
  }

  if (authStatus === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FAFAFA' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#D97706' }} />
      </div>
    )
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#FAFAFA' }}>
        <div className="max-w-md w-full rounded-2xl p-8 text-center" style={{ background: '#FFF', border: '1px solid #E5E5E5' }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#DCFCE7' }}>
            <CheckCircle className="w-8 h-8" style={{ color: '#16A34A' }} />
          </div>
          <h2 className="text-xl font-bold mb-2" style={{ color: '#1A1A1A' }}>
            Rückgabe-Anfrage eingereicht
          </h2>
          <p className="text-sm mb-6" style={{ color: '#6B7280' }}>
            Der Verkäufer wird deine Anfrage innerhalb von 48 Stunden prüfen. Du wirst per E-Mail benachrichtigt.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href="/returns"
              className="w-full px-5 py-2.5 rounded-xl text-sm font-semibold text-center transition"
              style={{ background: '#D97706', color: '#FFF' }}
            >
              Meine Rückgaben ansehen
            </Link>
            <Link
              href="/orders"
              className="w-full px-5 py-2.5 rounded-xl text-sm font-semibold text-center transition"
              style={{ background: '#F3F4F6', color: '#374151' }}
            >
              Zurück zu Bestellungen
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#FAFAFA' }}>
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg hover:bg-white/10 transition"
          >
            <ArrowLeft className="w-5 h-5" style={{ color: '#1A1A1A' }} />
          </button>
          <div>
            <h1 className="text-xl font-bold" style={{ color: '#1A1A1A' }}>
              Rückgabe beantragen
            </h1>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              Bestellung #{orderId.slice(0, 8).toUpperCase()}
            </p>
          </div>
        </div>

        {/* Order summary */}
        {order && (
          <div className="rounded-2xl p-5 mb-6" style={{ background: '#FFF', border: '1px solid #E5E5E5' }}>
            <p className="text-xs font-semibold mb-3" style={{ color: '#6B7280' }}>BESTELLÜBERSICHT</p>
            <div className="space-y-3">
              {(order.items || order.order_items || []).slice(0, 5).map((item: any) => {
                const product = item.product || item.products
                return (
                  <div key={item.id} className="flex items-center gap-3">
                    {product?.images?.[0] ? (
                      <img src={product.images[0]} alt="" className="w-12 h-12 rounded-lg object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: '#F3F4F6' }}>
                        <Package className="w-5 h-5" style={{ color: '#9CA3AF' }} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: '#1A1A1A' }}>
                        {product?.title || 'Artikel'}
                      </p>
                      <p className="text-xs" style={{ color: '#6B7280' }}>
                        Menge: {item.quantity} • {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(item.price || 0)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="flex justify-between items-center mt-4 pt-3" style={{ borderTop: '1px solid #F3F4F6' }}>
              <span className="text-sm font-semibold" style={{ color: '#6B7280' }}>Erstattungsbetrag</span>
              <span className="text-lg font-bold" style={{ color: '#D97706' }}>
                {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(order.total_amount || 0)}
              </span>
            </div>
          </div>
        )}

        {/* Return form */}
        <form onSubmit={handleSubmit}>
          <div className="rounded-2xl p-5 space-y-5" style={{ background: '#FFF', border: '1px solid #E5E5E5' }}>
            {/* Reason */}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#1A1A1A' }}>
                Rückgabegrund <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {REASONS.map(r => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setReason(r.value)}
                    className="flex items-center gap-2 p-3 rounded-xl text-sm font-medium text-left transition"
                    style={{
                      border: reason === r.value ? '2px solid #D97706' : '1px solid #E5E5E5',
                      background: reason === r.value ? '#FFFBEB' : '#FFF',
                      color: '#1A1A1A',
                    }}
                  >
                    <div
                      className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                      style={{ borderColor: reason === r.value ? '#D97706' : '#D1D5DB' }}
                    >
                      {reason === r.value && (
                        <div className="w-2 h-2 rounded-full" style={{ background: '#D97706' }} />
                      )}
                    </div>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#1A1A1A' }}>
                Weitere Details <span className="font-normal" style={{ color: '#9CA3AF' }}>(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="Beschreibe das Problem genauer..."
                className="w-full px-4 py-3 rounded-xl text-sm resize-none outline-none transition"
                style={{
                  border: '1px solid #E5E5E5',
                  color: '#1A1A1A',
                  background: '#FFF',
                }}
              />
              <p className="text-xs mt-1 text-right" style={{ color: '#9CA3AF' }}>
                {description.length}/1000
              </p>
            </div>

            {/* Info box */}
            <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: '#FEF3C7', border: '1px solid #FDE68A' }}>
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#D97706' }} />
              <div className="text-xs" style={{ color: '#92400E' }}>
                <p className="font-semibold mb-1">Hinweis zur Rückgabe</p>
                <p>Rückgaben sind innerhalb von 14 Tagen nach Zustellung möglich (EU-Widerrufsrecht). Nach Genehmigung hast du 7 Tage Zeit, das Produkt zurückzusenden.</p>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-xl p-4 flex items-center gap-2" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
                <XCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#DC2626' }} />
                <p className="text-sm" style={{ color: '#991B1B' }}>{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || !reason}
              className="w-full px-5 py-3 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: '#D97706', color: '#FFF' }}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Wird eingereicht...
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4" />
                  Rückgabe beantragen
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
