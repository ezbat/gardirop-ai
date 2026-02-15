import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { applicationId, adminId, action, rejectionReason } = await request.json()
    
    if (!applicationId || !adminId || !action) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 })
    }

    // Get application
    const { data: application, error: appError } = await supabase
      .from('seller_applications')
      .select('*')
      .eq('id', applicationId)
      .single()
    
    if (appError || !application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    if (action === 'approve') {
      // Create seller account
      const shopSlug = application.shop_name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        + '-' + Date.now().toString().slice(-6)

      const { data: seller, error: sellerError } = await supabase
        .from('sellers')
        .insert({
          user_id: application.user_id,
          shop_name: application.shop_name,
          shop_slug: shopSlug,
          shop_description: application.shop_description,
          business_type: application.business_type,
          tax_number: application.tax_number,
          phone: application.phone,
          address: application.address,
          city: application.city,
          postal_code: application.postal_code,
          country: application.country,
          business_address: application.address,
          iban: application.iban,
          bank_name: application.bank_name,
          account_holder_name: application.account_holder_name,
          id_card_front_url: application.id_card_front_url,
          id_card_back_url: application.id_card_back_url,
          address_document_url: application.address_document_url,
          business_certificate_url: application.business_certificate_url,
          logo_url: application.logo_url,
          is_verified: true,
          verified_at: new Date().toISOString()
        })
        .select()
        .single()

      if (sellerError) throw sellerError

      // Update application status
      await supabase
        .from('seller_applications')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: adminId
        })
        .eq('id', applicationId)

      return NextResponse.json({ success: true, seller })
    } else if (action === 'reject') {
      // Update application status
      await supabase
        .from('seller_applications')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason || 'Başvurunuz uygun bulunmadı',
          reviewed_at: new Date().toISOString(),
          reviewed_by: adminId
        })
        .eq('id', applicationId)

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Admin approval error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}