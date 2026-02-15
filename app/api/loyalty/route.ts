import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Get user's loyalty card
    const { data: loyaltyCard, error: cardError } = await supabase
      .from('loyalty_cards')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (cardError && cardError.code !== 'PGRST116') {
      console.error('Loyalty card error:', cardError)
    }

    // If no card exists, create one
    if (!loyaltyCard) {
      const { data: newCard, error: createError } = await supabase
        .from('loyalty_cards')
        .insert([{
          user_id: userId,
          points_balance: 0,
          lifetime_points: 0,
          tier: 'bronze',
          tier_start_date: new Date().toISOString()
        }])
        .select()
        .single()

      if (createError) {
        console.error('Create loyalty card error:', createError)
        return NextResponse.json({ error: 'Failed to create loyalty card' }, { status: 500 })
      }

      return NextResponse.json({
        total_points: 0,
        available_points: 0,
        lifetime_points: 0,
        tier: 'bronze',
        next_tier: 'silver',
        points_to_next_tier: 1000
      })
    }

    // Get total points from loyalty_points table
    const { data: pointsData } = await supabase
      .from('loyalty_points')
      .select('points')
      .eq('user_id', userId)
      .eq('status', 'active')

    const totalPoints = pointsData?.reduce((sum, p) => sum + p.points, 0) || 0

    // Determine tier and next tier
    const tiers = [
      { name: 'bronze', minPoints: 0 },
      { name: 'silver', minPoints: 1000 },
      { name: 'gold', minPoints: 3000 },
      { name: 'platinum', minPoints: 5000 }
    ]

    let currentTier = 'bronze'
    let nextTier = 'silver'
    let pointsToNextTier = 1000

    for (let i = 0; i < tiers.length; i++) {
      if (loyaltyCard.lifetime_points >= tiers[i].minPoints) {
        currentTier = tiers[i].name
        if (i < tiers.length - 1) {
          nextTier = tiers[i + 1].name
          pointsToNextTier = tiers[i + 1].minPoints - loyaltyCard.lifetime_points
        } else {
          nextTier = 'platinum'
          pointsToNextTier = 0
        }
      }
    }

    // Update tier if changed
    if (currentTier !== loyaltyCard.tier) {
      await supabase
        .from('loyalty_cards')
        .update({
          tier: currentTier,
          tier_start_date: new Date().toISOString()
        })
        .eq('user_id', userId)
    }

    return NextResponse.json({
      total_points: totalPoints,
      available_points: loyaltyCard.points_balance,
      lifetime_points: loyaltyCard.lifetime_points,
      tier: currentTier,
      next_tier: nextTier,
      points_to_next_tier: pointsToNextTier
    })

  } catch (error) {
    console.error('Loyalty API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
