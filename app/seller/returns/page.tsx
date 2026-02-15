'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { RotateCcw, Loader2, CheckCircle, XCircle, DollarSign, ArrowLeft, Package } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import FloatingParticles from '@/components/floating-particles'

interface ReturnRequest {
  id: string
  order_id: string
  reason: string
  description: string
  status: string
  refund_amount: number
  created_at: string
  customer_id: string
  seller_response?: string
  order: {
    id: string
    total_amount: number
  }
}

const statusConfig: any = {
  pending: { label: 'Bekliyor', color: 'bg-yellow-500', icon: RotateCcw },
  approved: { label: 'Onaylandı', color: 'bg-blue-500', icon: CheckCircle },
  rejected: { label: 'Reddedildi', color: 'bg-red-500', icon: XCircle },
  returned: { label: 'İade Edildi', color: 'bg-purple-500', icon: Package },
  refunded: { label: 'Para İadesi Yapıldı', color: 'bg-green-500', icon: DollarSign },
}

const reasonLabels: any = {
  size_issue: 'Beden Uygun Değil',
  wrong_item: 'Yanlış Ürün',
  defective: 'Hasarlı/Kusurlu',
  not_as_described: 'Açıklamaya Uygun Değil',
  changed_mind: 'Fikir Değişikliği',
  other: 'Diğer',
}

export default function SellerReturnsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const userId = session?.user?.id

  const [seller, setSeller] = useState<any>(null)
  const [returns, setReturns] = useState<ReturnRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedReturn, setSelectedReturn] = useState<string | null>(null)
  const [responseText, setResponseText] = useState('')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    if (userId) {
      checkSellerAndLoadReturns()
    }
  }, [userId])

  const checkSellerAndLoadReturns = async () => {
    try {
      const { data: sellerData, error: sellerError } = await supabase
        .from('sellers')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (sellerError || !sellerData) {
        alert('Satıcı profili bulunamadı!')
        router.push('/seller/dashboard')
        return
      }

      setSeller(sellerData)
      await loadReturns(sellerData.id)
    } catch (error) {
      console.error('Check seller error:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadReturns = async (sellerId: string) => {
    try {
      const { data, error } = await supabase
        .from('return_requests')
        .select(`
          *,
          order:orders (
            id,
            total_amount
          )
        `)
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false })

      if (error) throw error

      setReturns(data || [])
    } catch (error) {
      console.error('Load returns error:', error)
    }
  }

  const handleResponse = async (returnId: string, action: 'approve' | 'reject') => {
    if (action === 'reject' && !responseText.trim()) {
      alert('Lütfen red sebebini belirtin')
      return
    }

    setProcessing(true)

    try {
      const response = await fetch('/api/returns/respond', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId || '',
        },
        body: JSON.stringify({
          returnRequestId: returnId,
          action,
          response: responseText,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'İşlem başarısız')
      }

      alert(action === 'approve' ? '✅ İade onaylandı!' : '❌ İade reddedildi')

      // Reload returns
      await loadReturns(seller.id)
      setSelectedReturn(null)
      setResponseText('')
    } catch (error: any) {
      console.error('Response error:', error)
      alert(error.message || 'İşlem başarısız!')
    } finally {
      setProcessing(false)
    }
  }

  const handleProcessRefund = async (returnId: string) => {
    if (!confirm('Para iadesi yapılacak. Emin misiniz?')) {
      return
    }

    setProcessing(true)

    try {
      const response = await fetch('/api/returns/process-refund', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId || '',
        },
        body: JSON.stringify({
          returnRequestId: returnId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Para iadesi başarısız')
      }

      alert(`✅ Para iadesi yapıldı: €${data.refund_amount}`)

      // Reload returns
      await loadReturns(seller.id)
    } catch (error: any) {
      console.error('Process refund error:', error)
      alert(error.message || 'Para iadesi başarısız!')
    } finally {
      setProcessing(false)
    }
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
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 mb-6 hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Geri
          </button>

          <h1 className="font-serif text-4xl font-bold mb-8">İade Talepleri</h1>

          {returns.length === 0 ? (
            <div className="glass border border-border rounded-2xl p-12 text-center">
              <RotateCcw className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-bold mb-2">İade talebi yok</h2>
              <p className="text-muted-foreground">Henüz hiç iade talebi almadınız.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {returns.map(returnReq => {
                const StatusIcon = statusConfig[returnReq.status].icon
                return (
                  <div key={returnReq.id} className="glass border border-border rounded-2xl p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="font-bold mb-1">
                          İade #{returnReq.id.slice(0, 8).toUpperCase()}
                        </p>
                        <p className="text-sm text-muted-foreground mb-1">
                          Sipariş: #{returnReq.order_id.slice(0, 8).toUpperCase()}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(returnReq.created_at).toLocaleDateString('tr-TR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusIcon className="w-5 h-5" />
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${statusConfig[returnReq.status].color}`}>
                          {statusConfig[returnReq.status].label}
                        </span>
                      </div>
                    </div>

                    <div className="glass border border-border rounded-xl p-4 mb-4">
                      <p className="text-sm font-semibold mb-2">İade Sebebi</p>
                      <p className="text-sm mb-2">{reasonLabels[returnReq.reason] || returnReq.reason}</p>
                      <p className="text-sm text-muted-foreground">{returnReq.description}</p>
                    </div>

                    <div className="flex justify-between items-center mb-4 pb-4 border-b border-border">
                      <span className="font-semibold">İade Tutarı</span>
                      <span className="text-2xl font-bold text-primary">
                        €{returnReq.refund_amount.toFixed(2)}
                      </span>
                    </div>

                    {/* Actions */}
                    {returnReq.status === 'pending' && (
                      <div className="space-y-3">
                        <textarea
                          value={selectedReturn === returnReq.id ? responseText : ''}
                          onChange={(e) => {
                            setSelectedReturn(returnReq.id)
                            setResponseText(e.target.value)
                          }}
                          placeholder="Müşteriye mesaj (opsiyonel)..."
                          rows={2}
                          className="w-full px-4 py-2 glass border border-border rounded-xl outline-none focus:border-primary resize-none text-sm"
                        />
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleResponse(returnReq.id, 'reject')}
                            className="flex-1 px-4 py-2 bg-red-500 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                            disabled={processing}
                          >
                            <XCircle className="w-4 h-4" />
                            Reddet
                          </button>
                          <button
                            onClick={() => handleResponse(returnReq.id, 'approve')}
                            className="flex-1 px-4 py-2 bg-green-500 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                            disabled={processing}
                          >
                            <CheckCircle className="w-4 h-4" />
                            Onayla
                          </button>
                        </div>
                      </div>
                    )}

                    {returnReq.status === 'approved' && (
                      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                        <p className="text-sm text-blue-400">
                          ✓ İade onaylandı. Müşterinin ürünü kargoya vermesini bekleyin.
                        </p>
                      </div>
                    )}

                    {returnReq.status === 'returned' && (
                      <button
                        onClick={() => handleProcessRefund(returnReq.id)}
                        className="w-full px-4 py-2 bg-green-500 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                        disabled={processing}
                      >
                        {processing ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            İşleniyor...
                          </>
                        ) : (
                          <>
                            <DollarSign className="w-4 h-4" />
                            Para İadesi Yap
                          </>
                        )}
                      </button>
                    )}

                    {returnReq.seller_response && (
                      <div className="glass border border-border rounded-xl p-4 mt-4">
                        <p className="text-sm font-semibold mb-2">Satıcı Yanıtı</p>
                        <p className="text-sm text-muted-foreground">{returnReq.seller_response}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
