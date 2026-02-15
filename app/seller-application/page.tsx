"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Store, Loader2, Clock, XCircle, ArrowRight, CheckCircle } from "lucide-react"
import FloatingParticles from "@/components/floating-particles"

export default function SellerApplicationPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const userId = session?.user?.id

  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<any>(null)

  useEffect(() => {
    if (userId) {
      checkSellerStatus()
    } else {
      setLoading(false)
    }
  }, [userId])

  const checkSellerStatus = async () => {
    console.log('🔍 [SELLER APPLY] checkSellerStatus called, userId:', userId)
    if (!userId) {
      console.log('❌ [SELLER APPLY] No userId, stopping')
      setLoading(false)
      return
    }

    try {
      console.log('📡 [SELLER APPLY] Fetching seller status...')
      const response = await fetch('/api/seller/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })
      const data = await response.json()
      console.log('📦 [SELLER APPLY] Response:', data)
      setStatus(data)

      if (data.isSeller) {
        console.log('✅ [SELLER APPLY] User is seller, redirecting to dashboard')
        router.push('/seller/dashboard')
      } else {
        console.log('✅ [SELLER APPLY] User is NOT seller, staying on page')
      }
    } catch (error) {
      console.error('❌ [SELLER APPLY] Check status error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  // Başvuru durumu kontrolü
  if (status?.application) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-background to-secondary/20">
        <FloatingParticles />
        <section className="relative py-20 px-4">
          <div className="container mx-auto max-w-2xl">
            <div className="glass border border-border rounded-3xl p-8 text-center">
              {status.application.status === 'pending' && (
                <>
                  <Clock className="w-20 h-20 text-yellow-500 mx-auto mb-6" />
                  <h1 className="text-3xl font-bold mb-4">Başvurunuz İnceleniyor</h1>
                  <p className="text-muted-foreground mb-6">
                    Başvurunuz {new Date(status.application.applied_at).toLocaleDateString('tr-TR')} tarihinde alındı.
                    En kısa sürede değerlendirip size dönüş yapacağız.
                  </p>
                  <div className="bg-secondary/50 rounded-2xl p-6 text-left">
                    <p className="font-semibold mb-2">Mağaza Adı:</p>
                    <p className="text-muted-foreground mb-4">{status.application.shop_name}</p>
                    <p className="font-semibold mb-2">Telefon:</p>
                    <p className="text-muted-foreground">{status.application.phone}</p>
                  </div>
                </>
              )}

              {status.application.status === 'rejected' && (
                <>
                  <XCircle className="w-20 h-20 text-red-500 mx-auto mb-6" />
                  <h1 className="text-3xl font-bold mb-4">Başvurunuz Reddedildi</h1>
                  <p className="text-muted-foreground mb-6">
                    {status.application.rejection_reason || 'Başvurunuz incelendi ancak şu anda onaylanamadı.'}
                  </p>
                  <button
                    onClick={() => router.push('/seller-application/step-1')}
                    className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity"
                  >
                    Yeniden Başvur
                  </button>
                </>
              )}
            </div>
          </div>
        </section>
      </div>
    )
  }

  // Başvuru formu ana sayfa
  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-background to-secondary/20">
      <FloatingParticles />

      <section className="relative py-20 px-4">
        <div className="container mx-auto max-w-5xl">
          {/* Header */}
          <div className="text-center mb-12">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-full mb-6"
            >
              <Store className="w-10 h-10 text-primary" />
            </motion.div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Satıcı Ol</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Ürünlerinizi binlerce müşteriye ulaştırın. Başvuru süreciniz 5 basit adımdan oluşuyor.
            </p>
          </div>

          {/* Steps Preview */}
          <div className="grid md:grid-cols-5 gap-4 mb-12">
            {[
              { number: 1, title: 'Kişisel Bilgiler', icon: '👤' },
              { number: 2, title: 'Mağaza Bilgileri', icon: '🏪' },
              { number: 3, title: 'Banka & Vergi', icon: '💳' },
              { number: 4, title: 'Belgeler', icon: '📄' },
              { number: 5, title: 'Onay', icon: '✅' },
            ].map((step) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: step.number * 0.1 }}
                className="glass border border-border rounded-2xl p-6 text-center hover:scale-105 transition-transform"
              >
                <div className="text-4xl mb-3">{step.icon}</div>
                <div className="text-2xl font-bold text-primary mb-2">{step.number}</div>
                <p className="text-sm font-medium">{step.title}</p>
              </motion.div>
            ))}
          </div>

          {/* Benefits */}
          <div className="glass border border-border rounded-3xl p-8 mb-8">
            <h2 className="text-2xl font-bold mb-6 text-center">Neden Kombin'de Satış Yapmalısınız?</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="flex gap-4">
                <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold mb-2">Geniş Müşteri Kitlesi</h3>
                  <p className="text-sm text-muted-foreground">Binlerce aktif kullanıcıya ürünlerinizi sergileyin</p>
                </div>
              </div>
              <div className="flex gap-4">
                <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold mb-2">Güvenli Ödeme</h3>
                  <p className="text-sm text-muted-foreground">Stripe Connect ile güvenli ve hızlı ödemeler</p>
                </div>
              </div>
              <div className="flex gap-4">
                <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold mb-2">Düşük Komisyon</h3>
                  <p className="text-sm text-muted-foreground">Sadece %15 platform komisyonu</p>
                </div>
              </div>
            </div>
          </div>

          {/* Start Button */}
          <div className="text-center">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push('/seller-application/step-1')}
              className="inline-flex items-center gap-3 px-8 py-4 bg-primary text-primary-foreground rounded-2xl font-bold text-lg hover:opacity-90 transition-opacity shadow-lg shadow-primary/50"
            >
              Başvuruya Başla
              <ArrowRight className="w-6 h-6" />
            </motion.button>
            <p className="text-sm text-muted-foreground mt-4">
              Başvurunuz 2-3 iş günü içinde değerlendirilecektir
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
