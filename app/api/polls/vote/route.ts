import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { pollId, optionId, userId } = await request.json()
    
    if (!pollId || !optionId || !userId) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 })
    }

    const { data: existingVote } = await supabase
      .from('poll_votes')
      .select('id, option_id')
      .eq('poll_id', pollId)
      .eq('user_id', userId)
      .single()

    if (existingVote) {
      if (existingVote.option_id === optionId) {
        return NextResponse.json({ success: true, message: 'Already voted' })
      }
      
      const { data: oldOption } = await supabase
        .from('poll_options')
        .select('vote_count')
        .eq('id', existingVote.option_id)
        .single()
      
      if (oldOption) {
        await supabase
          .from('poll_options')
          .update({ vote_count: Math.max(0, oldOption.vote_count - 1) })
          .eq('id', existingVote.option_id)
      }
      
      const { data: newOption } = await supabase
        .from('poll_options')
        .select('vote_count')
        .eq('id', optionId)
        .single()
      
      if (newOption) {
        await supabase
          .from('poll_options')
          .update({ vote_count: newOption.vote_count + 1 })
          .eq('id', optionId)
      }
      
      await supabase
        .from('poll_votes')
        .update({ option_id: optionId })
        .eq('id', existingVote.id)
    } else {
      await supabase
        .from('poll_votes')
        .insert({ poll_id: pollId, option_id: optionId, user_id: userId })
      
      const { data: option } = await supabase
        .from('poll_options')
        .select('vote_count')
        .eq('id', optionId)
        .single()
      
      if (option) {
        await supabase
          .from('poll_options')
          .update({ vote_count: option.vote_count + 1 })
          .eq('id', optionId)
      }
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Vote error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}