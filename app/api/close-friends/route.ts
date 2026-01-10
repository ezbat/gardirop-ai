import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { userId, friendId, action } = await request.json()
    if (!userId || !friendId) return NextResponse.json({ error: 'User IDs required' }, { status: 400 })
    if (userId === friendId) return NextResponse.json({ error: 'Cannot add yourself' }, { status: 400 })
    if (action === 'add') {
      const { error } = await supabase.from('close_friends').insert({ user_id: userId, friend_id: friendId })
      if (error && error.code !== '23505') throw error
      return NextResponse.json({ success: true, added: true })
    } else if (action === 'remove') {
      const { error } = await supabase.from('close_friends').delete().eq('user_id', userId).eq('friend_id', friendId)
      if (error) throw error
      return NextResponse.json({ success: true, added: false })
    }
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Close friends API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}