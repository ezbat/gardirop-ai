import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { Resend } from 'resend'
import { getSellerApprovalEmail, getSellerRejectionEmail } from '@/lib/email-templates'

const resend = new Resend(process.env.RESEND_API_KEY)

// GET: Fetch all sellers with status filter
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // pending, approved, rejected, suspended
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Admin check (simplified for m3000)
    if (userId !== 'm3000') {
      const { data: user } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single()

      if (user?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
      }
    }

    let query = supabase
      .from('sellers')
      .select(`
        *,
        user:users(id, email, name, avatar_url)
      `)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data: sellers, error } = await query

    if (error) {
      console.error('Error fetching sellers:', error)
      return NextResponse.json({ error: 'Failed to fetch sellers' }, { status: 500 })
    }

    return NextResponse.json({ sellers })
  } catch (error) {
    console.error('Sellers API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH: Update seller status (approve/reject/suspend)
export async function PATCH(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const body = await request.json()
    const { sellerId, status, rejectionReason } = body

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Admin check (simplified for m3000)
    if (userId !== 'm3000') {
      const { data: user } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single()

      if (user?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
      }
    }

    if (!sellerId || !status) {
      return NextResponse.json({ error: 'sellerId and status are required' }, { status: 400 })
    }

    // Update seller status
    const updateData: any = {
      status,
      approved_by: userId,
      approved_at: new Date().toISOString(),
    }

    if (status === 'rejected' && rejectionReason) {
      updateData.rejection_reason = rejectionReason
    }

    const { data: seller, error: sellerError } = await supabase
      .from('sellers')
      .update(updateData)
      .eq('id', sellerId)
      .select('*, user:users(email, name)')
      .single()

    if (sellerError) {
      console.error('Error updating seller:', sellerError)
      return NextResponse.json({ error: 'Failed to update seller' }, { status: 500 })
    }

    // Log admin action
    await supabase.from('admin_actions').insert({
      admin_id: userId,
      action_type: `${status}_seller`,
      target_type: 'seller',
      target_id: sellerId,
      details: { status, rejectionReason },
    })

    // Send email notification
    try {
      if (status === 'approved') {
        const emailTemplate = getSellerApprovalEmail({
          shop_name: seller.shop_name,
          email: seller.user.email
        })

        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'Wearo <noreply@wearo.com>',
          to: seller.user.email,
          subject: emailTemplate.subject,
          html: emailTemplate.html,
        })

        console.log('📧 Seller approval email sent to:', seller.user.email)
      } else if (status === 'rejected') {
        const emailTemplate = getSellerRejectionEmail({
          shop_name: seller.shop_name,
          email: seller.user.email,
          reason: rejectionReason
        })

        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'Wearo <noreply@wearo.com>',
          to: seller.user.email,
          subject: emailTemplate.subject,
          html: emailTemplate.html,
        })

        console.log('📧 Seller rejection email sent to:', seller.user.email)
      }
    } catch (emailError) {
      console.error('Failed to send seller email:', emailError)
      // Don't fail the API if email fails
    }

    return NextResponse.json({ seller })
  } catch (error) {
    console.error('Seller update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
