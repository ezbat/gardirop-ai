"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { CreditCard, Truck, Lock, ArrowLeft } from "lucide-react"
import Link from "next/link"
import FloatingParticles from "@/components/floating-particles"
import { getCart, clearCart, type CartItem } from "@/lib/cart"
import { supabase } from "@/lib/supabase"

export default function CheckoutPage() {
  const { data: session } = useSession()
  const userId = session?.user?.id
  const router = useRouter()

  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    name: session?.user?.name || "",
    email: session?.user?.email || "",
    phone: "",
    address: "",
    city: "",
    postalCode: "",
    paymentMethod: "credit_card"
  })

  useEffect(() => {
    if (userId) {
      loadCart()
    }
  }, [userId])

  const loadCart = async () => {
    if (!userId) return
    setLoading(true)
    const cartData = await getCart(userId)
    setCart(cartData)
    setLoading(false)
  }

  const subtotal = cart.reduce((sum, item) => sum + (item.product?.price || 0) * item.quantity, 0)
  const shipping = 9.99
  const total = subtotal + shipping

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId || cart.length === 0) return

    setSubmitting(true)
    try {
      // Sipariş oluştur
      const orderItems = cart.map(item => ({
        product_id: item.product_id,
        product_name: item.product?.product_name,
        price: item.product?.price,
        quantity: item.quantity,
        image_url: item.product?.image_url
      }))

      const { data: order, error } = await supabase
        .from('orders')
        .insert({
          user_id: userId,
          user_email: formData.email,
          user_name: formData.name,
          user_address: `${formData.address}, ${formData.city}, ${formData.postalCode}`,
          user_phone: formData.phone,
          items: orderItems,
          total_amount: total,
          status: 'pending',
          payment_method: formData.paymentMethod
        })
        .select()
        .single()

      if (error) throw error

      // Sepeti temizle
      await clearCart(userId)

      // Email gönder (opsiyonel - Resend API varsa)
      try {
        await fetch('/api/send-order-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            orderNumber: order.id,
            items: orderItems,
            total: total
          })
        })
      } catch (emailError) {
        console.log('Email gönderme hatası (opsiyonel):', emailError)
      }

      alert('✅ Siparişiniz başarıyla oluşturuldu!')
      router.push('/orders')
    } catch (error) {
      console.error('Checkout error:', error)
      alert('❌ Sipariş oluşturulamadı. Tekrar deneyin.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-9xl mb-6">🔒</div>
          <h2 className="text-2xl font-bold mb-4">Giriş Yapmalısınız</h2>
          <Link href="/api/auth/signin" className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 inline-block">Giriş Yap</Link>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity }} className="w-16 h-16 rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (cart.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-9xl mb-6">🛒</div>
          <h2 className="text-2xl font-bold mb-4">Sepetiniz Boş</h2>
          <Link href="/store" className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 inline-block">Mağazaya Git</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <FloatingParticles />
      <section className="relative py-8 px-4">
        <div className="container mx-auto max-w-5xl">
          <Link href="/cart" className="flex items-center gap-2 text-muted-foreground hover:text-primary mb-6"><ArrowLeft className="w-5 h-5" />Sepete Dön</Link>
          <h1 className="font-serif text-4xl font-bold mb-8">Ödeme</h1>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                
                {/* İLETİŞİM BİLGİLERİ */}
                <div className="glass border border-border rounded-2xl p-6">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Truck className="w-5 h-5" />İletişim Bilgileri</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Ad Soyad" className="px-4 py-3 glass border border-border rounded-xl outline-none focus:border-primary" />
                    <input type="email" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="Email" className="px-4 py-3 glass border border-border rounded-xl outline-none focus:border-primary" />
                    <input type="tel" required value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} placeholder="Telefon" className="md:col-span-2 px-4 py-3 glass border border-border rounded-xl outline-none focus:border-primary" />
                  </div>
                </div>

                {/* TESLİMAT ADRESİ */}
                <div className="glass border border-border rounded-2xl p-6">
                  <h3 className="text-xl font-bold mb-4">Teslimat Adresi</h3>
                  <div className="space-y-4">
                    <input type="text" required value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} placeholder="Adres" className="w-full px-4 py-3 glass border border-border rounded-xl outline-none focus:border-primary" />
                    <div className="grid grid-cols-2 gap-4">
                      <input type="text" required value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} placeholder="Şehir" className="px-4 py-3 glass border border-border rounded-xl outline-none focus:border-primary" />
                      <input type="text" required value={formData.postalCode} onChange={(e) => setFormData({...formData, postalCode: e.target.value})} placeholder="Posta Kodu" className="px-4 py-3 glass border border-border rounded-xl outline-none focus:border-primary" />
                    </div>
                  </div>
                </div>

                {/* ÖDEME YÖNTEMİ */}
                <div className="glass border border-border rounded-2xl p-6">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><CreditCard className="w-5 h-5" />Ödeme Yöntemi</h3>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 p-4 glass border border-border rounded-xl cursor-pointer hover:border-primary">
                      <input type="radio" name="payment" value="credit_card" checked={formData.paymentMethod === "credit_card"} onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})} className="w-5 h-5" />
                      <span className="font-semibold">Kredi Kartı</span>
                    </label>
                    <label className="flex items-center gap-3 p-4 glass border border-border rounded-xl cursor-pointer hover:border-primary">
                      <input type="radio" name="payment" value="bank_transfer" checked={formData.paymentMethod === "bank_transfer"} onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})} className="w-5 h-5" />
                      <span className="font-semibold">Banka Transferi</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* SİPARİŞ ÖZETİ */}
              <div className="lg:col-span-1">
                <div className="glass border border-border rounded-2xl p-6 sticky top-24">
                  <h3 className="text-xl font-bold mb-4">Sipariş Özeti</h3>
                  <div className="space-y-3 mb-6">
                    {cart.map(item => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{item.product?.product_name} x{item.quantity}</span>
                        <span className="font-semibold">€{((item.product?.price || 0) * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="border-t border-border pt-3 flex justify-between"><span className="text-muted-foreground">Ara Toplam</span><span className="font-semibold">€{subtotal.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Kargo</span><span className="font-semibold">€{shipping.toFixed(2)}</span></div>
                    <div className="border-t border-border pt-3 flex justify-between text-lg"><span className="font-bold">Toplam</span><span className="font-bold text-primary">€{total.toFixed(2)}</span></div>
                  </div>
                  <button type="submit" disabled={submitting} className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
                    {submitting ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity }} className="w-5 h-5 border-2 border-white border-t-transparent rounded-full" /> : <><Lock className="w-5 h-5" />Siparişi Tamamla</>}
                  </button>
                  <p className="text-xs text-center text-muted-foreground mt-3">Güvenli ödeme</p>
                </div>
              </div>
            </div>
          </form>
        </div>
      </section>
    </div>
  )
}