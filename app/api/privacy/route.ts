import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { userId, isPrivate } = await request.json()
    if (!userId) return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    const { error } = await supabase.from('users').update({ is_private: isPrivate }).eq('id', userId)
    if (error) throw error
    return NextResponse.json({ success: true, isPrivate })
  } catch (error) {
    console.error('Privacy API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}