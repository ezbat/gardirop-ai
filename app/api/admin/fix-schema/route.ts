import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'

/**
 * POST /api/admin/fix-schema
 *
 * Fixes the notifications table schema by adding missing columns.
 * Uses Supabase's PostgREST pg_net extension or direct SQL endpoint.
 */
export async function POST(req: NextRequest) {
  const auth = requireAdmin(req)
  if (auth.error) return auth.error
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Missing Supabase credentials' }, { status: 500 })
  }

  const sql = `
    ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS message TEXT DEFAULT '';
    ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS title TEXT DEFAULT '';
    ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS body TEXT DEFAULT '';
    ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS recipient_type TEXT DEFAULT 'customer';
    ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS admin_scope BOOLEAN DEFAULT FALSE;
    ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS link TEXT;
    ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;
    ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
    ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
  `

  try {
    // Method 1: Supabase SQL API (available on all plans)
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ sql }),
    })

    if (res.ok) {
      return NextResponse.json({ success: true, method: 'rpc' })
    }

    // Method 2: Direct pg endpoint (Supabase exposes this)
    const pgRes = await fetch(`${supabaseUrl}/pg`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ query: sql }),
    })

    if (pgRes.ok) {
      return NextResponse.json({ success: true, method: 'pg' })
    }

    return NextResponse.json({
      success: false,
      error: 'Automated fix failed. Please run this SQL manually in Supabase SQL Editor:',
      sql: sql.trim(),
    }, { status: 422 })
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err?.message,
      sql: sql.trim(),
    }, { status: 500 })
  }
}
