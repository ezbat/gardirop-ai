"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  Package, Truck, CheckCircle, Clock, XCircle, Eye,
  Download, MapPin, CreditCard, Calendar, ArrowLeft,
  Loader2, Star, MessageCircle, RotateCcw
} from "lucide-react"
import Link from "next/link"

interface OrderItem {
  id: string
  product: {
    id: string
    title: string
    images: string[]
  }
  quantity: number
  price: number
}

interface Order {
  id: string
  order_number: string
  created_at: string
  status: string
  payment_status: string
  total_amount: number
  shipping_address: any
  items: OrderItem[]
  tracking_number?: string
  shipping_carrier?: string
  estimated_delivery?: string
  tracking_status?: string
  tracking_location?: string
  tracking_last_update?: string
}

const statusConfig = {
  pending: { label: "Wird vorbereitet", icon: Clock, color: "text-yellow-500", bg: "bg-yellow-500/10" },
  processing: { label: "In Bearbeitung", icon: Package, color: "text-blue-500", bg: "bg-blue-500/10" },
  shipped: { label: "Versandt", icon: Truck, color: "text-purple-500", bg: "bg-purple-500/10" },
  delivered: { label: "Zugestellt", icon: CheckCircle, color: "text-green-500", bg: "bg-green-500/10" },
  cancelled: { label: "Storniert", icon: XCircle, color: "text-red-500", bg: "bg-red-500/10" },
}

