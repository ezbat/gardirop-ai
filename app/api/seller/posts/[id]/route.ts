import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabaseAdmin } from '@/lib/supabase-admin'

async function resolveSeller(userId: string) {
  const { data } = await supabaseAdmin
    .from('sellers')
    .select('id, status')
    .eq('user_id', userId)
    .in('status', ['active', 'approved'])
    .maybeSingle()
  return data
}

/**
 * PATCH /api/seller/posts/[id] — Update a post
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const seller = await resolveSeller(session.user.id)
  if (!seller) {
    return NextResponse.json({ success: false, error: 'Seller not found' }, { status: 403 })
  }

  const { id } = await params

  // Ownership check
  const { data: existing } = await supabaseAdmin
    .from('posts')
    .select('id, seller_id')
    .eq('id', id)
    .eq('seller_id', seller.id)
    .maybeSingle()

  if (!existing) {
    return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 })
  }

  try {
    const body = await request.json()
    const updates: Record<string, any> = {}

    if (body.caption !== undefined) {
      updates.caption = body.caption
      // Re-extract hashtags
      const tags = body.caption.match(/#[\wäöüßÄÖÜ]+/g)?.map((t: string) => t.slice(1).toLowerCase()) || []
      updates.hashtags = [...new Set([...(body.hashtags || []), ...tags])]
    }
    if (body.linkedProductIds !== undefined) updates.linked_product_ids = body.linkedProductIds
    if (body.imageUrl !== undefined) updates.image_url = body.imageUrl

    const { data: post, error } = await supabaseAdmin
      .from('posts')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle()

    if (error) throw error
    return NextResponse.json({ success: true, post })
  } catch (error) {
    console.error('[seller/posts/[id]] PATCH error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update' }, { status: 500 })
  }
}

/**
 * DELETE /api/seller/posts/[id] — Delete a post
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const seller = await resolveSeller(session.user.id)
  if (!seller) {
    return NextResponse.json({ success: false, error: 'Seller not found' }, { status: 403 })
  }

  const { id } = await params

  const { error } = await supabaseAdmin
    .from('posts')
    .delete()
    .eq('id', id)
    .eq('seller_id', seller.id)

  if (error) {
    console.error('[seller/posts/[id]] DELETE error:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
