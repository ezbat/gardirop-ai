import { supabase } from './supabase'

// NextAuth kullanıcısını Supabase'e kaydet/güncelle
export async function syncUserToSupabase(user: {
  id: string
  email: string
  name?: string
  image?: string
}) {
  try {
    // Kullanıcı var mı kontrol et
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single()

    if (existingUser) {
      // Güncelle
      await supabase
        .from('users')
        .update({
          email: user.email,
          name: user.name || null,
          avatar_url: user.image || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
    } else {
      // Yeni kullanıcı oluştur
      await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email,
          name: user.name || null,
          avatar_url: user.image || null
        })
    }
  } catch (error) {
    console.error('Sync user error:', error)
  }
}