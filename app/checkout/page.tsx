'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowLeft, MapPin, CreditCard, Truck, Loader2, Package } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import FloatingParticles from '@/components/floating-particles'
import { useLanguage } from '@/lib/language-context'

interface CartItem {
  id: string
  product: any
  quantity: number
  selectedSize?: string
}

export default function CheckoutPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const { data: session, status } = useSession()
  const userId = session?.user?.id

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [cartItems, setCartItems] = useState<CartItem[]>([])

  const [shippingInfo, setShippingInfo] = useState({
    fullName: '',
    phone: '',
    address: '',
    city: '',
    district: '',
    postalCode: ''
  })

 const paymentMethod = 'credit_card'

  useEffect(() => {
    // Wait for session to load
    if (status === 'loading') return

    // Check authentication
    if (!userId) {
      alert(t('pleaseLogin'))
      router.push('/auth/signin')
      return
    }

    // Check if express checkout (URL params)
    const params = new URLSearchParams(window.location.search)
    const productId = params.get('product')
    const quantity = parseInt(params.get('quantity') || '1')

    if (productId) {
      // Express checkout - load single product
      loadExpressProduct(productId, quantity)
    } else {
      // Normal checkout - load cart
      loadCart()
    }
  }, [userId, status])

  const loadExpressProduct = async (productId: string, quantity: number) => {
    try {
      const { data: product, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single()

      if (error) throw error

      // Create cart item from product
      const cartItem = {
        id: productId,
        product: product,
        quantity: quantity,
        selectedSize: undefined
      }

      setCartItems([cartItem])
      setLoading(false)
    } catch (error) {
      console.error('Error loading product:', error)
      alert('Product not found')
      router.push('/explore')
    }
  }

  const loadCart = () => {
    const saved = localStorage.getItem('cart')
    if (saved) {
      const items = JSON.parse(saved)
      if (items.length === 0) {
        alert(t('emptyCart'))
        router.push('/cart')
        return
      }
      setCartItems(items)
    } else {
      alert(t('emptyCart'))
      router.push('/cart')
      return
    }
    setLoading(false)
  }

  const calculateSubtotal = () => {
    return cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0)
  }

  const calculateShipping = () => {
    return calculateSubtotal() >= 100 ? 0 : 10
  }

  const calculateTotal = () => {
    return calculateSubtotal() + calculateShipping()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return

    setSubmitting(true)
    try {
      console.log('🚀 Creating Stripe checkout session...')

      // Prepare cart items for Stripe
      const cartItemsForStripe = cartItems.map(item => ({
        product_id: item.product.id,
        title: item.product.title,
        price: item.product.price,
        quantity: item.quantity,
        images: item.product.images,
        brand: item.product.brand,
        seller_id: item.product.seller_id,
      }))

      // Create Stripe checkout session
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartItems: cartItemsForStripe,
          userId: userId,
          shippingAddress: {
            ...shippingInfo,
            email: session?.user?.email || '',
          },
        })
      })

      const result = await response.json()
      console.log('📦 Stripe session result:', result)

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create checkout session')
      }

      // Redirect to Stripe Checkout
      if (result.url) {
        window.location.href = result.url
      } else {
        throw new Error('No checkout URL received')
      }
    } catch (error: any) {
      console.error('Checkout error:', error)
      alert(t('orderError') + ': ' + (error.message || t('unknownError')))
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <Package className="w-20 h-20 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-4">{t('emptyCart')}</h2>
        <button onClick={() => router.push('/store')} className="px-6 py-3 bg-primary text-primary-foreground rounded-xl">
          {t('continueShopping')}
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <FloatingParticles />
      <section className="relative py-8 px-4">
        <div className="container mx-auto max-w-6xl">
          <button onClick={() => router.back()} className="flex items-center gap-2 mb-6 hover:text-primary transition-colors">
            <ArrowLeft className="w-5 h-5" />
            {t('back')}
          </button>

          <h1 className="font-serif text-4xl font-bold mb-8">{t('checkout')}</h1>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left: Form */}
            <div className="lg:col-span-2 space-y-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Shipping Info */}
                <div className="glass border border-border rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <MapPin className="w-5 h-5 text-primary" />
                    <h2 className="text-xl font-bold">{t('shippingInfo')}</h2>
                  </div>
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder={t('fullName') + ' *'}
                      value={shippingInfo.fullName}
                      onChange={(e) => setShippingInfo({...shippingInfo, fullName: e.target.value})}
                      required
                      className="w-full px-4 py-3 glass border border-border rounded-xl outline-none focus:border-primary"
                    />
                    <input
                      type="tel"
                      placeholder={t('phone') + ' *'}
                      value={shippingInfo.phone}
                      onChange={(e) => setShippingInfo({...shippingInfo, phone: e.target.value})}
                      required
                      className="w-full px-4 py-3 glass border border-border rounded-xl outline-none focus:border-primary"
                    />
                    <textarea
                      placeholder={t('address') + ' *'}
                      value={shippingInfo.address}
                      onChange={(e) => setShippingInfo({...shippingInfo, address: e.target.value})}
                      required
                      rows={3}
                      className="w-full px-4 py-3 glass border border-border rounded-xl outline-none focus:border-primary resize-none"
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <input
                        type="text"
                        placeholder={t('city') + ' *'}
                        value={shippingInfo.city}
                        onChange={(e) => setShippingInfo({...shippingInfo, city: e.target.value})}
                        required
                        className="w-full px-4 py-3 glass border border-border rounded-xl outline-none focus:border-primary"
                      />
                      <input
                        type="text"
                        placeholder={t('district') + ' *'}
                        value={shippingInfo.district}
                        onChange={(e) => setShippingInfo({...shippingInfo, district: e.target.value})}
                        required
                        className="w-full px-4 py-3 glass border border-border rounded-xl outline-none focus:border-primary"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder={t('postalCode')}
                      value={shippingInfo.postalCode}
                      onChange={(e) => setShippingInfo({...shippingInfo, postalCode: e.target.value})}
                      className="w-full px-4 py-3 glass border border-border rounded-xl outline-none focus:border-primary"
                    />
                  </div>
                </div>

                {/* Payment Method */}
               {/* Payment Method */}
