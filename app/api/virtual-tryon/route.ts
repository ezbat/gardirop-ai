import { NextRequest, NextResponse } from 'next/server'
import { generateFullOutfitTryOn } from '@/lib/virtual-tryon'

export async function POST(request: NextRequest) {
  try {
    const { clothingUrls } = await request.json()

    if (!clothingUrls || clothingUrls.length === 0) {
      return NextResponse.json({ error: 'Kıyafet URL\'leri gerekli' }, { status: 400 })
    }

    const result = await generateFullOutfitTryOn(clothingUrls)

    if (!result) {
      return NextResponse.json({ error: 'Virtual try-on başarısız' }, { status: 500 })
    }

    return NextResponse.json({ imageUrl: result })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}