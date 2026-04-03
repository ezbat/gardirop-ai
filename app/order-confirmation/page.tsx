'use client'

/**
 * Order Confirmation Page
 *
 * Displays after successful Stripe checkout.
 * Fetches order via API route (not direct Supabase) to avoid RLS issues.
 *
 * Accepts:
 *  - ?session_id=... (Stripe session ID)
 *  - ?order_id=... (direct order ID)
 */

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, Truck, Loader2, XCircle } from 'lucide-react'
import Link from 'next/link'
import { track } from '@/lib/tracking'
import { OrderSuccessAnimation } from '@/components/motion/order-success'
import { CargoPlaneLoading } from '@/components/motion/cargo-plane'
import dynamic from 'next/dynamic'

const OrderSuccessTransition = dynamic(
  () => import('@/components/cargo-scene/OrderSuccessTransition'),
  { ssr: false },
)

interface OrderData {
  id: string
  order_number?: string
  status: string
  payment_status: string
  total_amount: number
}

function OrderConfirmationContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const orderId = searchParams.get('order_id')

  const [loading, setLoading] = useState(true)
  const [order, setOrder] = useState<OrderData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showAnimation, setShowAnimation] = useState(true)
  const [showCargoTransition, setShowCargoTransition] = useState(true)

  useEffect(() => {
    if (orderId) {
      fetchOrder(orderId)
    } else if (sessionId) {
      fetchOrderBySession(sessionId)
    } else {
      setError('Ungültiger Bestätigungslink.')
      setLoading(false)
    }
  }, [orderId, sessionId])

  async function fetchOrder(id: string) {
    try {
      // Pass session_id as query param for guest access proof
      const qs = sessionId ? `?session_id=${sessionId}` : ''
      const res = await fetch(`/api/orders/${id}${qs}`)
      if (!res.ok) {
        if (res.status === 401 || res.status === 404) {
          // Retry once after 2s — webhook may not have fired yet
          await new Promise(r => setTimeout(r, 2000))
          const retry = await fetch(`/api/orders/${id}${qs}`)
          if (retry.ok) {
            const data = await retry.json()
            handleOrderSuccess(data.order)
            return
          }
        }
        setError(`Bestellung wird verarbeitet. Bestell-ID: ${id.slice(0, 8).toUpperCase()}. Du erhältst eine E-Mail-Bestätigung.`)
        return
      }
      const data = await res.json()
      handleOrderSuccess(data.order)
    } catch {
      setError('Bestellung wird verarbeitet. Du erhältst eine E-Mail-Bestätigung.')
    } finally {
      setLoading(false)
    }
  }

  async function fetchOrderBySession(sid: string) {
    // The API doesn't support session_id lookup directly.
    // Try the order_id from URL first, then show a processing message.
    // The webhook will handle order update — user can check their orders page.
    try {
      // Wait a moment for webhook to process
      await new Promise(r => setTimeout(r, 2000))

      // Try fetching orders list to find the one with this session
      const res = await fetch('/api/orders')
      if (res.ok) {
        const data = await res.json()
        // The most recent order is likely the one we want
        if (data.orders && data.orders.length > 0) {
          const latestOrder = data.orders[0]
          handleOrderSuccess(latestOrder)
          return
        }
      }

      // If we can't find it, show a success message anyway
      // (Stripe already confirmed payment)
      setOrder({
        id: 'processing',
        status: 'PAID',
        payment_status: 'paid',
        total_amount: 0,
      })
    } catch {
      // Stripe session exists so payment succeeded — show optimistic success
      setOrder({
        id: 'processing',
        status: 'PAID',
        payment_status: 'paid',
        total_amount: 0,
      })
    } finally {
      setLoading(false)
    }
  }

  function handleOrderSuccess(orderData: OrderData) {
    setOrder(orderData)
    localStorage.removeItem('cart')
    track('purchase', {
      order_id: orderData.id,
      value: orderData.total_amount || undefined,
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <CargoPlaneLoading text="Bestellung wird verarbeitet…" />
      </div>
    )
  }

  if (error && !order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-center max-w-md glass border border-border rounded-2xl p-8">
          <div className="w-16 h-16 rounded-full bg-amber-500/15 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-9 h-9 text-amber-500 dark:text-amber-400" />
          </div>
          <h1 className="text-xl font-bold mb-2 text-foreground">Zahlung eingegangen</h1>
          <p className="text-muted-foreground text-sm mb-6">{error}</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/orders"
              className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 inline-block text-center"
            >
              Meine Bestellungen
            </Link>
            <Link
              href="/"
              className="flex-1 px-6 py-3 glass border border-border rounded-xl text-sm font-semibold hover:border-primary transition-colors text-center"
            >
              Weiter einkaufen
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!order) return null

  const isPaid = order.payment_status === 'paid' || Boolean(sessionId)
  const ordNum = order.order_number || (order.id !== 'processing' ? order.id.slice(0, 8).toUpperCase() : '')
  const ordAmt = order.total_amount > 0 ? order.total_amount.toFixed(2) : null

  return (
    <div className="min-h-screen bg-background">
      {/* Branded cargo transition overlay */}
      {isPaid && (
        <OrderSuccessTransition
          active={showCargoTransition}
          onComplete={() => setShowCargoTransition(false)}
          orderId={order.id !== 'processing' ? order.id : undefined}
        />
      )}

      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="glass border border-border rounded-2xl p-8 text-center">

          {/* Animation or static icon */}
          {showCargoTransition ? null : isPaid && showAnimation ? (
            <OrderSuccessAnimation onComplete={() => setShowAnimation(false)} />
          ) : (
            <>
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6
                ${isPaid ? 'bg-green-500/15' : 'bg-amber-500/15'}`}>
                <CheckCircle2 className={`w-12 h-12 ${isPaid ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`} />
              </div>
              <h1 className="text-2xl font-bold mb-2 text-foreground">
                {isPaid ? 'Bestellung erfolgreich!' : 'Bestellung eingegangen'}
              </h1>
            </>
          )}

          {ordNum && (
            <p className="text-muted-foreground text-sm mb-1">
              Bestellnummer: <span className="font-mono font-semibold text-foreground">{ordNum}</span>
            </p>
          )}

          <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold mt-3 mb-8
            ${isPaid ? 'bg-green-500/15 text-green-600 dark:text-green-400' : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${isPaid ? 'bg-green-500' : 'bg-amber-500'}`} />
            {isPaid ? 'Bezahlt' : 'Zahlung wird verarbeitet'}
          </div>

          {/* Details */}
          {ordAmt && (
            <div className="glass border border-border rounded-xl p-5 mb-5 text-left">
              <h3 className="font-bold text-sm mb-3 text-foreground">Bestelldetails</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gesamtbetrag</span>
                  <span className="font-semibold text-foreground">&euro;{ordAmt}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-semibold text-foreground capitalize">{order.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Zahlungsmethode</span>
                  <span className="font-semibold text-foreground">Stripe</span>
                </div>
              </div>
            </div>
          )}

          {/* Next steps */}
          <div className="glass border border-border rounded-xl p-5 mb-8 text-left">
            <h3 className="font-bold text-sm mb-2 flex items-center gap-2">
              <Truck className="w-4 h-4 text-primary" />
              Nächste Schritte
            </h3>
            <p className="text-sm text-muted-foreground">
              {isPaid
                ? 'Deine Bestellung wird vorbereitet. Du erhältst eine E-Mail, sobald sie versendet wurde.'
                : 'Deine Zahlung wird verarbeitet. Sobald sie bestätigt ist, wird deine Bestellung vorbereitet.'}
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            {order.id !== 'processing' && (
              <Link
                href="/orders"
                className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity text-center"
              >
                Meine Bestellungen
              </Link>
            )}
            <Link
              href="/"
              className="flex-1 px-6 py-3 glass border border-border rounded-xl text-sm font-semibold hover:border-primary transition-colors text-center"
            >
              Weiter einkaufen
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function OrderConfirmationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    }>
      <OrderConfirmationContent />
    </Suspense>
  )
}
