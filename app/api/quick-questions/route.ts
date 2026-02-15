import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET: Fetch all active quick questions
export async function GET(request: NextRequest) {
  try {
    const { data: questions, error } = await supabase
      .from('quick_questions')
      .select('*')
      .eq('is_active', true)
      .order('order_index', { ascending: true })

    if (error) throw error

    return NextResponse.json({ questions: questions || [] })
  } catch (error) {
    console.error('Get quick questions error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
