"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { motion } from "framer-motion"
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight } from "lucide-react"
import Link from "next/link"
import FloatingParticles from "@/components/floating-particles"
import { getCart, updateCartQuantity, removeFromCart, type CartItem } from "@/lib/cart"

export default function CartPage() {
  const { data: session } = useSession()
  const userId = session?.user?.id

  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)

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

  const handleUpdateQuantity = async (cartItemId: string, newQuantity: number) => {
    if (newQuantity < 1) return
    const success = await updateCartQuantity(cartItemId, newQuantity)
    if (success) {
      setCart(prev => prev.map(item => 
        item.id === cartItemId ? { ...item, quantity: newQuantity } : item
      ))
    }
  }

  const handleRemove = async (cartItemId: string) => {
    if (!confirm('Bu ürünü sepetten çıkarmak istediğinize emin misiniz?')) return
    const success = await removeFromCart(cartItemId)
    if (success) {
      setCart(prev => prev.filter(item => item.id !== cartItemId))
    }
  }

  const subtotal = cart.reduce((sum, item) => sum + (item.product?.price || 0) * item.quantity, 0)
  const shipping = subtotal > 0 ? 9.99 : 0
  const total = subtotal + shipping

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-9xl mb-6">🔒</div>
          <h2 className="text-2xl font-bold mb-4">Giriş Yapmalısınız</h2>
          <p className="text-muted-foreground mb-6">Sepetinizi görmek için lütfen giriş yapın</p>
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

  return (
    <div className="min-h-screen relative overflow-hidden">
      <FloatingParticles />
      <section className="relative py-8 px-4">
        <div className="container mx-auto max-w-6xl">
          <h1 className="font-serif text-4xl font-bold mb-8">Sepetim</h1>

          {cart.length === 0 ? (
            <div className="text-center py-20 glass border border-border rounded-2xl">
              <div className="text-9xl mb-6">🛒</div>
              <h3 className="text-2xl font-bold mb-3">Sepetiniz boş</h3>
              <p className="text-muted-foreground mb-6">Mağazadan ürün ekleyerek başlayın!</p>
              <Link href="/store" className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 inline-block">Mağazaya Git</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                {cart.map((item) => (
                  <motion.div key={item.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass border border-border rounded-2xl p-4 flex gap-4">
                    <div className="w-24 h-24 rounded-xl overflow-hidden bg-primary/5 flex-shrink-0">
                      <img src={item.product?.image_url} alt={item.product?.product_name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg mb-1">{item.product?.product_name}</h3>
                      <p className="text-sm text-muted-foreground mb-3">{item.product?.store_name}</p>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 glass border border-border rounded-lg">
                          <button onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)} disabled={item.quantity <= 1} className="p-2 hover:bg-secondary rounded-lg disabled:opacity-50"><Minus className="w-4 h-4" /></button>
                          <span className="w-8 text-center font-semibold">{item.quantity}</span>
                          <button onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)} className="p-2 hover:bg-secondary rounded-lg"><Plus className="w-4 h-4" /></button>
                        </div>
                        <p className="text-xl font-bold">€{((item.product?.price || 0) * item.quantity).toFixed(2)}</p>
                      </div>
                    </div>
                    <button onClick={() => handleRemove(item.id)} className="p-2 glass border border-border rounded-lg hover:border-red-500 hover:text-red-500 h-fit"><Trash2 className="w-5 h-5" /></button>
                  </motion.div>
                ))}
              </div>

              <div className="lg:col-span-1">
                <div className="glass border border-border rounded-2xl p-6 sticky top-24">
                  <h3 className="text-xl font-bold mb-4">Sipariş Özeti</h3>
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between"><span className="text-muted-foreground">Ara Toplam</span><span className="font-semibold">€{subtotal.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Kargo</span><span className="font-semibold">€{shipping.toFixed(2)}</span></div>
                    <div className="border-t border-border pt-3 flex justify-between text-lg"><span className="font-bold">Toplam</span><span className="font-bold text-primary">€{total.toFixed(2)}</span></div>
                  </div>
                  <Link href="/checkout" className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 flex items-center justify-center gap-2">
                    <ShoppingBag className="w-5 h-5" />Ödemeye Geç<ArrowRight className="w-5 h-5" />
                  </Link>
                  <Link href="/store" className="w-full mt-3 px-6 py-3 glass border border-border rounded-xl font-semibold hover:border-primary flex items-center justify-center">Alışverişe Devam</Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}