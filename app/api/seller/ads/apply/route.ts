import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * POST /api/seller/ads/apply — Submit an ad application
 * Body: { packageId: string, postId?: string }
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  // Resolve seller
  const { data: seller } = await supabaseAdmin
    .from('sellers')
    .select('id, status')
    .eq('user_id', session.user.id)
    .in('status', ['active', 'approved'])
    .maybeSingle()

  if (!seller) {
    return NextResponse.json({ success: false, error: 'Seller not found' }, { status: 403 })
  }

  try {
    const { packageId, postId } = await request.json()

    if (!packageId) {
      return NextResponse.json({ success: false, error: 'packageId required' }, { status: 400 })
    }

    // Verify package exists
    const { data: pkg } = await supabaseAdmin
      .from('ad_packages')
      .select('id, is_active')
      .eq('id', packageId)
      .eq('is_active', true)
      .maybeSingle()

    if (!pkg) {
      return NextResponse.json({ success: false, error: 'Package not found' }, { status: 404 })
    }

    // If postId provided, verify ownership
    if (postId) {
      const { data: post } = await supabaseAdmin
        .from('posts')
        .select('id')
        .eq('id', postId)
        .eq('seller_id', seller.id)
        .maybeSingle()

      if (!post) {
        return NextResponse.json({ success: false, error: 'Post not found or not owned' }, { status: 404 })
      }
    }

    const { data: application, error } = await supabaseAdmin
      .from('ad_applications')
      .insert({
        seller_id: seller.id,
        package_id: packageId,
        post_id: postId || null,
        status: 'pending',
      })
      .select()
      .maybeSingle()

    if (error) throw error

    return NextResponse.json({ success: true, application })
  } catch (error) {
    console.error('[seller/ads/apply] POST error:', error)
    return NextResponse.json({ success: false, error: 'Failed to submit application' }, { status: 500 })
  }
}