export default function OrdersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [loadingInvoice, setLoadingInvoice] = useState<string | null>(null)
  const [supportOrderId, setSupportOrderId] = useState<string | null>(null)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    } else if (status === "authenticated") {
      loadOrders()
    }
  }, [status, router])

  const loadOrders = async () => {
    try {
      setLoading(true)

      // Fetch real orders from API
      const response = await fetch('/api/orders')

      if (!response.ok) {
        throw new Error('Failed to fetch orders')
      }

      const data = await response.json()
      setOrders(data.orders || [])
    } catch (error) {
      console.error("Load orders error:", error)
      setOrders([]) // Set empty array on error
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadInvoice = async (orderId: string) => {
    try {
      setLoadingInvoice(orderId)
      const response = await fetch(`/api/orders/invoice?orderId=${orderId}`)

      if (!response.ok) {
        throw new Error('Rechnung konnte nicht abgerufen werden')
      }

      const data = await response.json()

      if (data.invoiceUrl) {
        // Open Stripe invoice in new tab
        window.open(data.invoiceUrl, '_blank')
      } else if (data.orderNumber) {
        // Manual invoice - show in alert or create PDF
        const invoiceText = `
RECHNUNG
---------
Bestellnummer: ${data.orderNumber}
Datum: ${new Date(data.date).toLocaleDateString('de-DE')}

ARTIKEL:
${data.items.map((item: any) => `${item.quantity}x ${item.name} - €${item.price.toFixed(2)}`).join('\n')}

Zwischensumme: €${data.subtotal.toFixed(2)}
Versand: €${data.shipping.toFixed(2)}
MwSt: €${data.tax.toFixed(2)}
---------
GESAMT: €${data.total.toFixed(2)}

Zahlungsstatus: ${data.paymentStatus}
        `.trim()

        // For now, show in alert. Later we can create a proper PDF
        alert(invoiceText)
      } else {
        alert('Rechnung ist noch nicht verfügbar')
      }
    } catch (error: any) {
      console.error('Invoice error:', error)
      alert(error.message || 'Fehler beim Laden der Rechnung')
    } finally {
      setLoadingInvoice(null)
    }
  }

  const handleOpenSupport = (orderId: string) => {
    setSupportOrderId(orderId)
  }

  const handleCloseSupport = () => {
    setSupportOrderId(null)
  }

  const filteredOrders = selectedStatus === "all"
    ? orders
    : orders.filter(order => order.status === selectedStatus)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden py-8 px-4">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/profile"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück zum Profil
          </Link>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-serif text-4xl font-bold mb-2 bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
                Meine Bestellungen
              </h1>
              <p className="text-muted-foreground">
                {orders.length} {orders.length === 1 ? "Bestellung" : "Bestellungen"}
              </p>
            </div>
          </div>
        </div>

        {/* Status Filter */}
        <div className="glass border border-border rounded-2xl p-4 mb-8">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedStatus("all")}
              className={`px-4 py-2 rounded-xl font-medium transition-all ${
                selectedStatus === "all"
                  ? "bg-primary text-primary-foreground"
                  : "glass border border-border hover:border-primary"
              }`}
            >
              Alle ({orders.length})
            </button>

            {Object.entries(statusConfig).map(([key, config]) => {
              const count = orders.filter(o => o.status === key).length
              const Icon = config.icon

              return (
                <button
                  key={key}
                  onClick={() => setSelectedStatus(key)}
                  className={`px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2 ${
                    selectedStatus === key
                      ? `${config.bg} ${config.color} border-2`
                      : "glass border border-border hover:border-primary"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {config.label} ({count})
                </button>
              )
            })}
          </div>
        </div>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass border border-border rounded-2xl p-12 text-center"
          >
            <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Keine Bestellungen gefunden</h2>
            <p className="text-muted-foreground mb-6">
              {selectedStatus === "all"
                ? "Sie haben noch keine Bestellungen aufgegeben"
                : `Keine ${statusConfig[selectedStatus as keyof typeof statusConfig]?.label || ""} Bestellungen`}
            </p>
            <Link
              href="/store"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-full font-semibold hover:opacity-90 transition-opacity"
            >
              Jetzt einkaufen
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order, index) => {
              const statusInfo = statusConfig[order.status as keyof typeof statusConfig]
              const StatusIcon = statusInfo?.icon || Package

              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="glass border border-border rounded-2xl p-6 hover:border-primary transition-all"
                >
                  {/* Order Header */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 pb-4 border-b border-border">
                    <div className="flex items-center gap-4 mb-4 md:mb-0">
                      <div className={`w-12 h-12 rounded-full ${statusInfo?.bg} flex items-center justify-center`}>
                        <StatusIcon className={`w-6 h-6 ${statusInfo?.color}`} />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Bestellnummer</p>
                        <p className="font-bold text-lg">{order.order_number}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className={`px-4 py-2 rounded-full text-sm font-semibold ${statusInfo?.bg} ${statusInfo?.color}`}>
                        {statusInfo?.label}
                      </span>
                      {order.payment_status === "paid" && (
                        <span className="px-4 py-2 rounded-full text-sm font-semibold bg-green-500/10 text-green-500">
                          Bezahlt
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Order Details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Bestellt am</p>
                        <p className="font-semibold">{new Date(order.created_at).toLocaleDateString("de-DE")}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <CreditCard className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Gesamt</p>
                        <p className="font-bold text-primary text-lg">€{order.total_amount.toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Lieferadresse</p>
                        <p className="font-semibold">{order.shipping_address?.city || "N/A"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Tracking Info */}
                  {order.tracking_number && (
                    <div className="glass border border-border rounded-xl p-4 mb-6">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Truck className="w-5 h-5 text-primary" />
                          <div>
                            <p className="text-xs text-muted-foreground">Sendungsnummer</p>
                            <p className="font-mono font-semibold">{order.tracking_number}</p>
                          </div>
                        </div>
                        <a
                          href={`https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html?piececode=${order.tracking_number}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 glass border border-border rounded-xl hover:border-primary transition-colors text-sm font-semibold"
                        >
                          Verfolgen
                        </a>
                      </div>

                      {order.tracking_status && (
                        <div className="bg-primary/10 rounded-lg p-3 mb-2">
                          <p className="text-sm font-semibold text-primary">{order.tracking_status}</p>
                          {order.tracking_location && (
                            <p className="text-xs text-muted-foreground mt-1">📍 {order.tracking_location}</p>
                          )}
                        </div>
                      )}

                      {order.estimated_delivery && (
                        <p className="text-sm text-muted-foreground">
                          Voraussichtliche Lieferung: {new Date(order.estimated_delivery).toLocaleDateString("de-DE", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Order Items */}
                  <div className="space-y-3 mb-6">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex gap-4 glass border border-border rounded-xl p-3">
                        <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                          <img
                            src={item.product.images[0]}
                            alt={item.product.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/store/${item.product.id}`}
                            className="font-semibold hover:text-primary transition-colors line-clamp-1"
                          >
                            {item.product.title}
                          </Link>
                          <p className="text-sm text-muted-foreground">Menge: {item.quantity}</p>
                          <p className="font-bold text-primary">€{item.price.toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/orders/${order.id}`}
                      className="flex-1 sm:flex-none px-6 py-2 glass border border-border rounded-xl font-semibold hover:border-primary transition-colors flex items-center justify-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      Details
                    </Link>

                    <button
                      onClick={() => handleDownloadInvoice(order.id)}
                      disabled={loadingInvoice === order.id}
                      className="flex-1 sm:flex-none px-6 py-2 glass border border-border rounded-xl font-semibold hover:border-primary transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {loadingInvoice === order.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      Rechnung
                    </button>

                    {order.status === "delivered" && (
                      <>
                        <button className="flex-1 sm:flex-none px-6 py-2 glass border border-border rounded-xl font-semibold hover:border-primary transition-colors flex items-center justify-center gap-2">
                          <Star className="w-4 h-4" />
                          Bewerten
                        </button>

                        <button className="flex-1 sm:flex-none px-6 py-2 glass border border-border rounded-xl font-semibold hover:border-red-500 hover:text-red-500 transition-colors flex items-center justify-center gap-2">
                          <RotateCcw className="w-4 h-4" />
                          Rückgabe
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => handleOpenSupport(order.id)}
                      className="flex-1 sm:flex-none px-6 py-2 glass border border-border rounded-xl font-semibold hover:border-primary transition-colors flex items-center justify-center gap-2"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Support
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* Support Modal */}
      {supportOrderId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass border border-border rounded-3xl p-8 max-w-lg w-full"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <MessageCircle className="w-6 h-6 text-primary" />
                <h2 className="text-2xl font-bold">Support kontaktieren</h2>
              </div>
              <button
                onClick={handleCloseSupport}
                className="w-8 h-8 rounded-full hover:bg-secondary transition-colors flex items-center justify-center"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <p className="text-muted-foreground mb-4">
              Bestellnummer: <span className="font-mono font-semibold text-foreground">
                {orders.find(o => o.id === supportOrderId)?.order_number}
              </span>
            </p>

            <textarea
              className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary focus:outline-none resize-none mb-4"
              rows={6}
              placeholder="Beschreiben Sie Ihr Anliegen..."
            />

            <div className="flex gap-3">
              <button
                onClick={handleCloseSupport}
                className="flex-1 px-6 py-3 border border-border rounded-xl font-semibold hover:bg-secondary transition-colors"
              >
                Abbrechen
              </button>
              <button
                className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity"
              >
                Nachricht senden
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
