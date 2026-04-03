/**
 * /api/cart
 *
 * Server-side persistent cart for authenticated users.
 * supabaseAdmin bypasses RLS — auth is enforced via NextAuth session.
 *
 * GET    — list cart items, enriched with current product data
 * POST   — upsert single item  OR  merge array from localStorage
 * PATCH  — update quantity for an existing item
 * DELETE — remove single item OR clear entire cart
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabaseAdmin } from '@/lib/supabase-admin'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CartItemDTO {
  id:           string        // cart_items row uuid
  productId:    string
  title:        string
  price:        number        // current DB price (authoritative)
  originalPrice: number | null
  images:       string[]
  stockQuantity: number
  brand:        string | null
  sellerId:     string
  category:     string | null
  quantity:     number
  selectedSize?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function requireSession() {
  const session = await getServerSession(authOptions)
  return session?.user?.id ?? null
}

/** Fetch product row. Returns null if not found or not approved. */
async function fetchProduct(productId: string) {
  const { data } = await supabaseAdmin
    .from('products')
    .select('id, title, price, original_price, images, stock_quantity, brand, seller_id, category, moderation_status')
    .eq('id', productId)
    .eq('moderation_status', 'approved')
    .maybeSingle()
  return data
}

/** Find an existing cart row for this user+product+size combo. */
async function findCartRow(userId: string, productId: string, selectedSize?: string | null) {
  let q = supabaseAdmin
    .from('cart_items')
    .select('id, quantity')
    .eq('user_id', userId)
    .eq('product_id', productId)

  if (selectedSize) {
    q = q.eq('selected_size', selectedSize)
  } else {
    q = q.is('selected_size', null)
  }

  const { data } = await q.maybeSingle()
  return data
}

// ─── GET /api/cart ─────────────────────────────────────────────────────────────

