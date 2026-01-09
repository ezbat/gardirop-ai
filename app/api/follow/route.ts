import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { followerId, followingId, action } = await request.json()

    if (!followerId || !followingId) {
      return NextResponse.json({ error: 'User IDs required' }, { status: 400 })
    }

    if (followerId === followingId) {
      return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 })
    }

    if (action === 'follow') {
      const { error } = await supabase.from('follows').insert({ follower_id: followerId, following_id: followingId })
      if (error) {
        if (error.code === '23505') {
          return NextResponse.json({ success: true, following: true })
        }
        throw error
      }
      return NextResponse.json({ success: true, following: true })
    } else if (action === 'unfollow') {
      const { error } = await supabase.from('follows').delete().eq('follower_id', followerId).eq('following_id', followingId)
      if (error) throw error
      return NextResponse.json({ success: true, following: false })
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Follow API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}