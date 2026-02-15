"use client"

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ArrowLeft, Package, Truck, MapPin, Calendar, CreditCard } from 'lucide-react'
import Link from 'next/link'

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const orderId = params.id as string

  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadOrder()
  }, [orderId])

  const loadOrder = async () => {
    try {
      const response = await fetch(`/api/orders/${orderId}`)
      if (!response.ok) throw new Error('Order not found')
      const data = await response.json()
      setOrder(data.order)
    } catch (error) {
      console.error('Load order error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">Bestellung nicht gefunden</h2>
          <p className="text-muted-foreground mb-4">Diese Bestellung existiert nicht</p>
          <Link href="/orders" className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-semibold">
            Zurück zu Bestellungen
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="container mx-auto max-w-3xl">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-muted-foreground hover:text-primary mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück
        </button>

        <div className="glass border border-border rounded-2xl p-6">
          <h1 className="text-2xl font-bold mb-6">Bestellung {order.order_number}</h1>

          {/* Order Status */}
          <div className="mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Package className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold">{order.status === 'shipped' ? 'Versandt' : 'In Bearbeitung'}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(order.created_at).toLocaleDateString('de-DE')}
                </p>
              </div>
            </div>
          </div>

          {/* Tracking */}
          {order.tracking_number && (
            <div className="glass border border-border rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3 mb-3">
                <Truck className="w-5 h-5 text-primary" />
                <p className="font-semibold">Sendungsverfolgung</p>
              </div>
              <p className="font-mono">{order.tracking_number}</p>
              {order.tracking_status && (
                <p className="text-sm text-muted-foreground mt-2">{order.tracking_status}</p>
              )}
            </div>
          )}

          {/* Items */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3">Artikel</h3>
            <div className="space-y-3">
              {order.items?.map((item: any) => (
                <div key={item.id} className="flex gap-4">
                  <div className="w-20 h-20 rounded-lg bg-muted overflow-hidden">
                    <img
                      src={item.product.images[0]}
                      alt={item.product.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{item.product.title}</p>
                    <p className="text-sm text-muted-foreground">Menge: {item.quantity}</p>
                    <p className="font-bold text-primary">€{item.price.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="border-t border-border pt-4">
            <div className="flex justify-between items-center">
              <p className="font-semibold">Gesamt</p>
              <p className="text-2xl font-bold text-primary">€{order.total_amount.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
