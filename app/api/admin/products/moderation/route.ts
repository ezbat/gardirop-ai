/**
 * GET  /api/admin/products/moderation  — paginated product list for moderation
 * POST /api/admin/products/moderation  — approve | reject | needs_changes
 *
 * Auth: x-admin-token header
 *
 * GET query params:
 *   status  — pending | approved | rejected | needs_changes | all  (default: pending)
 *   search  — title, store name, or product id
 *   page    — 1-based (default: 1)
 *   limit   — max 50 (default: 20)
 *
 * POST body:
 *   { productId, action: 'approve'|'reject'|'needs_changes', reason? }
 *   reason is REQUIRED for reject and needs_changes.
 */

import { NextRequest, NextResponse }     from 'next/server'
import { supabaseAdmin }                  from '@/lib/supabase-admin'
import {
  createSellerNotification,
}                                         from '@/lib/notifications'
import { sendEmail }                      from '@/lib/email'
import { getProductApprovedEmail, getProductRejectedEmail } from '@/lib/email-templates'
import { requireAdmin }                   from '@/lib/admin-auth'

// ─── GET — product list ───────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const auth = requireAdmin(req)
  if (auth.error) return auth.error

  const { searchParams } = req.nextUrl
  const status = searchParams.get('status') ?? 'pending'
  const search = searchParams.get('search')?.trim() ?? ''
  const page   = Math.max(1, Number(searchParams.get('page')  ?? 1))
  const limit  = Math.min(50, Math.max(1, Number(searchParams.get('limit') ?? 20)))
  const from   = (page - 1) * limit

  // Build query with seller join
  let query = supabaseAdmin
    .from('products')
    .select(
      'id, title, description, price, images, stock_quantity, moderation_status, moderation_notes, moderated_at, category, brand, created_at, seller_id, seller:sellers(id, shop_name, shop_slug)',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1)

  // Status filter
  if (status !== 'all') {
    query = query.eq('moderation_status', status)
  }

  // Search: by product id, title, or seller shop_name
  if (search) {
    // Check if search looks like a UUID
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (uuidRe.test(search)) {
      query = query.eq('id', search)
    } else {
      const escaped = search.replace(/[%_\\]/g, '\\$&')
      query = query.ilike('title', `%${escaped}%`)
    }
  }

  const { data, error, count } = await query

  if (error) {
    console.error('[api/admin/products/moderation GET]', error.message)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  // Count per status (for tab badges) — run in parallel
  const [pendingRes, rejectedRes, needsRes] = await Promise.all([
    supabaseAdmin.from('products').select('id', { count: 'exact', head: true }).eq('moderation_status', 'pending'),
    supabaseAdmin.from('products').select('id', { count: 'exact', head: true }).eq('moderation_status', 'rejected'),
    supabaseAdmin.from('products').select('id', { count: 'exact', head: true }).eq('moderation_status', 'needs_changes'),
  ])

  return NextResponse.json({
    success:  true,
    products: data ?? [],
    total:    count ?? 0,
    page,
    limit,
    counts: {
      pending:       pendingRes.count   ?? 0,
      rejected:      rejectedRes.count  ?? 0,
      needs_changes: needsRes.count     ?? 0,
    },
  })
}

