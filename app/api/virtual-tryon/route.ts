import { NextRequest, NextResponse } from 'next/server'
import { generateFullOutfitTryOn } from '@/lib/virtual-tryon'

export async function POST(request: NextRequest) {
  try {
    console.log('🎯 API route başladı')
    
    const { clothingUrls } = await request.json()
    console.log('📦 Clothing URLs:', clothingUrls)

    if (!clothingUrls || clothingUrls.length === 0) {
      console.log('❌ Clothing URLs eksik')
      return NextResponse.json({ error: 'Kıyafet URLleri gerekli' }, { status: 400 })
    }

    console.log('🚀 generateFullOutfitTryOn çağrılıyor...')
    const result = await generateFullOutfitTryOn(clothingUrls)
    console.log('✅ Sonuç:', result ? 'SUCCESS' : 'NULL')

    if (!result) {
      console.log('❌ Result null döndü')
      return NextResponse.json({ error: 'Virtual try-on başarısız' }, { status: 500 })
    }

    console.log('✨ Başarılı!')
    return NextResponse.json({ imageUrl: result })
  } catch (error: any) {
    console.error('💥 API HATA:', error)
    console.error('💥 Hata mesajı:', error.message)
    console.error('💥 Stack:', error.stack)
    return NextResponse.json({ 
      error: 'Sunucu hatası', 
      details: error.message 
    }, { status: 500 })
  }
}