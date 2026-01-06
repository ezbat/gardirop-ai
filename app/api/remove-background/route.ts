import { NextRequest, NextResponse } from 'next/server'
import { removeBackground } from '@/lib/pixelcut'

export async function POST(request: NextRequest) {
  try {
    const { imageUrl } = await request.json()

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL required' },
        { status: 400 }
      )
    }

    console.log('🎨 Removing background from:', imageUrl)

    const resultUrl = await removeBackground(imageUrl)

    if (!resultUrl) {
      return NextResponse.json(
        { error: 'Background removal failed' },
        { status: 500 }
      )
    }

    console.log('✅ Background removed:', resultUrl)

    return NextResponse.json({ resultUrl })
  } catch (error) {
    console.error('Remove background API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}