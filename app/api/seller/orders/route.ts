/**
 * GET /api/seller/orders
 *
 * Returns all orders that contain products belonging to the authenticated seller.
 * Uses the product → order_items → orders join so it works in a multi-seller
 * marketplace where a single order may contain items from several sellers.
 *
 * Query params:
 *   period  – 7 | 30 | 90 | 0 (days back; 0 = all time, default 90)
 *
 * Auth: NextAuth session cookie (getServerSession).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  // ── 1. Resolve seller ──────────────────────────────────────────────────────
  const { data: seller, error: sellerErr } = await supabaseAdmin
    .from('sellers')
    .select('id')
    .eq('user_id', session.user.id)
    .maybeSingle()

  if (sellerErr) console.error('[seller/orders] seller lookup:', sellerErr.message)

  if (!seller) {
    return NextResponse.json({ success: false, error: 'Seller not found' }, { status: 403 })
  }

  // ── 2. Parse params ────────────────────────────────────────────────────────
  const { searchParams } = new URL(request.url)
  const period = Math.max(0, parseInt(searchParams.get('period') || '90'))

  // ── 3. Get this seller's product IDs ────────────────────────────────────────
  const { data: productRows, error: prodErr } = await supabaseAdmin
    .from('products')
    .select('id')
    .eq('seller_id', seller.id)

  if (prodErr) console.error('[seller/orders] products lookup:', prodErr.message)

  const productIds = (productRows ?? []).map((p: { id: string }) => p.id)

  if (productIds.length === 0) {
    return NextResponse.json({
      success: true,
      orders: [],
      stats: { total: 0, paid: 0, pending: 0, shipped: 0, revenue: 0 },
    })
  }

  // ── 4. Fetch order_items for those products ──────────────────────────────────
  const { data: rawItems, error: itemsErr } = await supabaseAdmin
    .from('order_items')
    .select(`
      id, product_id, quantity, price, selected_size,
      orders!inner(
        id, state, payment_status, total_amount, currency,
        created_at, shipping_address, shipping_info
      ),
      products(id, title, images)
    `)
    .in('product_id', productIds)
    .limit(2000)

  if (itemsErr) {
    console.error('[seller/orders] order_items query:', itemsErr.message)
    return NextResponse.json({ success: false, error: 'Database error' }, { status: 500 })
  }

  // ── 5. Build orders map ────────────────────────────────────────────────────
  const periodCutoff = period > 0
    ? new Date(Date.now() - period * 86_400_000)
    : null

  type OrderEntry = {
    id: string; state: string; paymentStatus: string
    totalAmount: number; currency: string; createdAt: string
    customerName: string; shippingAddress: Record<string, unknown> | null
    items: {
      id: string; productId: string; productTitle: string
      productImage: string | null; quantity: number
      price: number; selectedSize: string | null
    }[]
  }

  const ordersMap = new Map<string, OrderEntry>()

  for (const raw of rawItems ?? []) {
    const item   = raw as Record<string, unknown>
    const order  = item.orders as Record<string, unknown> | null
    if (!order) continue

    // Period filter in JS (safer than PostgREST nested resource filter)
    if (periodCutoff && new Date(order.created_at as string) < periodCutoff) continue

    const orderId = order.id as string

    if (!ordersMap.has(orderId)) {
      const shippingData =
        (order.shipping_address as Record<string, unknown> | null) ??
        (order.shipping_info   as Record<string, unknown> | null) ??
        null

      const customerName =
        (shippingData?.fullName  as string | undefined) ??
        (shippingData?.full_name as string | undefined) ??
        'Kunde'

      ordersMap.set(orderId, {
        id:             orderId,
        state:          (order.state          as string | null) ?? 'CREATED',
        paymentStatus:  (order.payment_status as string | null) ?? 'pending',
        totalAmount:    Number(order.total_amount ?? 0),
        currency:       (order.currency       as string | null) ?? 'EUR',
        createdAt:      order.created_at as string,
        customerName,
        shippingAddress: shippingData,
        items: [],
      })
    }

    const product = item.products as Record<string, unknown> | null
    const images  = Array.isArray(product?.images) ? product!.images as string[] : []

    ordersMap.get(orderId)!.items.push({
      id:           item.id as string,
      productId:    item.product_id as string,
      productTitle: (product?.title as string | null) ?? 'Produkt',
      productImage: images[0] ?? null,
      quantity:     Number(item.quantity ?? 1),
      price:        Number(item.price    ?? 0),
      selectedSize: (item.selected_size as string | null) ?? null,
    })
  }

  const orders = Array.from(ordersMap.values())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  // ── 6. Stats ───────────────────────────────────────────────────────────────
  const paidOrders    = orders.filter(o => o.paymentStatus === 'paid')
  const pendingOrders = orders.filter(o =>
    o.state === 'CREATED' || o.state === 'PAYMENT_PENDING'
  )
  const shippedOrders = orders.filter(o => o.state === 'SHIPPED')
  const revenue       = paidOrders.reduce((s, o) => s + o.totalAmount, 0)

  return NextResponse.json({
    success: true,
    orders,
    stats: {
      total:   orders.length,
      paid:    paidOrders.length,
      pending: pendingOrders.length,
      shipped: shippedOrders.length,
      revenue: Math.round(revenue * 100) / 100,
    },
  })
}