export async function GET() {
  const userId = await requireSession()
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('cart_items')
    .select(`
      id, quantity, selected_size,
      products(id, title, price, original_price, images, stock_quantity, brand, seller_id, category, moderation_status)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[api/cart GET]', error.message)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  const items: CartItemDTO[] = (data ?? [])
    .filter(row => {
      const p = row.products as any
      return p && p.moderation_status === 'approved'
    })
    .map(row => {
      const p = row.products as any
      return {
        id:            row.id,
        productId:     p.id,
        title:         p.title,
        price:         Number(p.price),
        originalPrice: p.original_price ? Number(p.original_price) : null,
        images:        Array.isArray(p.images) ? p.images : [],
        stockQuantity: Number(p.stock_quantity ?? 0),
        brand:         p.brand ?? null,
        sellerId:      p.seller_id,
        category:      p.category ?? null,
        quantity:      row.quantity,
        selectedSize:  row.selected_size ?? undefined,
      }
    })

  return NextResponse.json({ success: true, items })
}

// ─── POST /api/cart ────────────────────────────────────────────────────────────
//
// Body option A — single upsert:
//   { product_id: string, quantity: number, selected_size?: string }
//
// Body option B — merge from localStorage (on login):
//   { merge: Array<{ product_id, quantity, selected_size? }> }

export async function POST(request: NextRequest) {
  const userId = await requireSession()
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  if (!body) {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
  }

  // ── Merge mode ──────────────────────────────────────────────────────────────
  if (Array.isArray(body.merge)) {
    const mergeItems = body.merge as Array<{
      product_id: string; quantity: number; selected_size?: string
    }>

    let merged = 0
    for (const item of mergeItems) {
      if (!item.product_id || item.quantity < 1) continue

      const product = await fetchProduct(item.product_id)
      if (!product) continue

      const safeQty = Math.min(Math.max(1, item.quantity), Number(product.stock_quantity ?? 0))
      if (safeQty === 0) continue

      const existing = await findCartRow(userId, item.product_id, item.selected_size)

      if (existing) {
        // Take the higher quantity (up to stock)
        const newQty = Math.min(
          Math.max(existing.quantity, safeQty),
          Number(product.stock_quantity ?? 0),
        )
        await supabaseAdmin
          .from('cart_items')
          .update({ quantity: newQty })
          .eq('id', existing.id)
      } else {
        await supabaseAdmin.from('cart_items').insert({
          user_id:       userId,
          product_id:    item.product_id,
          selected_size: item.selected_size ?? null,
          quantity:      safeQty,
        })
      }
      merged++
    }

    return NextResponse.json({ success: true, merged })
  }

  // ── Single upsert ───────────────────────────────────────────────────────────
  const { product_id, quantity, selected_size } = body as {
    product_id?: string; quantity?: number; selected_size?: string
  }

  if (!product_id || typeof quantity !== 'number' || quantity < 1) {
    return NextResponse.json(
      { success: false, error: 'product_id and quantity (>0) are required' },
      { status: 400 },
    )
  }

  const product = await fetchProduct(product_id)
  if (!product) {
    return NextResponse.json({ success: false, error: 'Product not available' }, { status: 400 })
  }

  const safeQty = Math.min(Math.max(1, quantity), Number(product.stock_quantity ?? 0))

  const existing = await findCartRow(userId, product_id, selected_size)

  if (existing) {
    const newQty = Math.min(existing.quantity + safeQty, Number(product.stock_quantity ?? 0))
    const { error } = await supabaseAdmin
      .from('cart_items')
      .update({ quantity: newQty })
      .eq('id', existing.id)
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, action: 'updated', quantity: newQty })
  }

  const { error } = await supabaseAdmin.from('cart_items').insert({
    user_id:       userId,
    product_id,
    selected_size: selected_size ?? null,
    quantity:      safeQty,
  })
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, action: 'added', quantity: safeQty })
}

// ─── PATCH /api/cart ───────────────────────────────────────────────────────────
//
// Body: { product_id, quantity, selected_size? }
// Sets absolute quantity (not additive). quantity=0 → remove.

export async function PATCH(request: NextRequest) {
  const userId = await requireSession()
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  const { product_id, quantity, selected_size } = (body ?? {}) as {
    product_id?: string; quantity?: number; selected_size?: string
  }

  if (!product_id || typeof quantity !== 'number') {
    return NextResponse.json(
      { success: false, error: 'product_id and quantity are required' },
      { status: 400 },
    )
  }

  // quantity=0 means remove
  if (quantity === 0) {
    const existing = await findCartRow(userId, product_id, selected_size)
    if (existing) {
      await supabaseAdmin.from('cart_items').delete().eq('id', existing.id)
    }
    return NextResponse.json({ success: true, action: 'removed' })
  }

  const product = await fetchProduct(product_id)
  if (!product) {
    return NextResponse.json({ success: false, error: 'Product not available' }, { status: 400 })
  }

  const safeQty = Math.min(Math.max(1, quantity), Number(product.stock_quantity ?? 0))
  const existing = await findCartRow(userId, product_id, selected_size)

  if (existing) {
    const { error } = await supabaseAdmin
      .from('cart_items')
      .update({ quantity: safeQty })
      .eq('id', existing.id)
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, action: 'updated', quantity: safeQty })
  }

  return NextResponse.json({ success: false, error: 'Item not in cart' }, { status: 404 })
}

// ─── DELETE /api/cart ──────────────────────────────────────────────────────────
//
// Body: { product_id, selected_size? }  → remove one item
// Body: { clear: true }                → clear entire cart

export async function DELETE(request: NextRequest) {
  const userId = await requireSession()
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null) as Record<string, unknown> | null

  // Clear all
  if ((body as any)?.clear === true) {
    const { error } = await supabaseAdmin
      .from('cart_items')
      .delete()
      .eq('user_id', userId)
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, action: 'cleared' })
  }

  const { product_id, selected_size } = (body ?? {}) as {
    product_id?: string; selected_size?: string
  }

  if (!product_id) {
    return NextResponse.json(
      { success: false, error: 'product_id required (or clear: true)' },
      { status: 400 },
    )
  }

  const existing = await findCartRow(userId, product_id, selected_size)
  if (!existing) {
    return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 })
  }

  const { error } = await supabaseAdmin.from('cart_items').delete().eq('id', existing.id)
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, action: 'removed' })
}
