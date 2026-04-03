/**
 * GET   /api/seller/products/[id] — fetch single product for the authenticated seller
 * PATCH /api/seller/products/[id] — update product fields
 *
 * Auth: NextAuth session cookie (getServerSession).
 * DB:   supabaseAdmin bypasses RLS so ownership check is done in query.
 *
 * Core fields that trigger re-moderation when changed:
 *   title, description, price, images, category
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabaseAdmin } from '@/lib/supabase-admin'

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function resolveSeller(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('sellers')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()
  return { seller: data, error }
}

// ─── GET /api/seller/products/[id] ────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { seller, error: sellerErr } = await resolveSeller(session.user.id)
  if (sellerErr) {
    console.error('[api/seller/products/[id] GET] seller lookup:', sellerErr.message)
    return NextResponse.json({ success: false, error: 'Database error' }, { status: 500 })
  }
  if (!seller) {
    return NextResponse.json({ success: false, error: 'Seller not found' }, { status: 404 })
  }

  const { data: product, error: prodErr } = await supabaseAdmin
    .from('products')
    .select('*')
    .eq('id', id)
    .eq('seller_id', seller.id)
    .maybeSingle()

  if (prodErr) {
    console.error('[api/seller/products/[id] GET] product fetch:', prodErr.message)
    return NextResponse.json({ success: false, error: 'Database error' }, { status: 500 })
  }
  if (!product) {
    return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, product })
}

// ─── PATCH /api/seller/products/[id] ─────────────────────────────────────────

// Fields that trigger re-moderation when changed
const MODERATION_FIELDS = new Set(['title', 'description', 'price', 'images', 'category'])

// Allowed fields that can be updated by the seller
const ALLOWED_FIELDS = new Set([
  'title', 'description', 'price', 'original_price',
  'category', 'brand', 'color', 'sizes', 'stock_quantity',
  'images', 'status',
])

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 })
  }

  const { seller, error: sellerErr } = await resolveSeller(session.user.id)
  if (sellerErr) {
    console.error('[api/seller/products/[id] PATCH] seller lookup:', sellerErr.message)
    return NextResponse.json({ success: false, error: 'Database error' }, { status: 500 })
  }
  if (!seller) {
    return NextResponse.json({ success: false, error: 'Seller not found' }, { status: 404 })
  }

  // Fetch current product to check existence and ownership
  const { data: current, error: fetchErr } = await supabaseAdmin
    .from('products')
    .select('id, moderation_status, seller_id')
    .eq('id', id)
    .eq('seller_id', seller.id)
    .maybeSingle()

  if (fetchErr) {
    console.error('[api/seller/products/[id] PATCH] fetch current:', fetchErr.message)
    return NextResponse.json({ success: false, error: 'Database error' }, { status: 500 })
  }
  if (!current) {
    return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 })
  }

  // Handle new image uploads (base64 → Supabase storage)
  let finalImages: string[] | undefined
  const { keepImages, newImages, ...restBody } = body as {
    keepImages?: string[]
    newImages?: Array<{ name: string; data: string }>
    [key: string]: unknown
  }

  if (keepImages !== undefined || newImages !== undefined) {
    const kept = Array.isArray(keepImages) ? keepImages : []
    const uploadedUrls: string[] = []

    if (Array.isArray(newImages) && newImages.length > 0) {
      for (const img of newImages) {
        try {
          const base64Data = img.data.split(',')[1]
          const buffer = Buffer.from(base64Data, 'base64')
          const ext = img.name.split('.').pop()
          const fileName = `${seller.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

          const { error: uploadErr } = await supabaseAdmin.storage
            .from('products')
            .upload(fileName, buffer, { contentType: `image/${ext}`, cacheControl: '3600', upsert: false })

          if (uploadErr) throw uploadErr

          const { data: { publicUrl } } = supabaseAdmin.storage.from('products').getPublicUrl(fileName)
          uploadedUrls.push(publicUrl)
        } catch (err: unknown) {
          console.error('[api/seller/products/[id] PATCH] image upload failed:', err)
          // Clean up already-uploaded images on failure
          for (const url of uploadedUrls) {
            const path = url.split('/products/')[1]
            await supabaseAdmin.storage.from('products').remove([path])
          }
          return NextResponse.json({ success: false, error: 'Image upload failed' }, { status: 500 })
        }
      }
    }

    finalImages = [...kept, ...uploadedUrls]
  }

  // Build update payload — only allowed fields
  const updates: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(restBody)) {
    if (ALLOWED_FIELDS.has(key)) updates[key] = value
  }
  if (finalImages !== undefined) updates.images = finalImages

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ success: false, error: 'No valid fields to update' }, { status: 400 })
  }

  // Re-moderation: if a core field changed and product was approved, reset to pending
  const needsRemoderation = Object.keys(updates).some(k => MODERATION_FIELDS.has(k))
  if (needsRemoderation && current.moderation_status === 'approved') {
    updates.moderation_status = 'pending'
  }

  updates.updated_at = new Date().toISOString()

  const { data: updated, error: updateErr } = await supabaseAdmin
    .from('products')
    .update(updates)
    .eq('id', id)
    .eq('seller_id', seller.id)
    .select()
    .maybeSingle()

  if (updateErr) {
    console.error('[api/seller/products/[id] PATCH] update:', updateErr.message)
    return NextResponse.json({ success: false, error: 'Update failed' }, { status: 500 })
  }

  return NextResponse.json({ success: true, product: updated })
}
