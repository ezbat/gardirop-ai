import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { userId, postId, action } = await request.json()

    if (!userId || !postId) {
      return NextResponse.json(
        { error: 'User ID and Post ID required' },
        { status: 400 }
      )
    }

    if (action === 'add') {
      // Bookmark ekle
      const { error } = await supabase
        .from('bookmarks')
        .insert({ user_id: userId, post_id: postId })

      if (error) {
        // Zaten varsa ignore et
        if (error.code === '23505') {
          return NextResponse.json({ success: true, bookmarked: true })
        }
        throw error
      }

      return NextResponse.json({ success: true, bookmarked: true })
    } else if (action === 'remove') {
      // Bookmark kaldır
      const { error } = await supabase
        .from('bookmarks')
        .delete()
        .eq('user_id', userId)
        .eq('post_id', postId)

      if (error) throw error

      return NextResponse.json({ success: true, bookmarked: false })
    } else {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Bookmark API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}