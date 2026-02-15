'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle2, Package, Truck, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/lib/language-context'
import FloatingParticles from '@/components/floating-particles'
import Link from 'next/link'

function OrderConfirmationContent() {
  const { t } = useLanguage()
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')

  const [loading, setLoading] = useState(true)
  const [order, setOrder] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [pollingAttempt, setPollingAttempt] = useState(0)

  useEffect(() => {
    if (sessionId) {
      pollForOrder(sessionId)
    } else {
      setError('Invalid confirmation link - missing session ID')
      setLoading(false)
    }
  }, [sessionId])

  const pollForOrder = async (sessionId: string) => {
    const maxAttempts = 10
    const delayMs = 1000

    try {
      for (let i = 0; i < maxAttempts; i++) {
        setPollingAttempt(i + 1)

        console.log(`🔄 Polling for order (attempt ${i + 1}/${maxAttempts})...`)

        // Query order by stripe_checkout_session_id
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .select('*')
          .eq('stripe_checkout_session_id', sessionId)
          .single()

        if (orderData) {
          console.log('✅ Order found:', orderData.id)
          setOrder(orderData)
          setLoading(false)

          // Clear cart on successful order
          localStorage.removeItem('cart')
          return
        }

        // If not found yet, wait and retry
        if (i < maxAttempts - 1) {
          await new Promise(resolve => setTimeout(resolve, delayMs))
        }
      }

      // Timeout after max attempts
      console.error('⏱️ Order creation timeout')
      setError('Order creation is taking longer than expected. Please check your email or contact support with session ID: ' + sessionId.slice(-8))
      setLoading(false)
    } catch (err: any) {
      console.error('❌ Polling error:', err)
      setError(err.message || 'Failed to verify payment')
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-center max-w-md">
          <Loader2 className="w-16 h-16 animate-spin text-primary mb-6 mx-auto" />
          <h2 className="text-2xl font-bold mb-3">Processing your order...</h2>
          <p className="text-muted-foreground mb-2">
            This usually takes a few seconds
          </p>
          {pollingAttempt > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <div className="flex gap-1">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        i < pollingAttempt ? 'bg-primary' : 'bg-muted'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Attempt {pollingAttempt} of 10
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
            <Package className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold mb-2">{t('error')}</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Link
            href="/store"
            className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 inline-block"
          >
            {t('continueShopping')}
          </Link>
        </div>
      </div>
    )
  }

  const isPaid = order?.payment_status === 'paid' || sessionId // If redirected from Stripe, consider it paid

  return (
    <div className="min-h-screen relative overflow-hidden">
      <FloatingParticles />
      <section className="relative py-12 px-4">
        <div className="container mx-auto max-w-2xl">
          <div className="glass border border-border rounded-2xl p-8 text-center">
            {/* Success Icon */}
            <div className={`w-20 h-20 rounded-full ${isPaid ? 'bg-green-100 dark:bg-green-900/20' : 'bg-yellow-100 dark:bg-yellow-900/20'} flex items-center justify-center mx-auto mb-6`}>
              <CheckCircle2 className={`w-12 h-12 ${isPaid ? 'text-green-500' : 'text-yellow-500'}`} />
            </div>

            {/* Title */}
            <h1 className="font-serif text-3xl font-bold mb-3">
              {t('orderSuccess')}
            </h1>

            {/* Order Number */}
            <p className="text-muted-foreground mb-2">
              {t('orderNumber')}: <span className="font-mono font-semibold">{order?.id?.slice(0, 8).toUpperCase()}</span>
            </p>

            {/* Payment Status */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 mb-8">
              <div className="w-2 h-2 rounded-full bg-green-600 dark:bg-green-400" />
              <span className="text-sm font-semibold">
                {t('orderSuccess')}
              </span>
            </div>

            {/* Order Details */}
            <div className="glass border border-border rounded-xl p-6 mb-6 text-left">
              <h3 className="font-bold mb-4">{t('orderDetails')}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('total')}</span>
                  <span className="font-semibold">€{order?.total_amount?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('orderStatus')}</span>
                  <span className="font-semibold capitalize">{order?.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('paymentMethod')}</span>
                  <span className="font-semibold">Stripe</span>
                </div>
              </div>
            </div>

            {/* Next Steps */}
            <div className="glass border border-border rounded-xl p-6 mb-6 text-left">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Truck className="w-5 h-5 text-primary" />
                {t('trackOrder')}
              </h3>
              <p className="text-sm text-muted-foreground">
                {isPaid
                  ? 'Siparişiniz hazırlanıyor. Kargoya verildiğinde e-posta ile bilgilendirileceksiniz.'
                  : 'Ödemeniz işleniyor. Onaylandığında siparişiniz hazırlanmaya başlanacak.'
                }
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href={`/orders/${order?.id}`}
                className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity"
              >
                {t('orderDetails')}
              </Link>
              <Link
                href="/store"
                className="flex-1 px-6 py-3 glass border border-border rounded-xl font-semibold hover:border-primary transition-colors"
              >
                {t('continueShopping')}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default function OrderConfirmationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    }>
      <OrderConfirmationContent />
    </Suspense>
  )
}
