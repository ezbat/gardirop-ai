"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Store, Loader2, CheckCircle, XCircle, Clock } from "lucide-react"
import FloatingParticles from "@/components/floating-particles"

export default function SellerApplyPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const userId = session?.user?.id

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState<any>(null)
  
  const [formData, setFormData] = useState({
    shopName: '',
    shopDescription: '',
    businessType: 'individual',
    taxNumber: '',
    phone: '',
    address: '',
    city: ''
  })

  useEffect(() => {
    if (userId) checkSellerStatus()
  }, [userId])

  const checkSellerStatus = async () => {
    try {
      const response = await fetch('/api/seller/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })
      const data = await response.json()
      setStatus(data)
      
      if (data.isSeller) {
        router.push('/seller/dashboard')
      }
    } catch (error) {
      console.error('Check status error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return

    setSubmitting(true)
    try {
      const response = await fetch('/api/seller/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...formData })
      })

      const data = await response.json()
      
      if (!response.ok) {
        alert(data.error || 'Başvuru başarısız!')
        return
      }

      alert('✅ Başvurunuz alındı! İnceleme süreci başladı.')
      checkSellerStatus()
    } catch (error) {
      console.error('Submit error:', error)
      alert('Başvuru gönderilemedi!')
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

  if (status?.application) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <FloatingParticles />
        <section className="relative py-8 px-4">
          <div className="container mx-auto max-w-2xl">
            <div className="text-center">
              {status.application.status === 'pending' && (
                <>
                  <Clock className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                  <h1 className="text-3xl font-bold mb-4">Başvurunuz İnceleniyor</h1>
                  <p className="text-muted-foreground mb-6">
                    Başvurunuz {new Date(status.application.applied_at).toLocaleDateString('tr-TR')} tarihinde alındı.
                    En kısa sürede değerlendirip size dönüş yapacağız.
                  </p>
                  <div className="glass border border-border rounded-2xl p-6 text-left">
                    <p className="font-semibold mb-2">Mağaza Adı:</p>
                    <p className="text-muted-foreground mb-4">{status.application.shop_name}</p>
                    <p className="font-semibold mb-2">Telefon:</p>
                    <p className="text-muted-foreground">{status.application.phone}</p>
                  </div>
                </>
              )}
              
              {status.application.status === 'rejected' && (
                <>
                  <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                  <h1 className="text-3xl font-bold mb-4">Başvurunuz Reddedildi</h1>
                  <p className="text-muted-foreground mb-6">
                    {status.application.rejection_reason || 'Başvurunuz incelendi ancak şu anda onaylanamadı.'}
                  </p>
                  <button onClick={() => { setStatus(null); checkSellerStatus() }} className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity">
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

  return (
    <div className="min-h-screen relative overflow-hidden">
      <FloatingParticles />
      <section className="relative py-8 px-4">
        <div className="container mx-auto max-w-2xl">
          <div className="text-center mb-8">
            <Store className="w-16 h-16 text-primary mx-auto mb-4" />
            <h1 className="font-serif text-4xl font-bold mb-2">Satıcı Ol</h1>
            <p className="text-muted-foreground">Kendi mağazanı aç, ürünlerini sat!</p>
          </div>

          <form onSubmit={handleSubmit} className="glass border border-border rounded-2xl p-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Mağaza Adı *</label>
              <input
                type="text"
                value={formData.shopName}
                onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                placeholder="Örn: Stylish Boutique"
                required
                maxLength={50}
                className="w-full px-4 py-2 glass border border-border rounded-xl outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Mağaza Açıklaması</label>
              <textarea
                value={formData.shopDescription}
                onChange={(e) => setFormData({ ...formData, shopDescription: e.target.value })}
                placeholder="Mağazanızı tanıtın..."
                rows={3}
                maxLength={500}
                className="w-full px-4 py-2 glass border border-border rounded-xl outline-none focus:border-primary resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">İşletme Türü</label>
              <select
                value={formData.businessType}
                onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                className="w-full px-4 py-2 glass border border-border rounded-xl outline-none focus:border-primary"
              >
                <option value="individual">Bireysel</option>
                <option value="company">Şirket</option>
              </select>
            </div>

            {formData.businessType === 'company' && (
              <div>
                <label className="block text-sm font-semibold mb-2">Vergi Numarası</label>
                <input
                  type="text"
                  value={formData.taxNumber}
                  onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
                  placeholder="1234567890"
                  className="w-full px-4 py-2 glass border border-border rounded-xl outline-none focus:border-primary"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold mb-2">Telefon *</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="05XX XXX XX XX"
                required
                className="w-full px-4 py-2 glass border border-border rounded-xl outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Adres</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Sokak, No, vb."
                className="w-full px-4 py-2 glass border border-border rounded-xl outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Şehir</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="İstanbul, Ankara, vb."
                className="w-full px-4 py-2 glass border border-border rounded-xl outline-none focus:border-primary"
              />
            </div>

            <div className="glass border border-primary/50 rounded-xl p-4">
              <p className="text-sm text-muted-foreground">
                ℹ️ Başvurunuz incelendikten sonra satış yapmaya başlayabilirsiniz. 
                Platform komisyon oranı: <span className="font-bold text-primary">%15</span>
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Store className="w-5 h-5" />}
              {submitting ? 'Gönderiliyor...' : 'Başvur'}
            </button>
          </form>
        </div>
      </section>
    </div>
  )
}