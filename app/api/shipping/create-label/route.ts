import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { SendcloudAPI, convertToSendcloudAddress, estimatePackageWeight, getDefaultShippingMethod } from '@/lib/shipping/sendcloud'

/**
 * POST /api/shipping/create-label
 * Creates a shipping label via Sendcloud for a paid order
 *
 * Only sellers can create labels for their own orders
 */
export async function POST(request: NextRequest) {
  try {
    const { orderId } = await request.json()

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID required' }, { status: 400 })
    }

    // Get user session (verify seller)
    const authHeader = request.headers.get('authorization')
    const userId = request.headers.get('x-user-id')

    // Fetch order with items
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          product:products (
            id,
            title,
            seller_id
          )
        )
      `)
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Verify order is in PAID state
    if (order.state !== 'PAID') {
      return NextResponse.json(
        { error: `Order must be in PAID state (current: ${order.state})` },
        { status: 400 }
      )
    }

    // Verify seller owns at least one item in this order
    const { data: seller } = await supabase
      .from('sellers')
      .select('id, shop_name')
      .eq('user_id', userId)
      .single()

    if (!seller) {
      return NextResponse.json({ error: 'Not a seller' }, { status: 403 })
    }

    const sellerItems = order.order_items.filter((item: any) => item.product.seller_id === seller.id)

    if (sellerItems.length === 0) {
      return NextResponse.json({ error: 'No items from this seller in order' }, { status: 403 })
    }

    // Initialize Sendcloud
    const sendcloud = new SendcloudAPI()

    // Prepare shipping address
    const shippingAddress = order.shipping_address || order.shipping_info
    if (!shippingAddress) {
      return NextResponse.json({ error: 'Shipping address not found' }, { status: 400 })
    }

    const sendcloudAddress = convertToSendcloudAddress(shippingAddress)

    // Estimate package weight
    const weight = estimatePackageWeight(sellerItems)

    // Get shipping method for destination country
    const country = shippingAddress.country || 'DE'
    const shippingMethodId = getDefaultShippingMethod(country)

    // Create parcel data
    const parcelData = {
      ...sendcloudAddress,
      order_number: order.id.slice(0, 8).toUpperCase(),
      weight: weight.toString(),
      shipment: {
        id: shippingMethodId,
      },
      request_label: true,
      apply_shipping_rules: true,
    }

    console.log('📦 Creating Sendcloud label:', parcelData)

    // Create label via Sendcloud
    const parcel = await sendcloud.createLabel(parcelData as any)

    console.log('✅ Sendcloud parcel created:', parcel.id, parcel.tracking_number)

    // Update order with tracking info
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        tracking_number: parcel.tracking_number,
        shipping_label_url: parcel.label.normal_printer[0] || parcel.label.label_printer,
        shipping_carrier: parcel.carrier.code,
        shipping_service: parcel.shipment.name,
        shipped_at: new Date().toISOString(),
        estimated_delivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      })
      .eq('id', orderId)

    if (updateError) {
      console.error('Failed to update order:', updateError)
      return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
    }

    // Create shipping label record
    await supabase
      .from('shipping_labels')
      .insert({
        order_id: orderId,
        seller_id: seller.id,
        tracking_number: parcel.tracking_number,
        carrier: parcel.carrier.code,
        service: parcel.shipment.name,
        label_url: parcel.label.normal_printer[0] || parcel.label.label_printer,
        estimated_delivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'created',
      })

    // Return label URL and tracking info
    return NextResponse.json({
      success: true,
      tracking_number: parcel.tracking_number,
      tracking_url: parcel.tracking_url,
      label_url: parcel.label.normal_printer[0] || parcel.label.label_printer,
      carrier: parcel.carrier.code,
      estimated_delivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })

  } catch (error: any) {
    console.error('❌ Create shipping label error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create shipping label' },
      { status: 500 }
    )
  }
}
