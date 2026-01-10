import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { userId, favoriteUserId, action } = await request.json()
    if (!userId || !favoriteUserId) return NextResponse.json({ error: 'User IDs required' }, { status: 400 })
    if (userId === favoriteUserId) return NextResponse.json({ error: 'Cannot favorite yourself' }, { status: 400 })
    if (action === 'add') {
      const { error } = await supabase.from('favorites').insert({ user_id: userId, favorite_user_id: favoriteUserId })
      if (error && error.code !== '23505') throw error
      return NextResponse.json({ success: true, favorited: true })
    } else if (action === 'remove') {
      const { error } = await supabase.from('favorites').delete().eq('user_id', userId).eq('favorite_user_id', favoriteUserId)
      if (error) throw error
      return NextResponse.json({ success: true, favorited: false })
    }
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Favorites API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}