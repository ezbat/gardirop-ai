"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Download, Loader2, CreditCard, ArrowLeft, Euro, AlertCircle, TrendingDown } from "lucide-react"
import FloatingParticles from "@/components/floating-particles"
import Link from "next/link"

interface Balance {
  available_balance: number
  commission_rate: number
}

interface CardInfo {
  card_last4: string
  card_brand: string
  card_verified: boolean
}

export default function RequestWithdrawalPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const userId = session?.user?.id

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [balance, setBalance] = useState<Balance | null>(null)
  const [cardInfo, setCardInfo] = useState<CardInfo | null>(null)
  const [amount, setAmount] = useState('')

  useEffect(() => {
    if (userId) {
      loadData()
    }
  }, [userId])

  const loadData = async () => {
    try {
      const [balanceRes, settingsRes] = await Promise.all([
        fetch('/api/seller/balance', { headers: { 'x-user-id': userId! }}),
        fetch('/api/seller/settings', { headers: { 'x-user-id': userId! }})
      ])

      const balanceData = await balanceRes.json()
      const settingsData = await settingsRes.json()

      if (balanceRes.ok) setBalance(balanceData.balance)

      if (settingsRes.ok && settingsData.seller) {
        setCardInfo({
          card_last4: settingsData.seller.card_last4,
          card_brand: settingsData.seller.card_brand,
          card_verified: settingsData.seller.card_verified
        })
      }
    } catch (error) {
      console.error('Load data error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return

    const withdrawAmount = parseFloat(amount)

    if (withdrawAmount < 10) {
      alert('Minimum çekim tutarı €10.00')
      return
    }

    if (withdrawAmount > (balance?.available_balance || 0)) {
      alert('Yetersiz bakiye!')
      return
    }

    if (!cardInfo?.card_verified) {
      alert('Önce kartınızı doğrulamalısınız!')
      router.push('/seller/withdraw')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/seller/request-payout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({
          amount: withdrawAmount
        })
      })

      const data = await response.json()

      if (response.ok) {
        alert(`✅ Ödeme talebi oluşturuldu!\n\nTalep Edilen: €${withdrawAmount.toFixed(2)}\nKomisyon: €${data.commission.amount.toFixed(2)}\nAlacağınız: €${data.commission.net_amount.toFixed(2)}\n\n1-3 iş günü içinde kartınıza aktarılacaktır.`)
        router.push('/seller/finances')
      } else {
        alert('❌ Hata: ' + (data.error || 'Bilinmeyen hata'))
      }
    } catch (error) {
      console.error('Request payout error:', error)
      alert('❌ Bir hata oluştu!')
    } finally {
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

  if (!cardInfo?.card_verified) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <FloatingParticles />
        <section className="relative py-8 px-4">
          <div className="container mx-auto max-w-4xl">
            <div className="glass border border-border rounded-2xl p-8 text-center">
              <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Önce Kart Doğrulama Gerekli</h2>
              <p className="text-muted-foreground mb-6">
                Ödeme talep edebilmek için önce kartınızı doğrulamalısınız.
              </p>
              <Link
                href="/seller/withdraw"
                className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-colors"
              >
                Kart Doğrulamaya Git
              </Link>
            </div>
          </div>
        </section>
      </div>
    )
  }

  const commissionRate = balance?.commission_rate || 15
  const requestedAmount = parseFloat(amount) || 0
  const commissionAmount = (requestedAmount * commissionRate) / 100
  const netAmount = requestedAmount - commissionAmount

  return (
    <div className="min-h-screen relative overflow-hidden">
      <FloatingParticles />
      <section className="relative py-8 px-4">
        <div className="container mx-auto max-w-3xl">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Link
              href="/seller/withdraw"
              className="p-2 hover:bg-primary/10 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div>
              <h1 className="font-serif text-3xl font-bold">Ödeme Talep Et</h1>
              <p className="text-muted-foreground">Kazancınızı kartınıza çekin</p>
            </div>
          </div>

          <div className="glass border border-border rounded-2xl overflow-hidden">
            <div className="p-8">
              {/* Balance Info */}
              <div className="mb-8">
                <div className="p-6 glass border border-border rounded-xl">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm text-muted-foreground">Kullanılabilir Bakiye</p>
                    <p className="text-3xl font-bold text-green-500">€{balance?.available_balance.toFixed(2) || '0,00'}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">Minimum çekim: €10.00</p>
                </div>
              </div>

              {/* Card Info */}
              <div className="mb-8">
                <p className="text-sm font-semibold mb-3">Ödeme alacak kart:</p>
                <div className="p-4 glass border border-border rounded-xl flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-800 flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{cardInfo.card_brand}</p>
                    <p className="text-sm text-muted-foreground font-mono">•••• •••• •••• {cardInfo.card_last4}</p>
                  </div>
                  <div className="px-3 py-1 bg-green-500/20 text-green-500 rounded-full text-xs font-semibold">
                    Doğrulandı
                  </div>
                </div>
              </div>

              {/* Withdrawal Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold mb-2">Çekim Tutarı (€)</label>
                  <div className="relative">
                    <Euro className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="number"
                      step="0.01"
                      min="10"
                      max={balance?.available_balance || 0}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                      className="w-full pl-12 pr-4 py-4 glass border border-border rounded-xl outline-none focus:border-primary text-2xl font-bold"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setAmount(((balance?.available_balance || 0) * 0.25).toFixed(2))}
                      className="px-3 py-1 glass border border-border rounded-lg text-xs hover:bg-primary/10 transition-colors"
                    >
                      25%
                    </button>
                    <button
                      type="button"
                      onClick={() => setAmount(((balance?.available_balance || 0) * 0.5).toFixed(2))}
                      className="px-3 py-1 glass border border-border rounded-lg text-xs hover:bg-primary/10 transition-colors"
                    >
                      50%
                    </button>
                    <button
                      type="button"
                      onClick={() => setAmount(((balance?.available_balance || 0) * 0.75).toFixed(2))}
                      className="px-3 py-1 glass border border-border rounded-lg text-xs hover:bg-primary/10 transition-colors"
                    >
                      75%
                    </button>
                    <button
                      type="button"
                      onClick={() => setAmount((balance?.available_balance || 0).toFixed(2))}
                      className="px-3 py-1 glass border border-border rounded-lg text-xs hover:bg-primary/10 transition-colors"
                    >
                      Tümü
                    </button>
                  </div>
                </div>

                {/* Breakdown */}
                {requestedAmount >= 10 && (
                  <div className="p-4 glass border border-primary/30 rounded-xl bg-primary/5 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Talep Edilen Tutar</span>
                      <span className="font-semibold">€{requestedAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Platform Komisyonu ({commissionRate}%)</span>
                      <span className="font-semibold text-red-500">-€{commissionAmount.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-border pt-2 flex justify-between">
                      <span className="font-bold">Kartınıza Yatacak</span>
                      <span className="text-xl font-bold text-green-500">€{netAmount.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submitting || requestedAmount < 10}
                  className="w-full px-6 py-4 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      İşlem Yapılıyor...
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      Ödeme Talep Et
                    </>
                  )}
                </button>
              </form>

              {/* Info */}
              <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                <div className="flex gap-3">
                  <TrendingDown className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold text-blue-600 dark:text-blue-400 mb-1">Ödeme Süreci</p>
                    <ul className="text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Talebiniz oluşturulduktan sonra admin onayına gönderilir</li>
                      <li>Onaylandıktan sonra 1-3 iş günü içinde kartınıza aktarılır</li>
                      <li>%{commissionRate} platform komisyonu otomatik düşülür</li>
                      <li>İşlem durumunu "Ödemeler" sayfasından takip edebilirsiniz</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
