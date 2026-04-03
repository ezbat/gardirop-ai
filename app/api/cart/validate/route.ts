/**
 * POST /api/cart/validate
 *
 * Validates a list of cart items against current DB prices and stock.
 * Called by the checkout page before showing the form AND before submitting.
 *
 * No auth required — guest carts are also validated.
 *
 * Input:
 *   { items: Array<{ product_id, quantity, price, selected_size? }> }
 *
 * Output:
 *   { items: ValidatedItem[], hasBlockingIssues: boolean }
 *
 * A "blocking issue" is one that prevents checkout entirely (OOS / unavailable).
 * A "warning" (price changed, qty capped) shows a banner but allows checkout.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export interface ValidateInput {
  product_id:    string
  quantity:      number
  price:         number       // price the client had (for change detection)
  selected_size?: string
}

export interface ValidatedItem {
  product_id:    string
  title:         string
  images:        string[]
  brand:         string | null
  seller_id:     string
  selected_size?: string

  requestedQty:  number
  cappedQty:     number       // qty capped to available stock
  stockQuantity: number

  cartPrice:     number       // price the client sent
  currentPrice:  number       // authoritative price from DB
  priceChanged:  boolean

  isUnavailable: boolean      // product not found / not approved → blocks checkout
  isOutOfStock:  boolean      // stock_quantity === 0 → blocks checkout
  isQtyCapped:   boolean      // requested > available (capped, shows warning)
}

export async function POST(request: NextRequest) {
  let body: { items?: ValidateInput[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const inputItems = body?.items
  if (!Array.isArray(inputItems) || inputItems.length === 0) {
    return NextResponse.json({ error: 'items array required' }, { status: 400 })
  }

  // Deduplicate product IDs for a single batch fetch
  const productIds = [...new Set(inputItems.map(i => i.product_id).filter(Boolean))]

  const { data: products, error: dbErr } = await supabaseAdmin
    .from('products')
    .select('id, title, price, images, stock_quantity, brand, seller_id, category, moderation_status')
    .in('id', productIds)

  if (dbErr) {
    console.error('[api/cart/validate]', dbErr.message)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  const productMap = new Map((products ?? []).map(p => [p.id, p]))

  const validated: ValidatedItem[] = inputItems.map(item => {
    const p = productMap.get(item.product_id)

    if (!p || p.moderation_status !== 'approved') {
      return {
        product_id:    item.product_id,
        title:         'Nicht verfügbar',
        images:        [],
        brand:         null,
        seller_id:     '',
        selected_size: item.selected_size,
        requestedQty:  item.quantity,
        cappedQty:     0,
        stockQuantity: 0,
        cartPrice:     item.price,
        currentPrice:  0,
        priceChanged:  false,
        isUnavailable: true,
        isOutOfStock:  false,
        isQtyCapped:   false,
      }
    }

    const stockQty    = Number(p.stock_quantity ?? 0)
    const currentPrice = Number(p.price)
    const requestedQty = Math.max(1, item.quantity)
    const cappedQty    = Math.min(requestedQty, stockQty)

    return {
      product_id:    p.id,
      title:         p.title,
      images:        Array.isArray(p.images) ? p.images : [],
      brand:         p.brand ?? null,
      seller_id:     p.seller_id,
      selected_size: item.selected_size,
      requestedQty,
      cappedQty,
      stockQuantity: stockQty,
      cartPrice:     item.price,
      currentPrice,
      priceChanged:  Math.abs(currentPrice - item.price) > 0.001,
      isUnavailable: false,
      isOutOfStock:  stockQty === 0,
      isQtyCapped:   cappedQty < requestedQty && stockQty > 0,
    }
  })

  const hasBlockingIssues = validated.some(i => i.isUnavailable || i.isOutOfStock)

  return NextResponse.json({ items: validated, hasBlockingIssues })
}
