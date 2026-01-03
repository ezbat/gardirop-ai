import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Eğer RESEND_API_KEY yoksa, sessizce başarılı dön
    if (!process.env.RESEND_API_KEY) {
      console.log('⚠️ RESEND_API_KEY not found - email not sent')
      return NextResponse.json({ success: true, message: 'Email disabled' })
    }

    // Resend'i dinamik import et
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)

    const { email, orderNumber, items, total } = await request.json()

    const itemsList = items.map((item: any) => 
      `<li style="margin: 10px 0;">${item.product_name} x${item.quantity} - €${(item.price * item.quantity).toFixed(2)}</li>`
    ).join('')

    const { data, error } = await resend.emails.send({
      from: 'Gardirop AI <onboarding@resend.dev>',
      to: [email],
      subject: `✨ Siparişiniz Alındı - #${orderNumber.slice(0, 8).toUpperCase()}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #8B5CF6;">Siparişiniz Alındı! 🎉</h1>
          <p>Siparişiniz başarıyla oluşturuldu.</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <h2>Sipariş Detayları</h2>
            <p><strong>Sipariş No:</strong> #${orderNumber.slice(0, 8).toUpperCase()}</p>
            <h3>Ürünler:</h3>
            <ul>${itemsList}</ul>
            <p style="font-size: 20px; font-weight: bold; color: #8B5CF6;">Toplam: €${total.toFixed(2)}</p>
          </div>
        </div>
      `
    })

    if (error) {
      console.error('Resend error:', error)
      return NextResponse.json({ error }, { status: 400 })
    }
    
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Send email error:', error)
    return NextResponse.json({ error: 'Email failed' }, { status: 500 })
  }
}