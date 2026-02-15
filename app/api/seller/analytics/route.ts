import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get seller info
    const { data: seller } = await supabase
      .from('sellers')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (!seller) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 })
    }

    const sellerId = seller.id

    // Fetch all analytics data in parallel
    const [
      { count: totalProducts },
      { count: activeProducts },
      { count: pendingProducts },
      { data: products },
      { count: totalOutfits },
      { data: orderItems },
      { data: recentOrders },
    ] = await Promise.all([
      supabase.from('products').select('*', { count: 'exact', head: true }).eq('seller_id', sellerId),
      supabase.from('products').select('*', { count: 'exact', head: true }).eq('seller_id', sellerId).eq('moderation_status', 'approved'),
      supabase.from('products').select('*', { count: 'exact', head: true }).eq('seller_id', sellerId).eq('moderation_status', 'pending'),
      supabase.from('products').select('id, title, stock_quantity, price').eq('seller_id', sellerId),
      supabase.from('outfits').select('*', { count: 'exact', head: true }).eq('seller_id', sellerId),
      supabase
        .from('order_items')
        .select('product_id, quantity, price, product:products!inner(seller_id), order:orders!inner(payment_status, created_at, total_amount)')
        .eq('product.seller_id', sellerId),
      supabase
        .from('order_items')
        .select(`
          *,
          product:products!inner(id, title, images, seller_id),
          order:orders!inner(id, created_at, payment_status, total_amount, user:users(email, name))
        `)
        .eq('product.seller_id', sellerId)
        .order('created_at', { ascending: false })
        .limit(10),
    ])

    // Calculate revenue from ALL orders (paid and pending)
    const totalRevenue = (orderItems || [])
      .reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0)

    const totalSales = (orderItems || [])
      .reduce((sum: number, item: any) => sum + item.quantity, 0)

    // Calculate daily revenue for last 7 days
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (6 - i))
      return date.toISOString().split('T')[0]
    })

    const dailyStats = last7Days.map(date => {
      const dayItems = (orderItems || []).filter((item: any) =>
        item.order?.created_at?.startsWith(date)
      )
      const dayRevenue = dayItems.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0)
      const daySales = dayItems.reduce((sum: number, item: any) => sum + item.quantity, 0)

      return {
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue: Math.round(dayRevenue),
        sales: daySales,
      }
    })

    // Top selling products (from ALL orders)
    const productSales = new Map<string, { id: string; title: string; quantity: number; revenue: number }>()

    ;(orderItems || [])
      .forEach((item: any) => {
        const productId = item.product_id
        const product = products?.find((p: any) => p.id === productId)

        if (product) {
          if (productSales.has(productId)) {
            const existing = productSales.get(productId)!
            existing.quantity += item.quantity
            existing.revenue += item.price * item.quantity
          } else {
            productSales.set(productId, {
              id: productId,
              title: product.title,
              quantity: item.quantity,
              revenue: item.price * item.quantity,
            })
          }
        }
      })

    const topProducts = Array.from(productSales.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5)

    // Low stock products
    const lowStockProducts = (products || [])
      .filter((p: any) => p.stock_quantity < 5)
      .sort((a: any, b: any) => a.stock_quantity - b.stock_quantity)
      .slice(0, 5)

    const analytics = {
      summary: {
        totalProducts: totalProducts || 0,
        activeProducts: activeProducts || 0,
        pendingProducts: pendingProducts || 0,
        totalOutfits: totalOutfits || 0,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalSales: totalSales || 0,
      },
      dailyStats,
      topProducts,
      lowStockProducts,
      recentOrders: recentOrders || [],
    }

    return NextResponse.json({ analytics })
  } catch (error) {
    console.error('Seller analytics error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
