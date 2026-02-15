import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const {
      userId,
      shopName,
      shopDescription,
      businessType,
      taxNumber,
      phone,
      address,
      city,
      postalCode,
      country,
      iban,
      bankName,
      accountHolderName,
      idCardFrontUrl,
      idCardBackUrl,
      addressDocumentUrl,
      businessCertificateUrl,
      logoUrl
    } = await request.json()

    if (!userId || !shopName || !phone) {
      return NextResponse.json({ error: 'Required fields missing' }, { status: 400 })
    }

    // Validate required documents
    if (!idCardFrontUrl || !idCardBackUrl) {
      return NextResponse.json({ error: 'Kimlik belgesi zorunludur' }, { status: 400 })
    }

    if (!iban || !bankName || !accountHolderName) {
      return NextResponse.json({ error: 'Banka bilgileri zorunludur' }, { status: 400 })
    }

    if (businessType === 'company' && !businessCertificateUrl) {
      return NextResponse.json({ error: 'Şirket için ticaret belgesi zorunludur' }, { status: 400 })
    }

    // Check if user already has an application
    const { data: existingApp } = await supabase
      .from('seller_applications')
      .select('id, status')
      .eq('user_id', userId)
      .single()

    if (existingApp) {
      if (existingApp.status === 'pending') {
        return NextResponse.json({ error: 'Başvurunuz zaten inceleniyor' }, { status: 400 })
      }
      if (existingApp.status === 'approved') {
        return NextResponse.json({ error: 'Zaten satıcısınız' }, { status: 400 })
      }
    }

    // Check if user is already a seller
    const { data: existingSeller } = await supabase
      .from('sellers')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (existingSeller) {
      return NextResponse.json({ error: 'Zaten satıcısınız' }, { status: 400 })
    }

    // Create application with all new fields
    const { data: application, error } = await supabase
      .from('seller_applications')
      .upsert({
        user_id: userId,
        shop_name: shopName,
        shop_description: shopDescription || null,
        business_type: businessType || 'individual',
        tax_number: taxNumber || null,
        phone,
        address: address || null,
        city: city || null,
        postal_code: postalCode || null,
        country: country || 'Turkey',
        iban: iban || null,
        bank_name: bankName || null,
        account_holder_name: accountHolderName || null,
        id_card_front_url: idCardFrontUrl || null,
        id_card_back_url: idCardBackUrl || null,
        address_document_url: addressDocumentUrl || null,
        business_certificate_url: businessCertificateUrl || null,
        logo_url: logoUrl || null,
        status: 'pending'
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, application })
  } catch (error) {
    console.error('Seller application error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}