<div className="glass border border-border rounded-2xl p-6">
  <div className="flex items-center gap-3 mb-4">
    <CreditCard className="w-5 h-5 text-primary" />
    <h2 className="text-xl font-bold">{t('paymentMethod')}</h2>
  </div>
  <div className="p-4 glass border border-primary rounded-xl">
    <div className="flex items-center gap-3">
      <CreditCard className="w-6 h-6 text-primary" />
      <div>
        <p className="font-semibold">{t('creditCard')}</p>
        <p className="text-sm text-muted-foreground">{t('securePayment')}</p>
      </div>
    </div>
  </div>
</div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full px-6 py-4 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                  {submitting ? t('placingOrder') : t('placeOrder')}
                </button>
              </form>
            </div>

            {/* Right: Order Summary */}
            <div className="glass border border-border rounded-2xl p-6 h-fit sticky top-8">
              <h2 className="text-xl font-bold mb-4">{t('orderSummary')}</h2>
              <div className="space-y-3 mb-4">
                {cartItems.map(item => (
                  <div key={item.id} className="flex gap-3 pb-3 border-b border-border last:border-0">
                    <img src={item.product.images[0]} alt={item.product.title} className="w-16 h-16 object-cover rounded-lg" />
                    <div className="flex-1">
                      <p className="font-semibold text-sm line-clamp-1">{item.product.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.selectedSize} × {item.quantity}
                      </p>
                      <p className="text-sm font-bold text-primary">€{(item.product.price * item.quantity).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-border pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{t('subtotal')}</span>
                  <span>€{calculateSubtotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>{t('shipping')}</span>
                  <span className={calculateShipping() === 0 ? 'text-green-500 font-semibold' : ''}>
                    {calculateShipping() === 0 ? t('freeShipping') : `€${calculateShipping().toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-border">
                  <span>{t('total')}</span>
                  <span className="text-primary">€{calculateTotal().toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}