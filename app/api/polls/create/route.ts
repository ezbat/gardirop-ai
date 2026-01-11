import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { userId, title, description, options } = await request.json()
    
    if (!userId || !title || !options || options.length < 2) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }

    if (options.length > 4) {
      return NextResponse.json({ error: 'Maximum 4 options allowed' }, { status: 400 })
    }

    const { data: poll, error: pollError } = await supabase
      .from('outfit_polls')
      .insert({
        user_id: userId,
        title,
        description: description || null
      })
      .select()
      .single()
    
    if (pollError) throw pollError

    const optionsData = options.map((opt: any) => ({
      poll_id: poll.id,
      outfit_id: opt.outfitId || null,
      image_url: opt.imageUrl,
      caption: opt.caption || null
    }))

    const { error: optionsError } = await supabase
      .from('poll_options')
      .insert(optionsData)
    
    if (optionsError) throw optionsError
    
    return NextResponse.json({ success: true, poll })
  } catch (error) {
    console.error('Poll create error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}