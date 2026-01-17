import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { adminId, status } = await request.json()
    
    if (!adminId) {
      return NextResponse.json({ error: 'Admin ID required' }, { status: 400 })
    }

    // TODO: Check if user is admin (şimdilik skip, sonra role system ekleriz)

    let query = supabase
      .from('seller_applications')
      .select('*')
      .order('applied_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data: applications, error } = await query

    if (error) throw error

    // Get user details for each application
    const userIds = [...new Set(applications?.map(a => a.user_id) || [])]
    const { data: usersData } = await supabase
      .from('users')
      .select('id, name, email, avatar_url')
      .in('id', userIds)

    const applicationsWithUsers = applications?.map(app => ({
      ...app,
      user: usersData?.find(u => u.id === app.user_id)
    })) || []

    return NextResponse.json({ success: true, applications: applicationsWithUsers })
  } catch (error) {
    console.error('List applications error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}