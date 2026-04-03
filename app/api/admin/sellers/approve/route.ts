import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/admin-auth'

export async function POST(request: NextRequest) {
  // ── Auth: require admin token ──────────────────────────────────────────────
  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  try {
    const { applicationId, action, rejectionReason } = await request.json()

    if (!applicationId || !action) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 })
    }

    // Get application
    const { data: application, error: appError } = await supabaseAdmin
      .from('seller_applications')
      .select('id, user_id, shop_name, shop_description, business_type, tax_number, phone, address, city, postal_code, country, iban, bank_name, account_holder_name, id_card_front_url, id_card_back_url, address_document_url, business_certificate_url, logo_url')
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

      const { data: seller, error: sellerError } = await supabaseAdmin
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

      // Update application status — adminId derived from auth, not request body
      await supabaseAdmin
        .from('seller_applications')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: 'admin'
        })
        .eq('id', applicationId)

      return NextResponse.json({ success: true, seller })
    } else if (action === 'reject') {
      await supabaseAdmin
        .from('seller_applications')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason || 'Bewerbung wurde nicht genehmigt',
          reviewed_at: new Date().toISOString(),
          reviewed_by: 'admin'
        })
        .eq('id', applicationId)

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('[admin/sellers/approve] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
