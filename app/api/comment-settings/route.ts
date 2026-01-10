import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { userId, setting } = await request.json()
    if (!userId || !setting) return NextResponse.json({ error: 'User ID and setting required' }, { status: 400 })
    const validSettings = ['everyone', 'followers', 'no_one']
    if (!validSettings.includes(setting)) return NextResponse.json({ error: 'Invalid setting' }, { status: 400 })
    const { error } = await supabase.from('users').update({ comment_settings: setting }).eq('id', userId)
    if (error) throw error
    return NextResponse.json({ success: true, setting })
  } catch (error) {
    console.error('Comment settings API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}