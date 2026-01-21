import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: Request) {
  try {
    const { email, password, name, username } = await request.json()

    // Validasyon
    if (!email || !password || !name || !username) {
      return NextResponse.json({ error: 'Tüm alanları doldurun' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Şifre en az 6 karakter olmalı' }, { status: 400 })
    }

    // Email kontrolü
    const { data: existingUser } = await supabase
      .from('users')
      .select('email')
      .eq('email', email)
      .single()

    if (existingUser) {
      return NextResponse.json({ error: 'Bu email zaten kullanılıyor' }, { status: 400 })
    }

    // Username kontrolü
    const { data: existingUsername } = await supabase
      .from('users')
      .select('username')
      .eq('username', username)
      .single()

    if (existingUsername) {
      return NextResponse.json({ error: 'Bu kullanıcı adı zaten alınmış' }, { status: 400 })
    }

    // Şifreyi hashle
    const hashedPassword = await bcrypt.hash(password, 10)

    // Yeni kullanıcı oluştur
    const userId = uuidv4()
    const { error: insertError } = await supabase.from('users').insert({
      id: userId,
      email,
      password: hashedPassword,
      name,
      username,
      avatar_url: null,
      created_at: new Date().toISOString()
    })

    if (insertError) {
      console.error('Insert error:', insertError)
      return NextResponse.json({ error: 'Kayıt başarısız oldu' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Kayıt başarılı! Giriş yapabilirsiniz.',
      userId
    })
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}
