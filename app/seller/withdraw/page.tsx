"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { CreditCard, Loader2, AlertCircle, ArrowLeft, Lock, Check } from "lucide-react"
import FloatingParticles from "@/components/floating-particles"
import Link from "next/link"

interface SellerSettings {
  card_last4: string
  card_brand: string
  card_verified: boolean
}

interface Balance {
  available_balance: number
  commission_rate: number
}

export default function PaymentMethodPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const userId = session?.user?.id

  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState(false)
  const [settings, setSettings] = useState<SellerSettings | null>(null)
  const [balance, setBalance] = useState<Balance | null>(null)

  const [cardData, setCardData] = useState({
    cardNumber: '',
    cardHolder: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: ''
  })

  useEffect(() => {
    if (userId) {
      loadData()
    }
  }, [userId])

  const loadData = async () => {
    try {
      const [settingsRes, balanceRes] = await Promise.all([
        fetch('/api/seller/settings', { headers: { 'x-user-id': userId! }}),
        fetch('/api/seller/balance', { headers: { 'x-user-id': userId! }})
      ])

      const settingsData = await settingsRes.json()
      const balanceData = await balanceRes.json()

      if (settingsRes.ok && settingsData.seller) {
        setSettings({
          card_last4: settingsData.seller.card_last4,
          card_brand: settingsData.seller.card_brand,
          card_verified: settingsData.seller.card_verified
        })
      }

      if (balanceRes.ok) setBalance(balanceData.balance)
    } catch (error) {
      console.error('Load data error:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '')
    const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned
    return formatted.substring(0, 19) // 16 digits + 3 spaces
  }

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value)
    setCardData({ ...cardData, cardNumber: formatted })
  }

  const handleVerifyCard = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return

    // Validate card data
    const cardNumberClean = cardData.cardNumber.replace(/\s/g, '')
    if (cardNumberClean.length !== 15 && cardNumberClean.length !== 16) {
      alert('Kart numarası 15 veya 16 haneli olmalı!')
      return
    }

    if (!cardData.cardHolder || cardData.cardHolder.length < 3) {
      alert('Kart sahibi adı gerekli!')
      return
    }

    if (!cardData.expiryMonth || !cardData.expiryYear) {
      alert('Son kullanma tarihi gerekli!')
      return
    }

    if (cardData.cvv.length < 3 || cardData.cvv.length > 4) {
      alert('CVV 3 veya 4 haneli olmalı!')
      return
    }

    setVerifying(true)
    try {
      const response = await fetch('/api/seller/verify-card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({
          cardNumber: cardNumberClean,
          cardHolder: cardData.cardHolder,
          expiryMonth: cardData.expiryMonth,
          expiryYear: cardData.expiryYear,
          cvv: cardData.cvv
        })
      })

      const data = await response.json()

      if (response.ok) {
        alert('✅ Kart başarıyla doğrulandı ve kaydedildi!')
        loadData() // Reload to show verified card
        setCardData({ cardNumber: '', cardHolder: '', expiryMonth: '', expiryYear: '', cvv: '' })
      } else {
        console.error('Card verification failed:', data)
        alert('❌ Kart doğrulama başarısız:\n' + (data.error || 'Bilinmeyen hata'))
      }
    } catch (error) {
      console.error('Card verification error:', error)
      alert('❌ Bir hata oluştu!')
    } finally {
      setVerifying(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const hasVerifiedCard = settings?.card_verified && settings?.card_last4

  return (
    <div className="min-h-screen relative overflow-hidden">
      <FloatingParticles />
      <section className="relative py-8 px-4">
        <div className="container mx-auto max-w-4xl">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Link
              href="/seller/finances"
              className="p-2 hover:bg-primary/10 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div>
              <h1 className="font-serif text-3xl font-bold">Ödeme yöntemi</h1>
              <p className="text-muted-foreground">Ödeme almak için kart bilgilerinizi doğrulayın</p>
            </div>
          </div>

          <div className="glass border border-border rounded-2xl overflow-hidden">
            {hasVerifiedCard ? (
              /* Verified Card Exists */
              <div className="p-8">
                <div className="flex items-center justify-center mb-6">
                  <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Check className="w-10 h-10 text-green-500" />
                  </div>
                </div>

                <h2 className="text-2xl font-bold text-center mb-2">Kart Doğrulandı</h2>
                <p className="text-center text-muted-foreground mb-8">
                  Ödeme almaya hazırsınız
                </p>

                {/* Card Display */}
                <div className="max-w-md mx-auto mb-8">
                  <div className="relative h-48 rounded-2xl overflow-hidden bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 p-6 shadow-2xl">
                    <div className="absolute top-4 right-4">
                      <Lock className="w-6 h-6 text-white/80" />
                    </div>

                    <div className="absolute bottom-6 left-6 right-6">
                      <p className="text-white/80 text-sm mb-2">{settings.card_brand || 'VISA'}</p>
                      <p className="text-white font-mono text-xl tracking-wider mb-4">
                        •••• •••• •••• {settings.card_last4}
                      </p>
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-white/60 text-xs">Doğrulandı</p>
                          <div className="flex items-center gap-1 mt-1">
                            <Check className="w-4 h-4 text-green-400" />
                            <span className="text-green-400 text-sm font-semibold">Aktif</span>
                          </div>
                        </div>
                        <div className="w-12 h-8 bg-white/20 rounded flex items-center justify-center">
                          <span className="text-white text-xs font-bold">CARD</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Available Balance & Withdrawal */}
                <div className="max-w-md mx-auto space-y-4">
                  <div className="p-4 glass border border-border rounded-xl">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-sm text-muted-foreground">Kullanılabilir Bakiye</p>
                      <p className="text-2xl font-bold text-green-500">€{balance?.available_balance.toFixed(2) || '0,00'}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Minimum çekim: €10.00
                    </p>
                  </div>

                  {/* Withdrawal Request Button */}
                  <button
                    onClick={() => router.push('/seller/request-withdrawal')}
                    disabled={(balance?.available_balance || 0) < 10}
                    className="w-full px-6 py-4 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {(balance?.available_balance || 0) < 10
                      ? 'Yetersiz Bakiye (Min. €10.00)'
                      : 'Ödeme Talep Et'}
                  </button>
                </div>

                {/* Info Box */}
                <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl max-w-md mx-auto">
                  <div className="flex gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-1">
                        💳 Ödeme Bilgisi
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Ödeme talepleriniz 1-3 iş günü içinde bu karta aktarılacaktır.
                        %{balance?.commission_rate || 15} platform komisyonu düşüldükten sonra net tutar kartınıza yatırılır.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Support Link */}
                <div className="mt-6 text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    Kart değiştirmek için destek ekibiyle iletişime geçin
                  </p>
                  <Link
                    href="/seller/support"
                    className="text-primary hover:underline text-sm font-semibold"
                  >
                    Destek Merkezi →
                  </Link>
                </div>
              </div>
            ) : (
              /* No Card - Verification Form */
              <div className="p-8">
                <div className="flex items-center justify-center mb-6">
                  <div className="w-24 h-24 glass border-2 border-dashed border-border rounded-xl flex items-center justify-center">
                    <CreditCard className="w-12 h-12 text-muted-foreground" />
                  </div>
                </div>

                <h2 className="text-2xl font-bold text-center mb-2">Kart Doğrulama</h2>
                <p className="text-center text-muted-foreground mb-8 max-w-lg mx-auto">
                  Ödeme alabilmek için kredi veya banka kartınızı doğrulayın.
                  Kartınız gerçek zamanlı olarak doğrulanacak ve güvenli şekilde kaydedilecektir.
                </p>

                {/* Card Form */}
                <form onSubmit={handleVerifyCard} className="max-w-md mx-auto space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Kart Numarası</label>
                    <input
                      type="text"
                      value={cardData.cardNumber}
                      onChange={handleCardNumberChange}
                      placeholder="1234 5678 9012 3456"
                      required
                      className="w-full px-4 py-3 glass border border-border rounded-xl outline-none focus:border-primary font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">Kart Sahibi Adı</label>
                    <input
                      type="text"
                      value={cardData.cardHolder}
                      onChange={(e) => setCardData({ ...cardData, cardHolder: e.target.value.toUpperCase() })}
                      placeholder="AD SOYAD"
                      required
                      className="w-full px-4 py-3 glass border border-border rounded-xl outline-none focus:border-primary uppercase"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2">Ay</label>
                      <input
                        type="text"
                        value={cardData.expiryMonth}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').substring(0, 2)
                          if (val === '' || (parseInt(val) >= 1 && parseInt(val) <= 12)) {
                            setCardData({ ...cardData, expiryMonth: val })
                          }
                        }}
                        placeholder="MM"
                        required
                        maxLength={2}
                        className="w-full px-4 py-3 glass border border-border rounded-xl outline-none focus:border-primary text-center font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">Yıl</label>
                      <input
                        type="text"
                        value={cardData.expiryYear}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').substring(0, 2)
                          setCardData({ ...cardData, expiryYear: val })
                        }}
                        placeholder="YY"
                        required
                        maxLength={2}
                        className="w-full px-4 py-3 glass border border-border rounded-xl outline-none focus:border-primary text-center font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">CVV</label>
                      <input
                        type="text"
                        value={cardData.cvv}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').substring(0, 3)
                          setCardData({ ...cardData, cvv: val })
                        }}
                        placeholder="123"
                        required
                        maxLength={3}
                        className="w-full px-4 py-3 glass border border-border rounded-xl outline-none focus:border-primary text-center font-mono"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={verifying}
                    className="w-full px-6 py-4 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {verifying ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Doğrulanıyor...
                      </>
                    ) : (
                      <>
                        <Lock className="w-5 h-5" />
                        Kartı Doğrula ve Kaydet
                      </>
                    )}
                  </button>
                </form>

                {/* Security Info */}
                <div className="mt-8 space-y-3 max-w-md mx-auto">
                  <div className="p-4 glass border border-green-500/30 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                        <Lock className="w-5 h-5 text-green-500" />
                      </div>
                      <p className="text-sm">256-bit SSL şifreleme ile korunuyor</p>
                    </div>
                  </div>

                  <div className="p-4 glass border border-green-500/30 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                        <Check className="w-5 h-5 text-green-500" />
                      </div>
                      <p className="text-sm">PCI DSS sertifikalı güvenli ödeme sistemi</p>
                    </div>
                  </div>

                  <div className="p-4 glass border border-green-500/30 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                        <AlertCircle className="w-5 h-5 text-green-500" />
                      </div>
                      <p className="text-sm">Kart bilgileriniz asla paylaşılmaz</p>
                    </div>
                  </div>
                </div>

                {/* Payment Icons */}
                <div className="mt-6 flex items-center justify-center gap-3">
                  <div className="px-3 py-2 glass border border-border rounded flex items-center justify-center">
                    <span className="text-xs font-bold">VISA</span>
                  </div>
                  <div className="px-3 py-2 glass border border-border rounded flex items-center justify-center">
                    <span className="text-xs font-bold">MASTERCARD</span>
                  </div>
                  <div className="px-3 py-2 glass border border-border rounded flex items-center justify-center">
                    <span className="text-xs font-bold">AMEX</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
