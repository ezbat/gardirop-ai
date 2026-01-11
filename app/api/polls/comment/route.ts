import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { pollId, userId, comment } = await request.json()
    
    if (!pollId || !userId || !comment) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 })
    }

    if (comment.trim().length === 0) {
      return NextResponse.json({ error: 'Comment cannot be empty' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('poll_comments')
      .insert({
        poll_id: pollId,
        user_id: userId,
        comment: comment.trim()
      })
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json({ success: true, comment: data })
  } catch (error) {
    console.error('Comment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}