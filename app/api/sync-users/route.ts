import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Tüm satıcıları al
    const { data: sellers, error: sellersError } = await supabase
      .from('products')
      .select('seller_id')

    if (sellersError) throw sellersError

    // Unique seller ID'leri bul
    const uniqueSellerIds = Array.from(new Set(sellers?.map(p => p.seller_id) || []))

    console.log('Found sellers:', uniqueSellerIds)

    // Her satıcı için users tablosuna ekle
    for (const sellerId of uniqueSellerIds) {
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('id', sellerId)
        .single()

      if (!existingUser) {
        console.log('Creating user for seller:', sellerId)
        const { error: insertError } = await supabase.from('users').insert({
          id: sellerId,
          email: `seller-${sellerId}@gardirop.com`,
          name: `Satıcı ${sellerId.substring(0, 8)}`,
          username: `seller_${sellerId.substring(0, 8)}`,
          avatar_url: null,
          created_at: new Date().toISOString()
        })

        if (insertError) {
          console.error('Insert error for seller:', sellerId, insertError)
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${uniqueSellerIds.length} sellers`,
      sellers: uniqueSellerIds
    })
  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
  }
}
