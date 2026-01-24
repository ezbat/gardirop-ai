// Email template functions

export function getOrderConfirmationEmail(order: {
  id: string
  user: { full_name?: string; email: string }
  total_amount: number
  items: Array<{
    product: { title: string; price: number; images: string[] }
    quantity: number
    size: string
  }>
  shipping_address: any
}) {
  const itemsHtml = order.items.map(item => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">
        <img src="${item.product.images[0]}" alt="${item.product.title}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;" />
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">
        <strong>${item.product.title}</strong><br/>
        <span style="color: #666;">Beden: ${item.size}</span><br/>
        <span style="color: #666;">Adet: ${item.quantity}</span>
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">
        €${(item.product.price * item.quantity).toFixed(2)}
      </td>
    </tr>
  `).join('')

  return {
    subject: `✅ Siparişiniz Alındı - #${order.id.slice(0, 8)}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Sipariş Onayı</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">

        <!-- Header -->
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #6366f1; margin: 0; font-size: 32px;">Wearo</h1>
          <p style="color: #666; margin: 5px 0 0 0;">Stilini Keşfet, Kombinini Oluştur</p>
        </div>

        <!-- Success Message -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
          <div style="font-size: 48px; margin-bottom: 10px;">🎉</div>
          <h2 style="margin: 0 0 10px 0;">Siparişiniz Alındı!</h2>
          <p style="margin: 0; opacity: 0.9;">Sipariş No: <strong>#${order.id.slice(0, 8)}</strong></p>
        </div>

        <!-- Greeting -->
        <p style="font-size: 16px;">Merhaba ${order.user.full_name || 'Değerli Müşterimiz'},</p>
        <p style="font-size: 14px; color: #666;">Siparişiniz başarıyla alınmıştır. Ödemeniz onaylandıktan sonra kargoya verilecektir.</p>

        <!-- Order Items -->
        <div style="margin: 30px 0;">
          <h3 style="border-bottom: 2px solid #6366f1; padding-bottom: 10px;">Sipariş Detayları</h3>
          <table style="width: 100%; border-collapse: collapse;">
            ${itemsHtml}
          </table>
        </div>

        <!-- Total -->
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span style="color: #666;">Ara Toplam:</span>
            <span>€${order.total_amount.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span style="color: #666;">Kargo:</span>
            <span style="color: #22c55e;">ÜCRETSİZ</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding-top: 10px; border-top: 2px solid #ddd; font-size: 18px; font-weight: bold;">
            <span>Toplam:</span>
            <span style="color: #6366f1;">€${order.total_amount.toFixed(2)}</span>
          </div>
        </div>

        <!-- Shipping Address -->
        ${order.shipping_address ? `
          <div style="margin: 20px 0;">
            <h3 style="border-bottom: 2px solid #6366f1; padding-bottom: 10px;">Teslimat Adresi</h3>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
              <p style="margin: 5px 0;"><strong>${order.shipping_address.full_name}</strong></p>
              <p style="margin: 5px 0; color: #666;">${order.shipping_address.phone}</p>
              <p style="margin: 5px 0; color: #666;">${order.shipping_address.address}</p>
              <p style="margin: 5px 0; color: #666;">${order.shipping_address.district}, ${order.shipping_address.city} ${order.shipping_address.postal_code}</p>
            </div>
          </div>
        ` : ''}

        <!-- Next Steps -->
        <div style="background: #eff6ff; border-left: 4px solid #6366f1; padding: 15px; margin: 20px 0;">
          <h4 style="margin: 0 0 10px 0; color: #6366f1;">Sonraki Adımlar</h4>
          <ul style="margin: 0; padding-left: 20px; color: #666;">
            <li>Ödemeniz işleme alınıyor</li>
            <li>Onaylandıktan sonra ürünleriniz hazırlanacak</li>
            <li>Kargoya verildiğinde email ile bilgilendirme yapılacak</li>
            <li>Tahmini teslimat süresi: 2-3 iş günü</li>
          </ul>
        </div>

        <!-- CTA Button -->
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/orders/${order.id}" style="display: inline-block; background: #6366f1; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
            Siparişimi Takip Et
          </a>
        </div>

        <!-- Support -->
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
          <p style="margin: 0 0 10px 0; color: #666;">Sorularınız mı var?</p>
          <p style="margin: 0;">
            <a href="mailto:support@wearo.com" style="color: #6366f1; text-decoration: none;">support@wearo.com</a>
          </p>
        </div>

        <!-- Footer -->
        <div style="text-align: center; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 12px;">
          <p>© ${new Date().getFullYear()} Wearo. Tüm hakları saklıdır.</p>
          <p>Bu email ${order.user.email} adresine gönderilmiştir.</p>
        </div>

      </body>
      </html>
    `
  }
}

export function getSellerApprovalEmail(seller: {
  shop_name: string
  email: string
}) {
  return {
    subject: '🎉 Satıcı Başvurunuz Onaylandı - Wearo',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">

        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #6366f1; margin: 0; font-size: 32px;">Wearo</h1>
          <p style="color: #666; margin: 5px 0 0 0;">Satıcı Platformu</p>
        </div>

        <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
          <div style="font-size: 48px; margin-bottom: 10px;">✅</div>
          <h2 style="margin: 0 0 10px 0;">Başvurunuz Onaylandı!</h2>
          <p style="margin: 0; opacity: 0.9;">Mağaza Adı: <strong>${seller.shop_name}</strong></p>
        </div>

        <p style="font-size: 16px;">Tebrikler!</p>
        <p style="font-size: 14px; color: #666;">Satıcı başvurunuz onaylanmıştır. Artık Wearo'da ürün satışı yapabilirsiniz.</p>

        <div style="background: #eff6ff; border-left: 4px solid #6366f1; padding: 15px; margin: 20px 0;">
          <h4 style="margin: 0 0 10px 0; color: #6366f1;">Başlamak için:</h4>
          <ul style="margin: 0; padding-left: 20px; color: #666;">
            <li>Satıcı paneline giriş yapın</li>
            <li>İlk ürününüzü ekleyin</li>
            <li>Kombin koleksiyonları oluşturun</li>
            <li>Satışa başlayın!</li>
          </ul>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/seller/dashboard" style="display: inline-block; background: #6366f1; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
            Satıcı Paneline Git
          </a>
        </div>

        <div style="text-align: center; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 12px;">
          <p>© ${new Date().getFullYear()} Wearo. Tüm hakları saklıdır.</p>
        </div>

      </body>
      </html>
    `
  }
}

export function getSellerRejectionEmail(seller: {
  shop_name: string
  email: string
  reason?: string
}) {
  return {
    subject: 'Satıcı Başvurunuz Hakkında - Wearo',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0;">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">

        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #6366f1; margin: 0; font-size: 32px;">Wearo</h1>
          <p style="color: #666; margin: 5px 0 0 0;">Satıcı Platformu</p>
        </div>

        <p style="font-size: 16px;">Merhaba,</p>
        <p style="font-size: 14px; color: #666;">Satıcı başvurunuzu inceledik. Şu anda başvurunuzu onaylayamıyoruz.</p>

        ${seller.reason ? `
          <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0;">
            <h4 style="margin: 0 0 10px 0; color: #ef4444;">Red Nedeni:</h4>
            <p style="margin: 0; color: #666;">${seller.reason}</p>
          </div>
        ` : ''}

        <p style="font-size: 14px; color: #666;">Eksik bilgileri tamamladıktan sonra tekrar başvurabilirsiniz.</p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/seller/apply" style="display: inline-block; background: #6366f1; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
            Tekrar Başvur
          </a>
        </div>

        <div style="text-align: center; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 12px;">
          <p>© ${new Date().getFullYear()} Wearo. Tüm hakları saklıdır.</p>
        </div>

      </body>
      </html>
    `
  }
}
