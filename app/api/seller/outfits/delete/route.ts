import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { outfitId } = await req.json()

    if (!outfitId) {
      return NextResponse.json({ error: 'Outfit ID required' }, { status: 400 })
    }

    // Get outfit and verify seller ownership
    const { data: outfit, error: fetchError } = await supabase
      .from('outfit_collections')
      .select('seller_id')
      .eq('id', outfitId)
      .single()

    if (fetchError || !outfit) {
      return NextResponse.json({ error: 'Outfit not found' }, { status: 404 })
    }

    // Verify seller ownership
    const { data: seller } = await supabase
      .from('sellers')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('id', outfit.seller_id)
      .single()

    if (!seller) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Delete outfit (CASCADE will delete outfit_items automatically)
    const { error: deleteError } = await supabase
      .from('outfit_collections')
      .delete()
      .eq('id', outfitId)

    if (deleteError) {
      console.error('Delete outfit error:', deleteError)
      return NextResponse.json({ error: 'Failed to delete outfit' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Delete outfit error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
