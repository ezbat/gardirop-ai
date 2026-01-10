import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { requesterId, requestedId, action } = await request.json()
    
    console.log('📥 Follow Request API:', { requesterId, requestedId, action })
    
    if (!requesterId || !requestedId) {
      return NextResponse.json({ error: 'User IDs required' }, { status: 400 })
    }
    
    if (requesterId === requestedId) {
      return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 })
    }

    // Check if requested user has private account
    const { data: requestedUser, error: userError } = await supabase.from('users').select('is_private').eq('id', requestedId).single()
    
    if (userError) {
      console.error('❌ User fetch error:', userError)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    console.log('👤 Requested user:', requestedUser)
    
    if (action === 'send') {
      const isPrivate = requestedUser?.is_private || false
      console.log('🔒 Is private:', isPrivate)
      
      // If account is private, send follow request
      if (isPrivate) {
        const { error } = await supabase.from('follow_requests').insert({ requester_id: requesterId, requested_id: requestedId, status: 'pending' })
        if (error) {
          if (error.code === '23505') {
            console.log('ℹ️ Request already exists')
            return NextResponse.json({ success: true, requestSent: true })
          }
          console.error('❌ Insert request error:', error)
          throw error
        }
        console.log('✅ Request sent')
        return NextResponse.json({ success: true, requestSent: true })
      } else {
        // If account is public, follow directly
        const { error } = await supabase.from('follows').insert({ follower_id: requesterId, following_id: requestedId })
        if (error) {
          if (error.code === '23505') {
            console.log('ℹ️ Already following')
            return NextResponse.json({ success: true, following: true })
          }
          console.error('❌ Insert follow error:', error)
          throw error
        }
        console.log('✅ Following')
        return NextResponse.json({ success: true, following: true })
      }
    } else if (action === 'approve') {
      // Approve request and add to follows
      const { error: followError } = await supabase.from('follows').insert({ follower_id: requesterId, following_id: requestedId })
      if (followError && followError.code !== '23505') {
        console.error('❌ Approve follow error:', followError)
        throw followError
      }
      await supabase.from('follow_requests').delete().eq('requester_id', requesterId).eq('requested_id', requestedId)
      console.log('✅ Request approved')
      return NextResponse.json({ success: true, approved: true })
    } else if (action === 'reject') {
      // Reject request
      await supabase.from('follow_requests').delete().eq('requester_id', requesterId).eq('requested_id', requestedId)
      console.log('✅ Request rejected')
      return NextResponse.json({ success: true, rejected: true })
    } else if (action === 'cancel') {
      // Cancel pending request
      await supabase.from('follow_requests').delete().eq('requester_id', requesterId).eq('requested_id', requestedId)
      console.log('✅ Request cancelled')
      return NextResponse.json({ success: true, cancelled: true })
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('❌ Follow request API error:', error)
    return NextResponse.json({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}