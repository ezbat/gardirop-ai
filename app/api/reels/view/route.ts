import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { extractRequestContext } from '@/lib/request-context'

export async function POST(request: NextRequest) {
  try {
    const { postId } = await request.json()

    if (!postId) {
      return NextResponse.json({ error: 'postId required' }, { status: 400 })
    }

    const userId = request.headers.get('x-user-id') || null
    const { ip } = extractRequestContext(request)

    const { data, error } = await supabaseAdmin.rpc('record_reel_view', {
      p_post_id: postId,
      p_viewer_id: userId,
      p_viewer_ip: userId ? null : (ip !== 'unknown' ? ip : null),
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
