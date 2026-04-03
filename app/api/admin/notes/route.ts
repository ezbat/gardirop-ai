/**
 * GET  /api/admin/notes?resource_type=X&resource_id=Y  — list notes for a resource
 * POST /api/admin/notes                                 — create a note
 *
 * Auth: x-admin-token header (timing-safe compare against ADMIN_TOKEN env var)
 * Notes are internal-only and never exposed to sellers/customers.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin }             from '@/lib/supabase-admin'
import { requireAdmin }              from '@/lib/admin-auth'

// ─── GET — list notes ─────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const auth = requireAdmin(req)
  if (auth.error) return auth.error

  const { searchParams } = req.nextUrl
  const resource_type = searchParams.get('resource_type')
  const resource_id   = searchParams.get('resource_id')

  if (!resource_type || !resource_id) {
    return NextResponse.json(
      { success: false, error: 'resource_type and resource_id are required' },
      { status: 400 },
    )
  }

  const { data, error } = await supabaseAdmin
    .from('admin_notes')
    .select('id, created_at, admin_actor, note')
    .eq('resource_type', resource_type)
    .eq('resource_id', resource_id)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    if (error.code !== '42P01') console.warn('[api/admin/notes GET]', error.message)
    return NextResponse.json({ success: true, notes: [] })
  }

  return NextResponse.json({ success: true, notes: data ?? [] })
}

// ─── POST — create note ───────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = requireAdmin(req)
  if (auth.error) return auth.error

  const body = await req.json().catch(() => ({}))
  const { resource_type, resource_id, note, admin_actor } = body as {
    resource_type?: string
    resource_id?:   string
    note?:          string
    admin_actor?:   string
  }

  const VALID_TYPES = ['seller', 'product', 'order', 'payout']

  if (!resource_type || !VALID_TYPES.includes(resource_type)) {
    return NextResponse.json(
      { success: false, error: `resource_type must be one of: ${VALID_TYPES.join(', ')}` },
      { status: 400 },
    )
  }
  if (!resource_id?.trim()) {
    return NextResponse.json({ success: false, error: 'resource_id is required' }, { status: 400 })
  }
  if (!note?.trim()) {
    return NextResponse.json({ success: false, error: 'note cannot be empty' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('admin_notes')
    .insert({
      resource_type,
      resource_id:  resource_id.trim(),
      note:         note.trim(),
      admin_actor:  admin_actor?.trim() || null,
      visibility:   'internal',
    })
    .select('id, created_at, admin_actor, note')
    .single()

  if (error) {
    console.error('[api/admin/notes POST]', error.message)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, note: data }, { status: 201 })
}
