import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    const { email, orderNumber, items, total } = await request.json()

    const itemsList = items.map((item: any) => 
      `<li style="margin: 10px 0;">${item.product_name} x${item.quantity} - €${(item.price * item.quantity).toFixed(2)}</li>`
    ).join('')

    const { data, error } = await resend.emails.send({
      from: 'Gardirop AI <onboarding@resend.dev>',
      to: [email],
      subject: `✨ Siparişiniz Alındı - #${orderNumber.slice(0, 8).toUpperCase()}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%); padding: 40px 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 32px;">🎉 Siparişiniz Alındı!</h1>
            </div>
            
            <!-- Content -->
            <div style="padding: 40px 20px;">
              <p style="font-size: 16px; color: #374151; line-height: 1.6;">Merhaba,</p>
              <p style="font-size: 16px; color: #374151; line-height: 1.6;">
                Siparişiniz başarıyla oluşturuldu ve en kısa sürede hazırlanmaya başlanacak.
              </p>
              
              <!-- Order Details -->
              <div style="background-color: #f9fafb; border-radius: 12px; padding: 30px; margin: 30px 0;">
                <h2 style="color: #8B5CF6; margin: 0 0 20px 0; font-size: 20px;">📦 Sipariş Detayları</h2>
                
                <div style="margin-bottom: 15px;">
                  <span style="color: #6b7280; font-size: 14px;">Sipariş No:</span>
                  <span style="color: #111827; font-weight: bold; font-size: 16px; margin-left: 10px;">
                    #${orderNumber.slice(0, 8).toUpperCase()}
                  </span>
                </div>
                
                <div style="margin-bottom: 20px;">
                  <span style="color: #6b7280; font-size: 14px;">Tarih:</span>
                  <span style="color: #111827; font-size: 16px; margin-left: 10px;">
                    ${new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
                
                <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 20px;">
                  <h3 style="color: #374151; margin: 0 0 15px 0; font-size: 16px;">Ürünler:</h3>
                  <ul style="list-style: none; padding: 0; margin: 0;">
                    ${itemsList}
                  </ul>
                </div>
                
                <div style="border-top: 2px solid #8B5CF6; padding-top: 20px; margin-top: 20px; text-align: right;">
                  <span style="color: #6b7280; font-size: 14px;">Toplam Tutar:</span>
                  <span style="color: #8B5CF6; font-weight: bold; font-size: 28px; margin-left: 10px;">
                    €${total.toFixed(2)}
                  </span>
                </div>
              </div>
              
              <!-- Info -->
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; color: #92400e; font-size: 14px;">
                  📍 Siparişiniz hazırlandıktan sonra kargo takip numaranız email ile gönderilecektir.
                </p>
              </div>
              
              <p style="font-size: 16px; color: #374151; line-height: 1.6;">
                Herhangi bir sorunuz olursa bizimle iletişime geçmekten çekinmeyin.
              </p>
              
              <p style="font-size: 16px; color: #374151; line-height: 1.6;">
                Teşekkür ederiz! ❤️
              </p>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f9fafb; padding: 30px 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">
                <strong style="color: #8B5CF6;">Gardirop AI</strong> - Premium Virtual Wardrobe
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                Bu email otomatik olarak gönderilmiştir.
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    })

    if (error) {
      console.error('Resend error:', error)
      return NextResponse.json({ error }, { status: 400 })
    }

    console.log('✅ Email sent:', data)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Send email error:', error)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}