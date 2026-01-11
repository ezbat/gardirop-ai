import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    const { data: followingData } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId)
    
    const followingIds = (followingData || []).map(f => f.following_id)
    followingIds.push(userId)
    
    const { data: pollsData, error: pollsError } = await supabase
      .from('outfit_polls')
      .select('*')
      .in('user_id', followingIds)
      .eq('is_active', true)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
    
    if (pollsError) throw pollsError

    const pollIds = pollsData?.map(p => p.id) || []
    const userIds = [...new Set(pollsData?.map(p => p.user_id) || [])]

    const { data: optionsData } = await supabase
      .from('poll_options')
      .select('*')
      .in('poll_id', pollIds)
      .order('created_at', { ascending: true })

    const { data: votesData } = await supabase
      .from('poll_votes')
      .select('poll_id, option_id, user_id')
      .in('poll_id', pollIds)

    const { data: commentsData } = await supabase
      .from('poll_comments')
      .select('*')
      .in('poll_id', pollIds)
      .order('created_at', { ascending: false })

    const { data: usersData } = await supabase
      .from('users')
      .select('id, name, username, avatar_url')
      .in('id', userIds)

    const polls = pollsData?.map(poll => {
      const options = optionsData?.filter(o => o.poll_id === poll.id) || []
      const votes = votesData?.filter(v => v.poll_id === poll.id) || []
      const comments = commentsData?.filter(c => c.poll_id === poll.id) || []
      const user = usersData?.find(u => u.id === poll.user_id)
      const userVote = votes.find(v => v.user_id === userId)
      
      return {
        ...poll,
        user,
        options,
        totalVotes: votes.length,
        userVotedOptionId: userVote?.option_id || null,
        comments: comments.map(c => ({
          ...c,
          user: usersData?.find(u => u.id === c.user_id)
        }))
      }
    }) || []
    
    return NextResponse.json({ success: true, polls })
  } catch (error) {
    console.error('Poll list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}