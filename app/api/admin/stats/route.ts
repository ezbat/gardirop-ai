import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/admin-auth'

// GET: Fetch admin dashboard statistics
export async function GET(request: NextRequest) {
  try {
    const auth = requireAdmin(request)
    if (auth.error) return auth.error

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
      supabaseAdmin.from('users').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('sellers').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('sellers').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabaseAdmin.from('sellers').select('*', { count: 'exact', head: true }).in('status', ['active', 'approved']),
      supabaseAdmin.from('sellers').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
      supabaseAdmin.from('products').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('products').select('*', { count: 'exact', head: true }).eq('moderation_status', 'pending'),
      supabaseAdmin.from('products').select('*', { count: 'exact', head: true }).eq('moderation_status', 'approved'),
      supabaseAdmin.from('products').select('*', { count: 'exact', head: true }).eq('moderation_status', 'rejected'),
      supabaseAdmin.from('outfits').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('outfits').select('*', { count: 'exact', head: true }).eq('moderation_status', 'pending'),
      supabaseAdmin.from('outfits').select('*', { count: 'exact', head: true }).eq('moderation_status', 'approved'),
      supabaseAdmin.from('outfits').select('*', { count: 'exact', head: true }).eq('moderation_status', 'rejected'),
      supabaseAdmin.from('orders').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('orders').select('*, user:users(email, name)').order('created_at', { ascending: false }).limit(10),
      supabaseAdmin.from('orders').select('total_amount, created_at, payment_status').order('created_at', { ascending: false }).limit(100),
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
