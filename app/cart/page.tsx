'use client'

/**
 * /cart — Hybrid cart page.
 *
 * Logged-in user  → reads/writes server cart (/api/cart).
 *                   On first load, any localStorage items are merged into the
 *                   server cart transparently, then localStorage is cleared.
 *
 * Guest user      → reads/writes localStorage only.
 *
 * The "source of truth" is always clearly displayed.  No fake data is shown.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Trash2, Plus, Minus, ShoppingBag,
  Loader2, X, RefreshCw, AlertTriangle, ServerCrash,
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { CargoPlaneLoading } from '@/components/motion/cargo-plane'
import {
  getLocalCart, setLocalCart, clearLocalCart,
  getLocalCartForMerge, type LocalCartItem,
} from '@/lib/cart-local'
import type { CartItemDTO } from '@/app/api/cart/route'

// ─── Constants ────────────────────────────────────────────────────────────────

const FREE_SHIPPING_THRESHOLD = 100
const SHIPPING_COST = 9.99

// ─── Unified display item (works for both server + local items) ───────────────

interface DisplayItem {
  id:           string    // server cart_items.id OR local composite key
  productId:    string
  title:        string
  price:        number
  images:       string[]
  stockQuantity: number
  brand:        string | null
  sellerId:     string
  quantity:     number
  selectedSize?: string
  source:       'server' | 'local'
}

function fromServerItem(item: CartItemDTO): DisplayItem {
  return {
    id:           item.id,
    productId:    item.productId,
    title:        item.title,
    price:        item.price,
    images:       item.images,
    stockQuantity: item.stockQuantity,
    brand:        item.brand,
    sellerId:     item.sellerId,
    quantity:     item.quantity,
    selectedSize: item.selectedSize,
    source:       'server',
  }
}

function fromLocalItem(item: LocalCartItem): DisplayItem {
  return {
    id:           item.id,
    productId:    item.product.id,
    title:        item.product.title,
    price:        item.product.price,
    images:       item.product.images,
    stockQuantity: item.product.stock_quantity,
    brand:        item.product.brand ?? null,
    sellerId:     item.product.seller_id,
    quantity:     item.quantity,
    selectedSize: item.selectedSize,
    source:       'local',
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CartPage() {
  const { data: session, status: authStatus } = useSession()
  const router = useRouter()
  const isLoggedIn = authStatus === 'authenticated' && !!session?.user?.id

  const [items,         setItems]         = useState<DisplayItem[]>([])
  const [loading,       setLoading]       = useState(true)
  const [merging,       setMerging]       = useState(false)
  const [confirmClear,  setConfirmClear]  = useState(false)
  const [serverError,   setServerError]   = useState<string | null>(null)
  const [updatingId,    setUpdatingId]    = useState<string | null>(null)

  // Prevent running the merge logic twice (Strict Mode double-fire)
  const mergeAttempted = useRef(false)

  // ── Load cart ──────────────────────────────────────────────────────────────

  const loadServerCart = useCallback(async () => {
    setServerError(null)
    try {
      const res  = await fetch('/api/cart', { cache: 'no-store' })
      const json = await res.json()
      if (json.success) {
        setItems((json.items as CartItemDTO[]).map(fromServerItem))
      } else {
        setServerError(json.error ?? 'Fehler beim Laden')
      }
    } catch {
      setServerError('Netzwerkfehler')
    }
  }, [])

  useEffect(() => {
    if (authStatus === 'loading') return

    if (isLoggedIn) {
      // Merge localStorage → server (once per session)
      const localItems = getLocalCartForMerge()
      if (localItems.length > 0 && !mergeAttempted.current) {
        mergeAttempted.current = true
        setMerging(true)
        fetch('/api/cart', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ merge: localItems }),
        })
          .then(() => clearLocalCart())
          .catch(() => { /* ignore merge errors — local items stay */ })
          .finally(async () => {
            await loadServerCart()
            setMerging(false)
            setLoading(false)
          })
      } else {
        mergeAttempted.current = true
        loadServerCart().finally(() => setLoading(false))
      }
    } else {
      // Guest: load from localStorage
      setItems(getLocalCart().map(fromLocalItem))
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, authStatus])

  // ── Quantity update ────────────────────────────────────────────────────────

  const updateQuantity = useCallback(async (item: DisplayItem, newQty: number) => {
    const clamped = Math.min(Math.max(1, newQty), item.stockQuantity)
    if (clamped === item.quantity) return

    setUpdatingId(item.id)

    if (item.source === 'server') {
      // Optimistic update
      setItems(prev => prev.map(i =>
        i.id === item.id ? { ...i, quantity: clamped } : i,
      ))
      try {
        const res = await fetch('/api/cart', {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            product_id:    item.productId,
            quantity:      clamped,
            selected_size: item.selectedSize,
          }),
        })
        if (!res.ok) {
          // Revert on failure
          await loadServerCart()
        }
      } catch {
        await loadServerCart()
      }
    } else {
      // Guest: update localStorage
      const local = getLocalCart()
      const updated = local.map(l =>
        l.id === item.id ? { ...l, quantity: clamped } : l,
      )
      setLocalCart(updated)
      setItems(updated.map(fromLocalItem))
    }

    setUpdatingId(null)
  }, [loadServerCart])

  // ── Remove item ────────────────────────────────────────────────────────────

  const removeItem = useCallback(async (item: DisplayItem) => {
    // Optimistic remove
    setItems(prev => prev.filter(i => i.id !== item.id))

    if (item.source === 'server') {
      try {
        await fetch('/api/cart', {
          method:  'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            product_id:    item.productId,
            selected_size: item.selectedSize,
          }),
        })
      } catch {
        // Reload to stay in sync
        await loadServerCart()
      }
    } else {
      const updated = getLocalCart().filter(l => l.id !== item.id)
      setLocalCart(updated)
    }
  }, [loadServerCart])

  // ── Clear cart ─────────────────────────────────────────────────────────────

  const clearCart = useCallback(async () => {
    setItems([])
    setConfirmClear(false)

    if (isLoggedIn) {
      await fetch('/api/cart', {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ clear: true }),
      }).catch(() => {})
    } else {
      clearLocalCart()
    }
  }, [isLoggedIn])

  // ── Derived totals ─────────────────────────────────────────────────────────

  const subtotal  = items.reduce((s, i) => s + i.price * i.quantity, 0)
  const shipping  = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST
  const total     = subtotal + shipping
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal)
  const itemCount = items.reduce((s, i) => s + i.quantity, 0)

  // ── Render: loading ────────────────────────────────────────────────────────

  if (authStatus === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <CargoPlaneLoading text="Warenkorb wird geladen…" />
      </div>
    )
  }

  // ── Render: full page ──────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück
          </button>

          {items.length > 0 && (
            <div className="flex items-center gap-3">
              {isLoggedIn && (
                <button
                  onClick={() => { setLoading(true); loadServerCart().finally(() => setLoading(false)) }}
                  className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                  title="Aktualisieren"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}

              {!confirmClear && (
                <button
                  onClick={() => setConfirmClear(true)}
                  className="text-sm text-red-500 hover:text-red-600 transition-colors"
                >
                  Warenkorb leeren
                </button>
              )}
              {confirmClear && (
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-muted-foreground">Sicher?</span>
                  <button onClick={clearCart} className="text-red-500 font-semibold hover:text-red-600">
                    Ja, leeren
                  </button>
                  <button onClick={() => setConfirmClear(false)} className="text-muted-foreground hover:text-foreground">
                    Abbrechen
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <h1 className="text-3xl font-bold mb-2">
          Warenkorb
          {itemCount > 0 && (
            <span className="ml-3 text-lg font-normal text-muted-foreground">
              ({itemCount} Artikel)
            </span>
          )}
        </h1>

        {/* Source indicator */}
        <p className="text-xs text-muted-foreground mb-6">
          {merging
            ? 'Warenkorb wird synchronisiert…'
            : isLoggedIn
            ? 'Gespeicherter Warenkorb'
            : 'Gastwarenkorb — melde dich an, um ihn zu speichern'}
        </p>

        {/* Server error banner */}
        {serverError && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 text-sm text-red-600">
            <ServerCrash className="w-4 h-4 flex-shrink-0" />
            {serverError}
            <button
              onClick={() => loadServerCart()}
              className="ml-auto underline text-xs"
            >
              Erneut versuchen
            </button>
          </div>
        )}

        {/* Merge spinner */}
        {merging && (
          <div className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded-xl flex items-center gap-3 text-sm text-primary">
            <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
            Lokale Artikel werden mit deinem Konto synchronisiert…
          </div>
        )}

        {/* Empty state */}
        {!merging && items.length === 0 ? (
          <div className="glass border border-border rounded-2xl p-20 text-center">
            <ShoppingBag className="w-16 h-16 mx-auto mb-5 text-muted-foreground" />
            <h2 className="text-xl font-bold mb-2">Dein Warenkorb ist leer</h2>
            <p className="text-muted-foreground mb-6 text-sm">
              Entdecke unsere Produkte und füge sie hier hinzu.
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity text-sm"
            >
              Weiter einkaufen
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">

            {/* Items list */}
            <div className="lg:col-span-2 space-y-4">
              {items.map(item => {
                const lineTotal   = item.price * item.quantity
                const isAtMax     = item.quantity >= item.stockQuantity
                const isUpdating  = updatingId === item.id

                return (
                  <div
                    key={item.id}
                    className={`glass border border-border rounded-2xl p-5 transition-opacity
                      ${isUpdating ? 'opacity-60' : 'opacity-100'}`}
                  >
                    <div className="flex gap-4">
                      {/* Image */}
                      <Link href={`/products/${item.productId}`} className="flex-shrink-0">
                        <div className="w-24 h-24 rounded-xl overflow-hidden border border-border bg-muted">
                          {item.images?.[0] ? (
                            <Image
                              src={item.images[0]}
                              alt={item.title}
                              width={96} height={96}
                              className="w-full h-full object-cover hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                              Kein Bild
                            </div>
                          )}
                        </div>
                      </Link>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <Link
                              href={`/products/${item.productId}`}
                              className="font-semibold text-sm line-clamp-2 hover:text-primary transition-colors"
                            >
                              {item.title}
                            </Link>
                            {item.brand && (
                              <p className="text-xs text-muted-foreground mt-0.5">{item.brand}</p>
                            )}
                            {item.selectedSize && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Größe: {item.selectedSize}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => removeItem(item)}
                            disabled={isUpdating}
                            className="flex-shrink-0 p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-30"
                            aria-label="Artikel entfernen"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between mt-3">
                          {/* Qty stepper */}
                          <div className="flex items-center gap-1 border border-border rounded-xl overflow-hidden">
                            <button
                              onClick={() => updateQuantity(item, item.quantity - 1)}
                              disabled={item.quantity <= 1 || isUpdating}
                              className="w-10 h-10 flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-30"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-8 text-center text-sm font-bold select-none">
                              {isUpdating
                                ? <Loader2 className="w-3 h-3 animate-spin mx-auto" />
                                : item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item, item.quantity + 1)}
                              disabled={isAtMax || isUpdating}
                              className="w-10 h-10 flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-30"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Line total */}
                          <span className="font-bold text-base">
                            €{lineTotal.toFixed(2)}
                          </span>
                        </div>

                        {isAtMax && (
                          <p className="text-xs text-amber-500 mt-1.5 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Maximale Lagermenge ({item.stockQuantity}) erreicht
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Order summary */}
            <div className="lg:col-span-1">
              <div className="glass border border-border rounded-2xl p-6 sticky top-8">
                <h2 className="text-lg font-bold mb-5">Bestellübersicht</h2>

                <div className="space-y-3 mb-5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Zwischensumme</span>
                    <span className="font-semibold">€{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Versand</span>
                    <span className={`font-semibold ${shipping === 0 ? 'text-green-600' : ''}`}>
                      {shipping === 0 ? 'Kostenlos' : `€${shipping.toFixed(2)}`}
                    </span>
                  </div>

                  {remaining > 0 && (
                    <div className="p-3 rounded-xl text-xs font-medium"
                      style={{ background: 'rgba(var(--primary-rgb, 217 119 6) / 0.06)', border: '1px solid rgba(var(--primary-rgb, 217 119 6) / 0.2)', color: 'var(--primary)' }}>
                      Noch <strong>€{remaining.toFixed(2)}</strong> bis zum kostenlosen Versand!
                    </div>
                  )}

                  <div className="border-t border-border pt-3">
                    <div className="flex justify-between font-bold text-base">
                      <span>Gesamt</span>
                      <span className="text-primary">€{total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => router.push('/checkout')}
                  disabled={items.length === 0 || merging}
                  className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Zur Kasse
                </button>

                <Link
                  href="/"
                  className="block w-full py-3 mt-2.5 text-center glass border border-border rounded-xl font-semibold hover:border-primary transition-colors text-sm"
                >
                  Weiter einkaufen
                </Link>

                {!isLoggedIn && (
                  <p className="text-xs text-muted-foreground mt-4 text-center">
                    <Link href="/auth/signin" className="text-primary underline hover:no-underline">
                      Anmelden
                    </Link>
                    {' '}um deinen Warenkorb zu speichern
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