// ─── POST — moderate product ──────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = requireAdmin(req)
  if (auth.error) return auth.error

  const body = await req.json().catch(() => ({}))
  const { productId, action, reason } = body as {
    productId?: string
    action?:    string
    reason?:    string
  }

  const VALID_ACTIONS = ['approve', 'reject', 'needs_changes'] as const
  type Action = typeof VALID_ACTIONS[number]

  if (!productId?.trim()) {
    return NextResponse.json({ success: false, error: 'productId is required' }, { status: 400 })
  }
  if (!action || !(VALID_ACTIONS as readonly string[]).includes(action)) {
    return NextResponse.json(
      { success: false, error: `action must be one of: ${VALID_ACTIONS.join(', ')}` },
      { status: 400 },
    )
  }
  if (action !== 'approve' && !reason?.trim()) {
    return NextResponse.json(
      { success: false, error: 'reason is required for reject and needs_changes' },
      { status: 400 },
    )
  }

  // Fetch current product + seller
  const { data: product, error: fetchErr } = await supabaseAdmin
    .from('products')
    .select('id, title, moderation_status, seller_id, seller:sellers(id)')
    .eq('id', productId.trim())
    .maybeSingle()

  if (fetchErr) {
    return NextResponse.json({ success: false, error: fetchErr.message }, { status: 500 })
  }
  if (!product) {
    return NextResponse.json({ success: false, error: 'Produkt nicht gefunden' }, { status: 404 })
  }

  // Map action → new moderation_status
  const statusMap: Record<Action, string> = {
    approve:        'approved',
    reject:         'rejected',
    needs_changes:  'needs_changes',
  }
  const newStatus = statusMap[action as Action]
  const now       = new Date().toISOString()

  const { error: updateErr } = await supabaseAdmin
    .from('products')
    .update({
      moderation_status: newStatus,
      moderation_notes:  reason?.trim() || null,
      moderated_by:      'admin',
      moderated_at:      now,
    })
    .eq('id', productId)

  if (updateErr) {
    console.error('[api/admin/products/moderation POST] update:', updateErr.message)
    return NextResponse.json({ success: false, error: updateErr.message }, { status: 500 })
  }

  // ── Seller notification (best-effort) ────────────────────────────────────
  const sellerId = (product.seller as any)?.id ?? product.seller_id
  if (sellerId) {
    if (action === 'approve') {
      createSellerNotification(sellerId, 'product_approved', {
        body: `"${product.title}" ist jetzt im Shop sichtbar.`,
        link: `/seller/products/${productId}`,
      })
    } else if (action === 'reject') {
      createSellerNotification(sellerId, 'product_rejected', {
        body: reason?.trim()
          ? `"${product.title}" wurde abgelehnt. Grund: ${reason.trim()}`
          : `"${product.title}" wurde nicht genehmigt.`,
        link: `/seller/products/${productId}`,
      })
    } else if (action === 'needs_changes') {
      createSellerNotification(sellerId, 'product_rejected', {
        title: 'Produkt: Änderungen erforderlich',
        body:  reason?.trim()
          ? `"${product.title}" — bitte überarbeite: ${reason.trim()}`
          : `"${product.title}" benötigt Überarbeitungen.`,
        link: `/seller/products/${productId}/edit`,
      })
    }
  }

  // ─ Email hooks (best-effort) ─
  if (sellerId && (action === 'approve' || action === 'reject' || action === 'needs_changes')) {
    void (async () => {
      try {
        const { data: sellerInfo } = await supabaseAdmin
          .from('sellers')
          .select('shop_name, user_id')
          .eq('id', sellerId)
          .maybeSingle()
        if (!sellerInfo?.user_id) return

        const { data: userInfo } = await supabaseAdmin
          .from('users')
          .select('email')
          .eq('id', sellerInfo.user_id)
          .maybeSingle()
        if (!userInfo?.email) return

        if (action === 'approve') {
          const tpl = getProductApprovedEmail({
            shopName: sellerInfo.shop_name || 'Shop',
            productTitle: product.title,
            productId: productId,
          })
          await sendEmail({ to: userInfo.email, subject: tpl.subject, html: tpl.html, tag: 'product_approved' })
        } else {
          const tpl = getProductRejectedEmail({
            shopName: sellerInfo.shop_name || 'Shop',
            productTitle: product.title,
            productId: productId,
            reason: reason?.trim(),
          })
          await sendEmail({ to: userInfo.email, subject: tpl.subject, html: tpl.html, tag: 'product_rejected' })
        }
      } catch {}
    })()
  }

  // ── Audit log (best-effort) ───────────────────────────────────────────────
  supabaseAdmin
    .from('audit_logs')
    .insert({
      actor_type:    'admin',
      action:        `product_moderation_${action}`,
      resource_type: 'product',
      resource_id:   productId,
      details: {
        previous_status: product.moderation_status,
        new_status:      newStatus,
        ...(reason?.trim() ? { reason: reason.trim() } : {}),
      },
      severity: 'info',
    })
    .then(({ error }) => {
      if (error && error.code !== '42P01') {
        console.warn('[api/admin/products/moderation] audit_logs insert failed:', error.message)
      }
    })

  return NextResponse.json({ success: true, newStatus })
}
