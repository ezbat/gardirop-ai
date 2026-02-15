"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Wallet, TrendingUp, Clock, DollarSign, Download, Euro, ArrowUpRight, Loader2, CreditCard, FileText, ShoppingCart, Plus, AlertCircle } from "lucide-react"
import FloatingParticles from "@/components/floating-particles"
import Link from "next/link"

interface Balance {
  available_balance: number
  pending_balance: number
  total_withdrawn: number
  total_sales: number
  commission_rate: number
}

interface WithdrawalRequest {
  id: string
  amount: number
  commission_amount: number
  net_amount: number
  status: string
  method: string
  created_at: string
}

interface Order {
  id: string
  total_amount: number
  payment_status: string
  created_at: string
}

interface SellerSettings {
  bank_name: string
  account_holder: string
  iban: string
  paypal_email: string
}

export default function SellerFinancesPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const userId = session?.user?.id

  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'payments' | 'account' | 'unpaid'>('overview')
  const [balance, setBalance] = useState<Balance | null>(null)
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([])
  const [unpaidOrders, setUnpaidOrders] = useState<Order[]>([])
  const [settings, setSettings] = useState<SellerSettings | null>(null)

  useEffect(() => {
    if (userId) {
      loadData()
    }
  }, [userId])

  const loadData = async () => {
    try {
      const [balanceRes, withdrawalsRes, settingsRes] = await Promise.all([
        fetch('/api/seller/balance', { headers: { 'x-user-id': userId! }}),
        fetch('/api/seller/withdrawals', { headers: { 'x-user-id': userId! }}),
        fetch('/api/seller/settings', { headers: { 'x-user-id': userId! }})
      ])

      const balanceData = await balanceRes.json()
      const withdrawalsData = await withdrawalsRes.json()
      const settingsData = await settingsRes.json()

      if (balanceRes.ok) setBalance(balanceData.balance)
      if (withdrawalsRes.ok) setWithdrawals(withdrawalsData.withdrawals || [])
      if (settingsRes.ok && settingsData.seller) {
        setSettings({
          bank_name: settingsData.seller.bank_name,
          account_holder: settingsData.seller.account_holder,
          iban: settingsData.seller.iban,
          paypal_email: settingsData.seller.paypal_email
        })
      }
    } catch (error) {
      console.error('Load data error:', error)
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

  const hasPaymentMethod = settings?.iban || settings?.paypal_email

  return (
    <div className="min-h-screen relative overflow-hidden">
      <FloatingParticles />
      <section className="relative py-8 px-4">
        <div className="container mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-6">
            <h1 className="font-serif text-3xl font-bold mb-2">Ödemeler</h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {/* Tabs */}
              <div className="glass border border-border rounded-2xl overflow-hidden mb-6">
                <div className="flex border-b border-border">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                      activeTab === 'overview'
                        ? 'bg-primary/10 text-primary border-b-2 border-primary'
                        : 'hover:bg-primary/5 text-muted-foreground'
                    }`}
                  >
                    Genel Bakış
                  </button>
                  <button
                    onClick={() => setActiveTab('payments')}
                    className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                      activeTab === 'payments'
                        ? 'bg-primary/10 text-primary border-b-2 border-primary'
                        : 'hover:bg-primary/5 text-muted-foreground'
                    }`}
                  >
                    Ödemeler
                  </button>
                  <button
                    onClick={() => setActiveTab('account')}
                    className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                      activeTab === 'account'
                        ? 'bg-primary/10 text-primary border-b-2 border-primary'
                        : 'hover:bg-primary/5 text-muted-foreground'
                    }`}
                  >
                    Hesap özelleri
                  </button>
                  <button
                    onClick={() => setActiveTab('unpaid')}
                    className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                      activeTab === 'unpaid'
                        ? 'bg-primary/10 text-primary border-b-2 border-primary'
                        : 'hover:bg-primary/5 text-muted-foreground'
                    }`}
                  >
                    Ödemesi yapılmamış siparişler
                  </button>
                </div>

                {/* Tab Content */}
                <div className="p-6">
                  {/* Overview Tab */}
                  {activeTab === 'overview' && (
                    <div className="space-y-6">
                      {/* Balance Summary */}
                      <div className="space-y-4">
                        <div className="flex justify-between items-center pb-4 border-b border-border">
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Toplam bakiye</p>
                            <p className="text-3xl font-bold">€{balance?.available_balance.toFixed(2) || '0,00'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Kullanılabilir bakiye</p>
                            <p className="text-3xl font-bold text-green-500">€{balance?.available_balance.toFixed(2) || '0,00'}</p>
                          </div>
                        </div>

                        {/* Detailed Stats */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 glass border border-border rounded-xl">
                            <div className="flex items-center gap-2 mb-2">
                              <Clock className="w-4 h-4 text-yellow-500" />
                              <p className="text-sm text-muted-foreground">Rezerv</p>
                            </div>
                            <p className="text-xl font-bold">€0,00</p>
                            <Link href="#" className="text-xs text-primary hover:underline mt-1 inline-block">
                              Ayrıntılı görüntüle →
                            </Link>
                          </div>

                          <div className="p-4 glass border border-border rounded-xl">
                            <div className="flex items-center gap-2 mb-2">
                              <TrendingUp className="w-4 h-4 text-blue-500" />
                              <p className="text-sm text-muted-foreground">Ödeme talebi yapılmamış</p>
                            </div>
                            <p className="text-xl font-bold">€{balance?.available_balance.toFixed(2) || '0,00'}</p>
                          </div>
                        </div>

                        {/* Withdrawal Button */}
                        <button
                          onClick={() => router.push('/seller/withdraw')}
                          disabled={!hasPaymentMethod || (balance?.available_balance || 0) < 10}
                          className="w-full px-6 py-3 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          <Plus className="w-5 h-5" />
                          {!hasPaymentMethod
                            ? 'Önce ödeme yöntemi ekleyin'
                            : (balance?.available_balance || 0) < 10
                            ? 'Minimum €10.00 gerekli'
                            : 'Ödeme almak için bir kart ekleyin'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Payments Tab */}
                  {activeTab === 'payments' && (
                    <div className="space-y-6">
                      {withdrawals.length === 0 ? (
                        <div className="text-center py-12">
                          <div className="w-24 h-24 mx-auto mb-4 glass border-2 border-dashed border-border rounded-xl flex items-center justify-center">
                            <Wallet className="w-12 h-12 text-muted-foreground" />
                          </div>
                          <h3 className="text-xl font-bold mb-2">Hiç kartınız yok</h3>
                          <p className="text-muted-foreground mb-4">
                            Sorunsuz ödeme ve mağaza işlemlerinin devam etmesi için lütfen bir kredi veya banka kartı ekleyin.
                          </p>
                          <Link
                            href="/seller/settings"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-colors"
                          >
                            <Plus className="w-5 h-5" />
                            Ödeme almak için bir kart ekleyin
                          </Link>

                          {/* Security Info */}
                          <div className="mt-8 space-y-2 text-sm text-muted-foreground">
                            <div className="flex items-center justify-center gap-2">
                              <AlertCircle className="w-4 h-4" />
                              <span>Temu, kart bilgilerinizi korur</span>
                            </div>
                            <div className="flex items-center justify-center gap-2">
                              <AlertCircle className="w-4 h-4" />
                              <span>Kart bilgileri güvende ve koruma altındadır</span>
                            </div>
                            <div className="flex items-center justify-center gap-2">
                              <AlertCircle className="w-4 h-4" />
                              <span>Tüm veriler şifrelenmiştir</span>
                            </div>
                            <div className="flex items-center justify-center gap-2">
                              <AlertCircle className="w-4 h-4" />
                              <span>Temu asla kart bilgilerinizi satmaz</span>
                            </div>
                          </div>

                          {/* Payment Icons */}
                          <div className="mt-6 flex items-center justify-center gap-3">
                            <div className="w-12 h-8 glass border border-border rounded flex items-center justify-center text-xs font-bold">VISA</div>
                            <div className="w-12 h-8 glass border border-border rounded flex items-center justify-center text-xs font-bold">MC</div>
                            <div className="w-12 h-8 glass border border-border rounded flex items-center justify-center text-xs font-bold">AMEX</div>
                            <div className="w-12 h-8 glass border border-border rounded flex items-center justify-center text-xs font-bold">DISC</div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {withdrawals.map((withdrawal) => (
                            <div key={withdrawal.id} className="glass border border-border rounded-xl p-4">
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="font-semibold">Çekim Talebi</p>
                                  <p className="text-sm text-muted-foreground">
                                    {new Date(withdrawal.created_at).toLocaleDateString('tr-TR')}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-lg font-bold">€{withdrawal.net_amount.toFixed(2)}</p>
                                  <span className={`text-xs px-2 py-1 rounded-full ${
                                    withdrawal.status === 'completed' ? 'bg-green-500/20 text-green-500' :
                                    withdrawal.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' :
                                    'bg-red-500/20 text-red-500'
                                  }`}>
                                    {withdrawal.status === 'completed' ? 'Tamamlandı' :
                                     withdrawal.status === 'pending' ? 'Beklemede' : withdrawal.status}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Account Details Tab */}
                  {activeTab === 'account' && (
                    <div className="space-y-4">
                      <div className="p-4 glass border border-border rounded-xl">
                        <h3 className="font-bold mb-3">Banka Bilgileri</h3>
                        {hasPaymentMethod ? (
                          <div className="space-y-2">
                            {settings?.bank_name && (
                              <div>
                                <p className="text-sm text-muted-foreground">Banka Adı</p>
                                <p className="font-semibold">{settings.bank_name}</p>
                              </div>
                            )}
                            {settings?.account_holder && (
                              <div>
                                <p className="text-sm text-muted-foreground">Hesap Sahibi</p>
                                <p className="font-semibold">{settings.account_holder}</p>
                              </div>
                            )}
                            {settings?.iban && (
                              <div>
                                <p className="text-sm text-muted-foreground">IBAN</p>
                                <p className="font-semibold">{settings.iban}</p>
                              </div>
                            )}
                            {settings?.paypal_email && (
                              <div>
                                <p className="text-sm text-muted-foreground">PayPal E-posta</p>
                                <p className="font-semibold">{settings.paypal_email}</p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-6">
                            <p className="text-muted-foreground mb-4">Henüz ödeme yöntemi eklenmedi</p>
                            <Link
                              href="/seller/settings"
                              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90"
                            >
                              Ayarlara Git
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Unpaid Orders Tab */}
                  {activeTab === 'unpaid' && (
                    <div className="text-center py-12">
                      <ShoppingCart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-xl font-bold mb-2">Ödemesi yapılmamış sipariş yok</h3>
                      <p className="text-muted-foreground">Tüm siparişleriniz ödenmiş durumda</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Bank Account Card */}
              <div className="glass border border-border rounded-2xl p-6">
                <h3 className="font-bold mb-4">Banka hesabı</h3>
                {hasPaymentMethod ? (
                  <div className="space-y-3">
                    <div className="p-3 glass border border-border rounded-xl">
                      <p className="text-xs text-muted-foreground mb-1">Hesap Sahibi</p>
                      <p className="font-semibold">{settings?.account_holder || '-'}</p>
                    </div>
                    {settings?.iban && (
                      <div className="p-3 glass border border-border rounded-xl">
                        <p className="text-xs text-muted-foreground mb-1">IBAN</p>
                        <p className="font-semibold text-sm">{settings.iban}</p>
                      </div>
                    )}
                    <Link
                      href="/seller/settings"
                      className="block w-full px-4 py-2 border border-primary text-primary rounded-xl font-semibold hover:bg-primary/10 transition-colors text-center"
                    >
                      Tüm verileriniz güvende altındadır
                    </Link>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground mb-4">
                      Yok, Ödeme alabilmek için bir banka hesabı eklemeniz gerekmektedir.
                    </p>
                    <Link
                      href="/seller/settings"
                      className="block w-full px-4 py-2 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity text-center"
                    >
                      + Ekle
                    </Link>
                  </div>
                )}
              </div>

              {/* Commission Info */}
              <div className="glass border border-primary/50 rounded-2xl p-6 bg-primary/5">
                <div className="flex items-center gap-2 mb-3">
                  <Euro className="w-5 h-5 text-primary" />
                  <h3 className="font-bold">Komisyon Oranı</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Platform her çekimden %{balance?.commission_rate || 15} komisyon alır.
                </p>
                <div className="mt-3 p-3 glass border border-border rounded-xl">
                  <p className="text-xs text-muted-foreground">Siz alacaksınız</p>
                  <p className="text-lg font-bold text-green-500">{100 - (balance?.commission_rate || 15)}%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
