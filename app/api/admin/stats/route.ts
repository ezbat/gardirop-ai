import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET: Fetch admin dashboard statistics
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Admin check (simplified for m3000)
    if (userId !== 'm3000') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    // Fetch all statistics in parallel
    const [
      { count: totalUsers },
      { count: totalSellers },
      { count: pendingSellers },
      { count: approvedSellers },
      { count: rejectedSellers },
      { count: totalProducts },
      { count: pendingProducts },
      { count: approvedProducts },
      { count: rejectedProducts },
      { count: totalOutfits },
      { count: pendingOutfits },
      { count: approvedOutfits },
      { count: rejectedOutfits },
      { count: totalOrders },
      { data: recentOrders },
      { data: allOrders },
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('sellers').select('*', { count: 'exact', head: true }),
      supabase.from('sellers').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('sellers').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
      supabase.from('sellers').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
      supabase.from('products').select('*', { count: 'exact', head: true }),
      supabase.from('products').select('*', { count: 'exact', head: true }).eq('moderation_status', 'pending'),
      supabase.from('products').select('*', { count: 'exact', head: true }).eq('moderation_status', 'approved'),
      supabase.from('products').select('*', { count: 'exact', head: true }).eq('moderation_status', 'rejected'),
      supabase.from('outfits').select('*', { count: 'exact', head: true }),
      supabase.from('outfits').select('*', { count: 'exact', head: true }).eq('moderation_status', 'pending'),
      supabase.from('outfits').select('*', { count: 'exact', head: true }).eq('moderation_status', 'approved'),
      supabase.from('outfits').select('*', { count: 'exact', head: true }).eq('moderation_status', 'rejected'),
      supabase.from('orders').select('*', { count: 'exact', head: true }),
      supabase.from('orders').select('*, user:users(email, full_name)').order('created_at', { ascending: false }).limit(10),
      supabase.from('orders').select('total_amount, created_at, payment_status').order('created_at', { ascending: false }).limit(100),
    ])

    // Calculate total revenue from paid orders
    const totalRevenue = (allOrders || [])
      .filter(order => order.payment_status === 'paid')
      .reduce((sum, order) => sum + (order.total_amount || 0), 0)

    // Generate daily stats for last 7 days
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (6 - i))
      return date.toISOString().split('T')[0]
    })

    const dailyStats = last7Days.map(date => {
      const dayOrders = (allOrders || []).filter(o =>
        o.created_at?.startsWith(date)
      )
      const dayRevenue = dayOrders
        .filter(o => o.payment_status === 'paid')
        .reduce((sum, o) => sum + (o.total_amount || 0), 0)

      return {
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        users: 0, // Would need to track user creation dates
        orders: dayOrders.length,
        revenue: Math.round(dayRevenue),
      }
    })

    const stats = {
      users: {
        total: totalUsers || 0,
      },
      sellers: {
        total: totalSellers || 0,
        pending: pendingSellers || 0,
        approved: approvedSellers || 0,
        rejected: rejectedSellers || 0,
      },
      products: {
        total: totalProducts || 0,
        pending: pendingProducts || 0,
        approved: approvedProducts || 0,
        rejected: rejectedProducts || 0,
      },
      outfits: {
        total: totalOutfits || 0,
        pending: pendingOutfits || 0,
        approved: approvedOutfits || 0,
        rejected: rejectedOutfits || 0,
      },
      orders: {
        total: totalOrders || 0,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        recent: recentOrders || [],
      },
      dailyStats,
    }

    return NextResponse.json({ stats })
  } catch (error) {
    console.error('Stats API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
