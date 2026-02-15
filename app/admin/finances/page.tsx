"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Wallet, Loader2, TrendingUp, Users, DollarSign, Euro } from "lucide-react"
import FloatingParticles from "@/components/floating-particles"
import Link from "next/link"

interface SellerBalance {
  id: string
  seller_id: string
  available_balance: number
  pending_balance: number
  total_withdrawn: number
  total_sales: number
  commission_rate: number
  seller: {
    id: string
    shop_name: string
    phone: string
    user_id: string
  }
}

export default function AdminFinancesPage() {
  const { data: session } = useSession()
  const [userId, setUserId] = useState<string>('')

  const [loading, setLoading] = useState(true)
  const [balances, setBalances] = useState<SellerBalance[]>([])

  useEffect(() => {
    // Always use m3000 as admin user to avoid localStorage tracking prevention issues
    setUserId('m3000')
  }, [])

  useEffect(() => {
    if (userId) {
      loadBalances()
    }
  }, [userId])

  const loadBalances = async () => {
    if (!userId) return

    try {
      const response = await fetch('/api/admin/finances', {
        headers: { 'x-user-id': userId }
      })
      const data = await response.json()

      if (response.ok) {
        setBalances(data.balances || [])
      }
    } catch (error) {
      console.error('Load balances error:', error)
    } finally {
      setLoading(false)
    }
  }

  const totalPlatformRevenue = balances.reduce((sum, b) => {
    return sum + (b.total_sales * (b.commission_rate / 100))
  }, 0)

  const totalSellerEarnings = balances.reduce((sum, b) => {
    return sum + (b.total_sales - (b.total_sales * (b.commission_rate / 100)))
  }, 0)

  const totalPendingPayouts = balances.reduce((sum, b) => sum + b.available_balance, 0)

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
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-8">
            <Wallet className="w-16 h-16 text-primary mx-auto mb-4" />
            <h1 className="font-serif text-4xl font-bold mb-2">Finanzübersicht</h1>
            <p className="text-muted-foreground">Plattform-Finanzen und Verkäufer-Guthaben</p>
          </div>

          {/* Platform Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="glass border border-border rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Euro className="w-5 h-5 text-green-500" />
                </div>
                <p className="text-sm text-muted-foreground">Plattform-Einnahmen</p>
              </div>
              <p className="text-3xl font-bold text-green-500">
                €{totalPlatformRevenue.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Gesamt Provisionen</p>
            </div>

            <div className="glass border border-border rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                </div>
                <p className="text-sm text-muted-foreground">Verkäufer-Einnahmen</p>
              </div>
              <p className="text-3xl font-bold text-blue-500">
                €{totalSellerEarnings.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Nach Provisionen</p>
            </div>

            <div className="glass border border-border rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-yellow-500" />
                </div>
                <p className="text-sm text-muted-foreground">Ausstehende Auszahlungen</p>
              </div>
              <p className="text-3xl font-bold text-yellow-500">
                €{totalPendingPayouts.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Verfügbare Guthaben</p>
            </div>
          </div>

          {/* Link to Withdrawal Requests */}
          <div className="mb-6">
            <Link
              href="/admin/withdrawals"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity"
            >
              <Wallet className="w-5 h-5" />
              Auszahlungsanträge verwalten
            </Link>
          </div>

          {/* Seller Balances Table */}
          <div className="glass border border-border rounded-2xl p-6">
            <h2 className="text-2xl font-bold mb-6">Verkäufer-Guthaben</h2>

            {balances.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Keine Verkäufer-Guthaben vorhanden</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4">Shop</th>
                      <th className="text-right py-3 px-4">Gesamtumsatz</th>
                      <th className="text-right py-3 px-4">Provision</th>
                      <th className="text-right py-3 px-4">Verfügbar</th>
                      <th className="text-right py-3 px-4">Ausstehend</th>
                      <th className="text-right py-3 px-4">Abgehoben</th>
                    </tr>
                  </thead>
                  <tbody>
                    {balances.map((balance) => {
                      const commission = balance.total_sales * (balance.commission_rate / 100)
                      const sellerEarnings = balance.total_sales - commission

                      return (
                        <tr key={balance.id} className="border-b border-border/50 hover:bg-primary/5 transition-colors">
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-semibold">{balance.seller.shop_name}</p>
                              <p className="text-xs text-muted-foreground">{balance.seller.phone}</p>
                            </div>
                          </td>
                          <td className="text-right py-3 px-4">
                            <p className="font-bold">€{balance.total_sales.toFixed(2)}</p>
                          </td>
                          <td className="text-right py-3 px-4">
                            <p className="text-sm text-green-500">€{commission.toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">{balance.commission_rate}%</p>
                          </td>
                          <td className="text-right py-3 px-4">
                            <p className="font-bold text-green-500">€{balance.available_balance.toFixed(2)}</p>
                          </td>
                          <td className="text-right py-3 px-4">
                            <p className="text-yellow-500">€{balance.pending_balance.toFixed(2)}</p>
                          </td>
                          <td className="text-right py-3 px-4">
                            <p className="text-purple-500">€{balance.total_withdrawn.toFixed(2)}</p>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
