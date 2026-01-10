import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { blockerId, blockedId, action } = await request.json()
    if (!blockerId || !blockedId) return NextResponse.json({ error: 'User IDs required' }, { status: 400 })
    if (blockerId === blockedId) return NextResponse.json({ error: 'Cannot block yourself' }, { status: 400 })
    if (action === 'block') {
      const { error } = await supabase.from('blocked_users').insert({ blocker_id: blockerId, blocked_id: blockedId })
      if (error && error.code !== '23505') throw error
      await supabase.from('follows').delete().eq('follower_id', blockerId).eq('following_id', blockedId)
      await supabase.from('follows').delete().eq('follower_id', blockedId).eq('following_id', blockerId)
      return NextResponse.json({ success: true, blocked: true })
    } else if (action === 'unblock') {
      const { error } = await supabase.from('blocked_users').delete().eq('blocker_id', blockerId).eq('blocked_id', blockedId)
      if (error) throw error
      return NextResponse.json({ success: true, blocked: false })
    }
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Blocked users API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}