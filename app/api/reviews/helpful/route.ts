import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// POST - Toggle helpful vote
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { reviewId, userId } = body

    if (!reviewId || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check if already voted
    const { data: existingVote } = await supabase
      .from('review_helpful_votes')
      .select('id')
      .eq('review_id', reviewId)
      .eq('user_id', userId)
      .single()

    if (existingVote) {
      // Remove vote
      const { error } = await supabase
        .from('review_helpful_votes')
        .delete()
        .eq('id', existingVote.id)

      if (error) {
        console.error('Remove vote error:', error)
        return NextResponse.json({ error: 'Failed to remove vote' }, { status: 500 })
      }

      return NextResponse.json({ voted: false })
    } else {
      // Add vote
      const { error } = await supabase
        .from('review_helpful_votes')
        .insert({
          review_id: reviewId,
          user_id: userId
        })

      if (error) {
        console.error('Add vote error:', error)
        return NextResponse.json({ error: 'Failed to add vote' }, { status: 500 })
      }

      return NextResponse.json({ voted: true })
    }

  } catch (error) {
    console.error('Helpful vote error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET - Check if user voted
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const reviewId = searchParams.get('reviewId')
    const userId = searchParams.get('userId')

    if (!reviewId || !userId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    const { data: vote } = await supabase
      .from('review_helpful_votes')
      .select('id')
      .eq('review_id', reviewId)
      .eq('user_id', userId)
      .single()

    return NextResponse.json({ voted: !!vote })

  } catch (error) {
    console.error('Check vote error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
