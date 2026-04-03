import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabaseAdmin } from '@/lib/supabase-admin'

// POST - Toggle helpful vote (session-authenticated)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Anmeldung erforderlich' }, { status: 401 })
    }

    const { reviewId } = await req.json()

    if (!reviewId) {
      return NextResponse.json({ error: 'Review ID required' }, { status: 400 })
    }

    // Check if already voted
    const { data: existingVote } = await supabaseAdmin
      .from('review_helpful_votes')
      .select('id')
      .eq('review_id', reviewId)
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (existingVote) {
      const { error } = await supabaseAdmin
        .from('review_helpful_votes')
        .delete()
        .eq('id', existingVote.id)

      if (error) {
        console.error('Remove vote error:', error)
        return NextResponse.json({ error: 'Failed to remove vote' }, { status: 500 })
      }

      return NextResponse.json({ voted: false })
    } else {
      const { error } = await supabaseAdmin
        .from('review_helpful_votes')
        .insert({ review_id: reviewId, user_id: session.user.id })

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

// GET - Check if user voted (guest-safe: returns false)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ voted: false })
    }

    const { searchParams } = new URL(req.url)
    const reviewId = searchParams.get('reviewId')

    if (!reviewId) {
      return NextResponse.json({ error: 'Review ID required' }, { status: 400 })
    }

    const { data: vote } = await supabaseAdmin
      .from('review_helpful_votes')
      .select('id')
      .eq('review_id', reviewId)
      .eq('user_id', session.user.id)
      .maybeSingle()

    return NextResponse.json({ voted: !!vote })
  } catch (error) {
    console.error('Check vote error:', error)
    return NextResponse.json({ voted: false })
  }
}
