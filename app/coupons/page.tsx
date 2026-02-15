"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Gift, Copy, Check, Loader2, Tag, Calendar } from "lucide-react"
import FloatingParticles from "@/components/floating-particles"
import { useLanguage } from "@/lib/language-context"

interface Coupon {
  id: string
  code: string
  discount_type: string
  discount_value: number
  min_purchase_amount: number
  max_discount_amount: number
  valid_until: string
  usage_limit: number
  used_count: number
}

export default function CouponsPage() {
  const { data: session } = useSession()
  const { t } = useLanguage()
  const userId = session?.user?.id

  const [loading, setLoading] = useState(true)
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  useEffect(() => {
    loadCoupons()
  }, [])

  const loadCoupons = async () => {
    try {
      // Şimdilik mock data, API hazır olunca değiştirilecek
      const mockCoupons: Coupon[] = [
        {
          id: '1',
          code: 'WELCOME10',
          discount_type: 'percentage',
          discount_value: 10,
          min_purchase_amount: 50,
          max_discount_amount: 20,
          valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          usage_limit: 100,
          used_count: 23
        },
        {
          id: '2',
          code: 'SUMMER30',
          discount_type: 'percentage',
          discount_value: 30,
          min_purchase_amount: 100,
          max_discount_amount: 50,
          valid_until: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
          usage_limit: 50,
          used_count: 12
        },
        {
          id: '3',
          code: 'FREESHIP',
          discount_type: 'fixed_amount',
          discount_value: 5,
          min_purchase_amount: 0,
          max_discount_amount: 5,
          valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          usage_limit: 200,
          used_count: 87
        }
      ]
      setCoupons(mockCoupons)
    } catch (error) {
      console.error('Load coupons error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <FloatingParticles />
      <section className="relative py-8 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-8">
            <Gift className="w-16 h-16 text-primary mx-auto mb-4" />
            <h1 className="font-serif text-4xl font-bold mb-2">Aktive Gutscheine</h1>
            <p className="text-muted-foreground">Spare Geld mit unseren exklusiven Codes</p>
          </div>

          {/* Coupons Grid */}
          <div className="space-y-4">
            {coupons.length === 0 ? (
              <div className="text-center py-12 glass border border-border rounded-2xl">
                <Gift className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Derzeit keine Gutscheine verfügbar</p>
              </div>
            ) : (
              coupons.map((coupon) => {
                const daysLeft = Math.ceil((new Date(coupon.valid_until).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                const percentUsed = Math.round((coupon.used_count / coupon.usage_limit) * 100)

                return (
                  <div key={coupon.id} className="glass border border-border rounded-2xl p-6 hover:border-primary transition-colors">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center">
                            <Tag className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold">{coupon.code}</h3>
                            <p className="text-sm text-muted-foreground">
                              {coupon.discount_type === 'percentage'
                                ? `${coupon.discount_value}% Rabatt`
                                : `€${coupon.discount_value} Rabatt`}
                            </p>
                          </div>
                        </div>

                        {/* Conditions */}
                        <div className="space-y-1 text-sm text-muted-foreground mb-3">
                          {coupon.min_purchase_amount > 0 && (
                            <p>• Mindesteinkauf: €{coupon.min_purchase_amount}</p>
                          )}
                          {coupon.max_discount_amount > 0 && coupon.discount_type === 'percentage' && (
                            <p>• Max. Rabatt: €{coupon.max_discount_amount}</p>
                          )}
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-3">
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                            <span>{coupon.used_count} von {coupon.usage_limit} verwendet</span>
                            <span>{percentUsed}%</span>
                          </div>
                          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-primary to-purple-500 transition-all"
                              style={{ width: `${percentUsed}%` }}
                            />
                          </div>
                        </div>

                        {/* Expiry */}
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className={`${daysLeft <= 3 ? 'text-red-500 font-semibold' : 'text-muted-foreground'}`}>
                            {daysLeft <= 0 ? 'Abgelaufen' : `Noch ${daysLeft} Tage gültig`}
                          </span>
                        </div>
                      </div>

                      {/* Copy Button */}
                      <button
                        onClick={() => handleCopy(coupon.code)}
                        disabled={daysLeft <= 0}
                        className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                      >
                        {copiedCode === coupon.code ? (
                          <>
                            <Check className="w-5 h-5" />
                            Kopiert!
                          </>
                        ) : (
                          <>
                            <Copy className="w-5 h-5" />
                            Code kopieren
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Info Box */}
          <div className="mt-8 glass border border-primary/50 rounded-2xl p-6 bg-primary/5">
            <h3 className="font-bold text-lg mb-2">💡 So verwendest du Gutscheine:</h3>
            <ol className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="font-bold text-primary">1.</span>
                <span>Kopiere den Gutscheincode</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-primary">2.</span>
                <span>Füge Produkte in deinen Warenkorb hinzu</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-primary">3.</span>
                <span>Gib den Code beim Checkout ein</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-primary">4.</span>
                <span>Genieße deinen Rabatt! 🎉</span>
              </li>
            </ol>
          </div>
        </div>
      </section>
    </div>
  )
}
