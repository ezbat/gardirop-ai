import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { deductStockForOrder, restoreStockForOrder } from '@/lib/inventory'
import { MWST_STANDARD, MWST_ERMAESSIGT } from '@/lib/tax-invoice'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const body = await request.json()
    const { items, shippingInfo, paymentMethod, totalAmount, shippingCost } = body

    // Validation
    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
    }

    if (!shippingInfo || !shippingInfo.fullName || !shippingInfo.phone || !shippingInfo.address) {
      return NextResponse.json({ error: 'Shipping info incomplete' }, { status: 400 })
    }

    // Verify all products exist and have sufficient stock BEFORE creating order
    const insufficientStock = []
    for (const item of items) {
      const { data: product } = await supabaseAdmin
        .from('products')
        .select('id, title, stock_quantity, price, seller_id')
        .eq('id', item.productId)
        .single()

      if (!product) {
        return NextResponse.json(
          { error: `Product ${item.productId} not found` },
          { status: 400 }
        )
      }

      if ((product.stock_quantity || 0) < item.quantity) {
        insufficientStock.push({
          productId: item.productId,
          title: product.title,
          available: product.stock_quantity || 0,
          requested: item.quantity,
        })
      }
    }

    if (insufficientStock.length > 0) {
      return NextResponse.json(
        {
          error: 'Insufficient stock',
          code: 'INSUFFICIENT_STOCK',
          products: insufficientStock,
        },
        { status: 400 }
      )
    }

    // Calculate platform fee and seller earnings
    // Get seller for the first item (assumes single-seller orders for now)
    const { data: firstProduct } = await supabaseAdmin
      .from('products')
      .select('seller_id')
      .eq('id', items[0].productId)
      .single()

    let platformFee = 0
    let sellerEarnings = 0
    let commissionRate = 15

    if (firstProduct?.seller_id) {
      const { data: seller } = await supabaseAdmin
        .from('sellers')
        .select('commission_rate')
        .eq('id', firstProduct.seller_id)
        .single()

      commissionRate = parseFloat(seller?.commission_rate || '15')
      platformFee = Math.round(totalAmount * commissionRate) / 100
      sellerEarnings = totalAmount - platformFee
    }

    // Create order with financial fields
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        user_id: userId,
        seller_id: firstProduct?.seller_id || null,
        shipping_info: shippingInfo,
        payment_method: paymentMethod,
        total_amount: totalAmount,
        shipping_cost: shippingCost,
        platform_fee: platformFee,
        seller_earnings: sellerEarnings,
        tax_amount: Math.round(totalAmount * MWST_STANDARD / 100 * 100) / 100, // Dynamic MwSt from tax-invoice constants
        status: 'pending',
        payment_status: 'pending',
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (orderError) {
      console.error('Order creation error:', orderError)
      throw orderError
    }

    // Create order items
    const orderItems = items.map((item: any) => ({
      order_id: order.id,
      product_id: item.productId,
      quantity: item.quantity,
      selected_size: item.selectedSize || null,
      price: item.price,
    }))

    const { error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(orderItems)

    if (itemsError) {
      console.error('Order items error:', itemsError)
      // Rollback order
      await supabaseAdmin.from('orders').delete().eq('id', order.id)
      throw itemsError
    }

    // Deduct stock using inventory system (records movements)
    const stockResult = await deductStockForOrder(
      order.id,
      items.map((item: any) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
      userId
    )

    if (!stockResult.success) {
      // Some items failed stock deduction - rollback everything
      console.error('Stock deduction failed:', stockResult.results)

      // Restore any stock that was already deducted
      const successfulDeductions = stockResult.results
        .filter(r => r.success)
        .map(r => ({
          productId: r.productId,
          quantity: items.find((i: any) => i.productId === r.productId)?.quantity || 0,
        }))

      if (successfulDeductions.length > 0) {
        await restoreStockForOrder(order.id, successfulDeductions, 'cancellation', userId)
      }

      // Delete order items and order
      await supabaseAdmin.from('order_items').delete().eq('order_id', order.id)
      await supabaseAdmin.from('orders').delete().eq('id', order.id)

      const failedProducts = stockResult.results
        .filter(r => !r.success)
        .map(r => r.error)

      return NextResponse.json(
        {
          error: 'Stock deduction failed',
          code: 'STOCK_DEDUCTION_FAILED',
          details: failedProducts,
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        status: order.status,
        total_amount: order.total_amount,
        platform_fee: platformFee,
        seller_earnings: sellerEarnings,
        created_at: order.created_at,
      },
    }, { status: 201 })

  } catch (error: any) {
    console.error('Order create API error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error?.message || 'Unknown error',
    }, { status: 500 })
  }
}
