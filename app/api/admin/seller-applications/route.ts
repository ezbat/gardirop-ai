/**
 * GET  /api/admin/seller-applications  — list applications + summary counts
 * POST /api/admin/seller-applications  — action: under_review | approve | reject | needs_info
 *
 * Auth: x-admin-token header — timing-safe compare against ADMIN_TOKEN env var.
 *
 * On approve:
 *   1. Check if a seller record already exists for this user_id (idempotent).
 *   2. If not, create one using application data.
 *   3. If user_id is null, approve application but return a warning.
 *
 * Audit: writes to audit_logs on every action. Failures are non-blocking.
 */

import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import {
  createAdminNotification,
  createSellerNotification,
} from '@/lib/notifications'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendEmail } from '@/lib/email'
import { getSellerApprovalEmail, getSellerRejectionEmail } from '@/lib/email-templates'
import { requireAdmin } from '@/lib/admin-auth'

// ─── Supabase service-role client ─────────────────────────────────────────────

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

// ─── Slug generator ───────────────────────────────────────────────────────────

async function generateUniqueSlug(
  client: ReturnType<typeof getClient>,
  storeName: string,
): Promise<string> {
  const base =
    storeName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 40) || 'shop'

  let slug = base
  for (let i = 1; i <= 25; i++) {
    const { data } = await client
      .from('sellers')
      .select('id')
      .eq('shop_slug', slug)
      .maybeSingle()
    if (!data) return slug
    slug = `${base}-${i}`
  }
  return `${base}-${Date.now()}`
}

// ─── GET — list applications ───────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req)
  if (auth.error) return auth.error

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') ?? ''
  const search = searchParams.get('search') ?? ''
  const sort   = searchParams.get('sort')   ?? 'newest'

  const client = getClient()

  // ─ Summary counts (fetch all statuses once) ─
  const { data: allStatuses, error: sumErr } = await client
    .from('seller_applications')
    .select('status')

  if (sumErr) {
    return NextResponse.json({ success: false, error: sumErr.message }, { status: 500 })
  }

  const summary = {
    total:        allStatuses?.length ?? 0,
    submitted:    allStatuses?.filter((a) => a.status === 'submitted').length    ?? 0,
    under_review: allStatuses?.filter((a) => a.status === 'under_review').length ?? 0,
    approved:     allStatuses?.filter((a) => a.status === 'approved').length     ?? 0,
    rejected:     allStatuses?.filter((a) => a.status === 'rejected').length     ?? 0,
    needs_info:   allStatuses?.filter((a) => a.status === 'needs_info').length   ?? 0,
  }

  // ─ Applications query ─
  let query = client
    .from('seller_applications')
    .select('*')
    .order('created_at', { ascending: sort === 'oldest' })

  if (status) {
    query = query.eq('status', status)
  }

  if (search.trim()) {
    // Escape SQL wildcards in user input
    const s = search.trim().replace(/[%_\\]/g, '\\$&')
    query = query.or(
      `full_name.ilike.%${s}%,email.ilike.%${s}%,store_name.ilike.%${s}%,company_name.ilike.%${s}%`,
    )
  }

  const { data: applications, error: appsErr } = await query
  if (appsErr) {
    return NextResponse.json({ success: false, error: appsErr.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, summary, applications })
}

// ─── POST — admin actions ──────────────────────────────────────────────────────

const VALID_ACTIONS = ['under_review', 'approve', 'reject', 'needs_info'] as const
type AdminAction = (typeof VALID_ACTIONS)[number]

