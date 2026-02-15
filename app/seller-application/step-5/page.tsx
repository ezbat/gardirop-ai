"use client"

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, CheckCircle, Loader2, User, Store, CreditCard, FileText } from 'lucide-react'
import FloatingParticles from '@/components/floating-particles'
import { useSellerApplication } from '@/lib/seller-application-context'

export default function Step5Page() {
  const router = useRouter()
  const { data: session } = useSession()
  const userId = session?.user?.id
  const { formData, resetFormData } = useSellerApplication()

  const [submitting, setSubmitting] = useState(false)
  const [agreed, setAgreed] = useState(false)

  const handleSubmit = async () => {
    if (!agreed) {
      alert('❌ Lütfen şartları kabul edin!')
      return
    }

    if (!userId) {
      alert('❌ Kullanıcı oturum bilgisi bulunamadı!')
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch('/api/seller/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          shopName: formData.shopName,
          shopDescription: formData.shopDescription,
          businessType: formData.businessType,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          postalCode: formData.postalCode,
          country: formData.country,
          iban: formData.iban,
          bankName: formData.bankName,
          accountHolderName: formData.accountHolderName,
          taxNumber: formData.taxNumber,
          vatNumber: formData.vatNumber,
          idCardFrontUrl: formData.idCardFrontUrl,
          idCardBackUrl: formData.idCardBackUrl,
          addressDocumentUrl: formData.addressDocumentUrl,
          businessCertificateUrl: formData.businessCertificateUrl,
          logoUrl: formData.logoUrl
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Başvuru gönderilemedi')
      }

      // Başarılı - context'i temizle
      resetFormData()

      // Başarı sayfasına yönlendir
      alert('✅ Başvurunuz başarıyla gönderildi! En kısa sürede değerlendirip size dönüş yapacağız.')
      router.push('/seller-application')
    } catch (error: any) {
      console.error('Submit error:', error)
      alert(error.message || 'Başvuru gönderilemedi!')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-background to-secondary/20">
      <FloatingParticles />

      <section className="relative py-12 px-4">
        <div className="container mx-auto max-w-3xl">
          {/* Progress */}
          <div className="mb-8">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-semibold text-primary">Adım 5/5</span>
              <span className="text-muted-foreground">Önizleme & Gönder</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-primary w-[100%] transition-all duration-300"></div>
            </div>
          </div>

          {/* Preview Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass border border-border rounded-3xl p-8 mb-6"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Bilgilerinizi Kontrol Edin</h1>
                <p className="text-sm text-muted-foreground">Gönderilmeden önce tüm bilgileri inceleyin</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Kişisel Bilgiler */}
              <div className="border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-4">
                  <User className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">Kişisel Bilgiler</h3>
                </div>
                <dl className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Ad Soyad</dt>
                    <dd className="font-medium">{formData.fullName}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Telefon</dt>
                    <dd className="font-medium">{formData.phone}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Email</dt>
                    <dd className="font-medium">{formData.email}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Şehir</dt>
                    <dd className="font-medium">{formData.city}, {formData.country}</dd>
                  </div>
                </dl>
              </div>

              {/* Mağaza Bilgileri */}
              <div className="border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Store className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">Mağaza Bilgileri</h3>
                </div>
                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Mağaza Adı</dt>
                    <dd className="font-medium">{formData.shopName}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">İşletme Türü</dt>
                    <dd className="font-medium">
                      {formData.businessType === 'individual' ? '👤 Şahıs' : '🏢 Şirket'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Açıklama</dt>
                    <dd className="font-medium">{formData.shopDescription}</dd>
                  </div>
                </dl>
              </div>

              {/* Banka & Vergi */}
              <div className="border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-4">
                  <CreditCard className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">Banka & Vergi</h3>
                </div>
                <dl className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-muted-foreground">IBAN</dt>
                    <dd className="font-medium font-mono text-xs">{formData.iban}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Banka</dt>
                    <dd className="font-medium">{formData.bankName}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Hesap Sahibi</dt>
                    <dd className="font-medium">{formData.accountHolderName}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Vergi No</dt>
                    <dd className="font-medium font-mono">{formData.taxNumber}</dd>
                  </div>
                </dl>
              </div>

              {/* Belgeler */}
              <div className="border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">Yüklenen Belgeler</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Kimlik Kartı Ön Yüz</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Kimlik Kartı Arka Yüz</span>
                  </div>
                  {formData.addressDocumentUrl && (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Adres Belgesi</span>
                    </div>
                  )}
                  {formData.businessCertificateUrl && (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Ticaret Sicil Belgesi</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Terms */}
          <div className="glass border border-border rounded-2xl p-6 mb-6">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-border"
                disabled={submitting}
              />
              <div className="text-sm">
                <p className="font-medium mb-1">Satıcı Sözleşmesini Kabul Ediyorum</p>
                <p className="text-muted-foreground">
                  Kombin platformunda satış yapmak için{' '}
                  <a href="/legal/seller-terms" target="_blank" className="text-primary hover:underline">
                    Satıcı Sözleşmesini
                  </a>
                  ,{' '}
                  <a href="/legal/privacy" target="_blank" className="text-primary hover:underline">
                    Gizlilik Politikasını
                  </a>{' '}
                  ve{' '}
                  <a href="/legal/terms" target="_blank" className="text-primary hover:underline">
                    Kullanım Koşullarını
                  </a>{' '}
                  okudum ve kabul ediyorum.
                </p>
              </div>
            </label>
          </div>

          {/* Navigation */}
          <div className="flex justify-between">
            <button
              onClick={() => router.push('/seller-application/step-4')}
              className="px-6 py-3 border border-border rounded-xl font-semibold hover:bg-secondary transition-colors flex items-center gap-2"
              disabled={submitting}
            >
              <ArrowLeft className="w-5 h-5" />
              Geri
            </button>

            <button
              onClick={handleSubmit}
              disabled={!agreed || submitting}
              className="px-8 py-3 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Gönderiliyor...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Başvuruyu Gönder
                </>
              )}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
