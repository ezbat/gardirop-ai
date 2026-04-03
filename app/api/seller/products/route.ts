/**
 * GET  /api/seller/products   — list all products for the authenticated seller
 * PATCH /api/seller/products  — toggle status (active / inactive) to show/hide a product
 *
 * Auth: NextAuth session cookie (getServerSession).
 * DB:   supabaseAdmin bypasses RLS so resolution is always stable.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { fetchThresholdConfig, resolveThreshold } from '@/lib/inventory-threshold'

// ─── Types ────────────────────────────────────────────────────────────────────

type RawProduct = {
  id: string
  title: string
  price: unknown
  original_price: unknown
  images: unknown
  stock_quantity: unknown
  status: string | null
  moderation_status: string | null
  category: string | null
  brand: string | null
  low_stock_threshold: number | null
  created_at: string
}

// ─── Shared seller resolver ────────────────────────────────────────────────────

async function resolveSeller(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('sellers')
    .select('id, shop_name')
    .eq('user_id', userId)
    .maybeSingle()

  return { seller: data, error }
}

// ─── GET /api/seller/products ─────────────────────────────────────────────────

export async function GET(_request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { seller, error: sellerErr } = await resolveSeller(session.user.id)

  if (sellerErr) {
    console.error('[api/seller/products GET] seller lookup:', sellerErr.message)
    return NextResponse.json({ success: false, error: 'Database error' }, { status: 500 })
  }
  if (!seller) {
    return NextResponse.json({ success: false, error: 'Seller not found' }, { status: 404 })
  }

  // Fetch all products for this seller
  // Only select columns confirmed to exist across all migrations
  const [{ data: rows, error: prodErr }, thresholdConfig] = await Promise.all([
    supabaseAdmin
      .from('products')
      .select(`
        id, title, price, original_price,
        images, stock_quantity, status,
        moderation_status,
        category, brand, low_stock_threshold, created_at
      `)
      .eq('seller_id', seller.id)
      .order('created_at', { ascending: false })
      .limit(500) as unknown as Promise<{ data: RawProduct[] | null; error: unknown }>,
    fetchThresholdConfig(),
  ])

  if (prodErr) {
    const msg = (prodErr as { message?: string }).message ?? 'unknown'
    console.error('[api/seller/products GET] products fetch:', msg)
    return NextResponse.json({ success: false, error: `Database error: ${msg}` }, { status: 500 })
  }

  const products = rows ?? []

  // ── KPI aggregation ────────────────────────────────────────────────────────
  const total     = products.length
  const approved  = products.filter(p => p.moderation_status === 'approved').length
  const pending   = products.filter(p => !p.moderation_status || p.moderation_status === 'pending').length
  const rejected  = products.filter(p => p.moderation_status === 'rejected').length
  const inactive  = products.filter(p => p.status === 'inactive').length
  const outOfStock = products.filter(p => Number(p.stock_quantity ?? 0) === 0).length
  const lowStock  = products.filter(p => {
    const qty = Number(p.stock_quantity ?? 0)
    const thr = resolveThreshold(thresholdConfig, p)
    return qty > 0 && qty <= thr
  }).length

  // ── Normalize ──────────────────────────────────────────────────────────────
  const normalized = products.map(p => {
    const qty = Number(p.stock_quantity ?? 0)
    const thr = resolveThreshold(thresholdConfig, p)
    const compareAt = (p.original_price as number | null) ?? null

    return {
      id:                p.id,
      title:             p.title,
      price:             Number(p.price),
      compareAtPrice:    compareAt,
      images:            Array.isArray(p.images) ? (p.images as string[]) : [],
      stockQuantity:     qty,
      lowStockThreshold: thr,
      isLowStock:        qty > 0 && qty <= thr,
      isOutOfStock:      qty === 0,
      moderationStatus:  p.moderation_status ?? 'pending',
      isActive:          p.status !== 'inactive',
      category:          p.category,
      brand:             p.brand,
      sku:               null,
      createdAt:         p.created_at,
    }
  })

  return NextResponse.json({
    success:  true,
    seller:   { id: seller.id, shopName: seller.shop_name },
    products: normalized,
    kpis:     { total, approved, pending, rejected, inactive, outOfStock, lowStock },
  })
}

// ─── PATCH /api/seller/products — toggle is_active ────────────────────────────

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  const { productId, isActive } = body ?? {}

  if (!productId || typeof isActive !== 'boolean') {
    return NextResponse.json(
      { success: false, error: 'productId (string) and isActive (boolean) are required' },
      { status: 400 },
    )
  }

  const { seller, error: sellerErr } = await resolveSeller(session.user.id)

  if (sellerErr) {
    console.error('[api/seller/products PATCH] seller lookup:', (sellerErr as { message?: string }).message)
    return NextResponse.json({ success: false, error: 'Database error' }, { status: 500 })
  }
  if (!seller) {
    return NextResponse.json({ success: false, error: 'Seller not found' }, { status: 404 })
  }

  const { error: updateErr } = await supabaseAdmin
    .from('products')
    .update({ status: isActive ? 'active' : 'inactive' })
    .eq('id', productId as string)
    .eq('seller_id', seller.id)   // ownership check — cannot toggle another seller's product

  if (updateErr) {
    console.error('[api/seller/products PATCH] update:', updateErr.message)
    return NextResponse.json({ success: false, error: 'Update failed' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
