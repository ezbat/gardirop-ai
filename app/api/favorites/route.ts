import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const userId  = session?.user?.id

  if (!userId) {
    return NextResponse.json({ error: 'Anmeldung erforderlich' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const { favoriteUserId, action } = (body ?? {}) as {
    favoriteUserId?: string
    action?: string
  }

  if (!favoriteUserId) {
    return NextResponse.json({ error: 'favoriteUserId required' }, { status: 400 })
  }
  if (userId === favoriteUserId) {
    return NextResponse.json({ error: 'Cannot favorite yourself' }, { status: 400 })
  }

  if (action === 'add') {
    const { error } = await supabaseAdmin
      .from('favorites')
      .insert({ user_id: userId, favorite_user_id: favoriteUserId })
    if (error && error.code !== '23505') {
      console.error('[api/favorites POST add]', error.message)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
    return NextResponse.json({ success: true, favorited: true })
  }

  if (action === 'remove') {
    const { error } = await supabaseAdmin
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('favorite_user_id', favoriteUserId)
    if (error) {
      console.error('[api/favorites POST remove]', error.message)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
    return NextResponse.json({ success: true, favorited: false })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
