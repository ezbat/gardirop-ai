import { NextRequest, NextResponse } from 'next/server'
import { virtualTryOn } from '@/lib/pixelcut'

export async function POST(request: NextRequest) {
  try {
    const { personImageUrl, garmentImageUrl } = await request.json()

    if (!personImageUrl || !garmentImageUrl) {
      return NextResponse.json(
        { error: 'Person image and garment image required' },
        { status: 400 }
      )
    }

    console.log('👔 Virtual try-on starting...')
    console.log('👤 Person:', personImageUrl)
    console.log('👕 Garment:', garmentImageUrl)

    const resultUrl = await virtualTryOn(personImageUrl, garmentImageUrl)

    if (!resultUrl) {
      return NextResponse.json(
        { error: 'Virtual try-on failed' },
        { status: 500 }
      )
    }

    console.log('✅ Try-on complete:', resultUrl)

    return NextResponse.json({ imageUrl: resultUrl })
  } catch (error) {
    console.error('❌ Virtual try-on API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}