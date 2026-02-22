import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabaseAdmin } from '@/lib/supabase-admin'
import {
  getInventorySummary,
  getLowStockAlerts,
  getMovementHistory,
  restockProduct,
  adjustStock,
  bulkStockUpdate,
  updateSKU,
  updateStockThreshold,
} from '@/lib/inventory'

/**
 * GET /api/seller/inventory
 *
 * Seller inventory overview.
 * Query params:
 *   - section: 'summary' | 'alerts' | 'movements' | 'products' | 'all'
 *   - productId: filter movements by product
 *   - type: filter movements by type
 *   - limit: pagination limit (default 50)
 *   - offset: pagination offset (default 0)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: seller } = await supabaseAdmin
      .from('sellers')
      .select('id, status')
      .eq('user_id', session.user.id)
      .single()

    if (!seller || seller.status !== 'approved') {
      return NextResponse.json({ error: 'Seller not found or not approved' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const section = searchParams.get('section') || 'all'
    const productId = searchParams.get('productId') || undefined
    const type = searchParams.get('type') as any || undefined
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const response: Record<string, any> = {}

    if (section === 'all' || section === 'summary') {
      response.summary = await getInventorySummary(seller.id)
    }

    if (section === 'all' || section === 'alerts') {
      response.alerts = await getLowStockAlerts(seller.id)
    }

    if (section === 'all' || section === 'movements') {
      response.movements = await getMovementHistory(seller.id, {
        productId,
        type,
        limit,
        offset,
      })
    }

    if (section === 'all' || section === 'products') {
      const { data: products } = await supabaseAdmin
        .from('products')
        .select('id, title, stock_quantity, low_stock_threshold, sku, price, category, images, moderation_status')
        .eq('seller_id', seller.id)
        .order('stock_quantity', { ascending: true })

      response.products = (products || []).map((p: any) => ({
        id: p.id,
        title: p.title,
        stock: p.stock_quantity || 0,
        threshold: p.low_stock_threshold || 5,
        sku: p.sku || null,
        price: parseFloat(p.price || '0'),
        category: p.category || 'Sonstige',
        image: p.images?.[0] || null,
        status: p.moderation_status,
        value: (p.stock_quantity || 0) * parseFloat(p.price || '0'),
      }))
    }

    return NextResponse.json({
      inventory: response,
      meta: {
        sellerId: seller.id,
        generatedAt: new Date().toISOString(),
      },
    })
  } catch (error: any) {
    console.error('Inventory API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/seller/inventory
 *
 * Inventory management actions.
 * Body:
 *   - action: 'restock' | 'adjust' | 'bulk_update' | 'update_sku' | 'update_threshold'
 *   - productId: string (required for restock, adjust, update_sku, update_threshold)
 *   - quantity: number (required for restock)
 *   - targetQuantity: number (required for adjust)
 *   - reason: string (optional notes)
 *   - sku: string (required for update_sku)
 *   - threshold: number (required for update_threshold)
 *   - updates: array (required for bulk_update)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: seller } = await supabaseAdmin
      .from('sellers')
      .select('id, status')
      .eq('user_id', session.user.id)
      .single()

    if (!seller || seller.status !== 'approved') {
      return NextResponse.json({ error: 'Seller not found or not approved' }, { status: 404 })
    }

    const body = await request.json()
    const { action, productId, quantity, targetQuantity, reason, sku, threshold, updates } = body

    // Verify product belongs to seller (when productId is provided)
    if (productId) {
      const { data: product } = await supabaseAdmin
        .from('products')
        .select('id')
        .eq('id', productId)
        .eq('seller_id', seller.id)
        .single()

      if (!product) {
        return NextResponse.json({ error: 'Product not found or access denied' }, { status: 404 })
      }
    }

    switch (action) {
      case 'restock': {
        if (!productId || !quantity || quantity <= 0) {
          return NextResponse.json({ error: 'productId and positive quantity required' }, { status: 400 })
        }
        const result = await restockProduct(productId, quantity, reason, session.user.id)
        return NextResponse.json({ result })
      }

      case 'adjust': {
        if (!productId || targetQuantity === undefined || targetQuantity < 0) {
          return NextResponse.json({ error: 'productId and non-negative targetQuantity required' }, { status: 400 })
        }
        const result = await adjustStock(productId, targetQuantity, reason || 'Manual adjustment', session.user.id)
        return NextResponse.json({ result })
      }

      case 'bulk_update': {
        if (!updates || !Array.isArray(updates) || updates.length === 0) {
          return NextResponse.json({ error: 'updates array required' }, { status: 400 })
        }
        // Verify all products belong to seller
        const productIds = updates.map((u: any) => u.productId)
        const { data: sellerProducts } = await supabaseAdmin
          .from('products')
          .select('id')
          .eq('seller_id', seller.id)
          .in('id', productIds)

        const validIds = new Set((sellerProducts || []).map(p => p.id))
        const validUpdates = updates.filter((u: any) => validIds.has(u.productId))

        if (validUpdates.length === 0) {
          return NextResponse.json({ error: 'No valid products found' }, { status: 400 })
        }

        const result = await bulkStockUpdate(validUpdates, session.user.id)
        return NextResponse.json({ result })
      }

      case 'update_sku': {
        if (!productId || !sku) {
          return NextResponse.json({ error: 'productId and sku required' }, { status: 400 })
        }
        const result = await updateSKU(productId, seller.id, sku)
        return NextResponse.json({ result })
      }

      case 'update_threshold': {
        if (!productId || threshold === undefined || threshold < 0) {
          return NextResponse.json({ error: 'productId and non-negative threshold required' }, { status: 400 })
        }
        const result = await updateStockThreshold(productId, seller.id, threshold)
        return NextResponse.json({ result })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Inventory POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message },
      { status: 500 }
    )
  }
}
