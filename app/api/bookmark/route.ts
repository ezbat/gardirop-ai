import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Anmeldung erforderlich' }, { status: 401 })
    }

    const { postId, action } = await request.json()

    if (!postId) {
      return NextResponse.json({ error: 'Post ID required' }, { status: 400 })
    }

    if (action === 'add') {
      const { error } = await supabaseAdmin
        .from('bookmarks')
        .insert({ user_id: session.user.id, post_id: postId })

      if (error && error.code !== '23505') throw error

      return NextResponse.json({ success: true, bookmarked: true })
    } else if (action === 'remove') {
      const { error } = await supabaseAdmin
        .from('bookmarks')
        .delete()
        .eq('user_id', session.user.id)
        .eq('post_id', postId)

      if (error) throw error

      return NextResponse.json({ success: true, bookmarked: false })
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Bookmark API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