export async function POST(req: NextRequest) {
  const auth = requireAdmin(req)
  if (auth.error) return auth.error

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  const { applicationId, action, reason } = body as {
    applicationId?: string
    action?: string
    reason?: string
  }

  if (!applicationId?.trim()) {
    return NextResponse.json({ success: false, error: 'applicationId is required' }, { status: 400 })
  }

  if (!action || !(VALID_ACTIONS as readonly string[]).includes(action)) {
    return NextResponse.json(
      { success: false, error: `action must be one of: ${VALID_ACTIONS.join(', ')}` },
      { status: 400 },
    )
  }

  if ((action === 'reject' || action === 'needs_info') && !reason?.trim()) {
    return NextResponse.json(
      { success: false, error: 'reason is required for reject and needs_info actions' },
      { status: 400 },
    )
  }

  const client = getClient()

  // ─ Fetch application ─
  const { data: app, error: fetchErr } = await client
    .from('seller_applications')
    .select('*')
    .eq('id', applicationId)
    .single()

  if (fetchErr || !app) {
    return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 })
  }

  // ─ Build update payload ─
  const now = new Date().toISOString()
  const updatePayload: Record<string, unknown> = {
    status:      action === 'under_review' ? 'under_review' : action,
    updated_at:  now,
    reviewed_at: now,
  }

  if (action === 'reject') {
    updatePayload.rejection_reason = reason?.trim() ?? null
    updatePayload.reviewer_notes   = reason?.trim() ?? null
  } else if (action === 'needs_info') {
    updatePayload.reviewer_notes = reason?.trim() ?? null
  }

  // ─ Approve: create seller record (idempotent) ─
  let sellerWarning: string | undefined
  let sellerCreated = false

  if (action === 'approve') {
    if (!app.user_id) {
      sellerWarning =
        'Application has no linked user account (user_id is null). ' +
        'Seller record was not created — the applicant must register an account first.'
    } else {
      const { data: existingSeller } = await client
        .from('sellers')
        .select('id, shop_name')
        .eq('user_id', String(app.user_id))
        .maybeSingle()

      if (!existingSeller) {
        // Create new seller record from application data
        const slug = await generateUniqueSlug(client, app.store_name)
        const { error: insertErr } = await client.from('sellers').insert({
          user_id:          String(app.user_id),
          shop_name:        app.store_name,
          shop_slug:        slug,
          shop_description: app.store_description ?? null,
          phone:            app.phone ?? null,
          country:          app.country ?? null,
          business_type:    app.business_type ?? null,
          status:           'active',
          created_at:       now,
          updated_at:       now,
        })

        if (insertErr) {
          sellerWarning =
            `Application approved, but seller record creation failed: ${insertErr.message}. ` +
            'Manual seller setup may be required.'
          console.error('[admin/seller-applications] seller insert error:', insertErr)
        } else {
          sellerCreated = true
        }
      }
      // else: seller already exists for this user_id — idempotent, skip
    }
  }

  // ─ Update application status ─
  const { data: updated, error: updateErr } = await client
    .from('seller_applications')
    .update(updatePayload)
    .eq('id', applicationId)
    .select()
    .single()

  if (updateErr) {
    return NextResponse.json({ success: false, error: updateErr.message }, { status: 500 })
  }

  // ─ Audit log (non-blocking — must not fail the main action) ─
  client
    .from('audit_logs')
    .insert({
      actor_type:    'admin',
      action:        `seller_application_${action as AdminAction}`,
      resource_type: 'seller_application',
      resource_id:   applicationId,
      details: {
        previous_status: app.status,
        new_status:      updatePayload.status,
        ...(reason?.trim()  ? { reason: reason.trim() }      : {}),
        ...(sellerCreated   ? { seller_created: true }        : {}),
        ...(sellerWarning   ? { seller_warning: sellerWarning } : {}),
      },
      severity: 'info',
    })
    .then(({ error }) => {
      if (error) console.error('[admin/seller-applications] audit_logs insert failed:', error)
    })

  // ─ Notification hooks (best-effort) ─
  if (action === 'approve' && app.user_id) {
    // Resolve seller id for the notification (was just created or already existed)
    const { data: sellerRow } = await supabaseAdmin
      .from('sellers')
      .select('id')
      .eq('user_id', String(app.user_id))
      .maybeSingle()

    if (sellerRow?.id) {
      createSellerNotification(sellerRow.id, 'application_approved', {
        title: 'Bewerbung genehmigt',
        body:  'Herzlichen Glückwunsch! Dein Seller-Konto ist jetzt aktiv. Du kannst direkt loslegen.',
        link:  '/seller/dashboard',
      })
    }
  } else if (action === 'reject' && app.user_id) {
    const { data: sellerRow } = await supabaseAdmin
      .from('sellers')
      .select('id')
      .eq('user_id', String(app.user_id))
      .maybeSingle()

    if (sellerRow?.id) {
      createSellerNotification(sellerRow.id, 'application_rejected', {
        body: reason?.trim()
          ? `Deine Bewerbung wurde abgelehnt. Grund: ${reason.trim()}`
          : 'Deine Seller-Bewerbung wurde leider abgelehnt.',
      })
    }
  }

  // ─ Email hooks (best-effort) ─
  if (action === 'approve' && app.email) {
    void (async () => {
      try {
        const email = getSellerApprovalEmail({
          shop_name: app.store_name || 'Dein Shop',
          email: app.email,
        })
        await sendEmail({ to: app.email, subject: email.subject, html: email.html, tag: 'seller_approved' })
      } catch {}
    })()
  } else if (action === 'reject' && app.email) {
    void (async () => {
      try {
        const email = getSellerRejectionEmail({
          shop_name: app.store_name || 'Dein Shop',
          email: app.email,
          reason: reason?.trim(),
        })
        await sendEmail({ to: app.email, subject: email.subject, html: email.html, tag: 'seller_rejected' })
      } catch {}
    })()
  }

  return NextResponse.json({
    success: true,
    application: updated,
    ...(sellerWarning ? { warning: sellerWarning } : {}),
    ...(sellerCreated ? { seller_created: true }   : {}),
  })
}
