"use client"

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowRight, ArrowLeft, User, Phone, Mail, MapPin } from 'lucide-react'
import FloatingParticles from '@/components/floating-particles'
import { useSellerApplication } from '@/lib/seller-application-context'

export default function Step1Page() {
  const { data: session } = useSession()
  const router = useRouter()
  const { formData, updateFormData } = useSellerApplication()

  const [localData, setLocalData] = useState({
    fullName: formData.fullName || session?.user?.name || '',
    phone: formData.phone || '',
    email: formData.email || session?.user?.email || '',
    address: formData.address || '',
    city: formData.city || '',
    postalCode: formData.postalCode || '',
    country: formData.country || 'Deutschland'
  })

  const handleNext = () => {
    // Validasyon
    if (!localData.fullName || !localData.phone || !localData.email) {
      alert('❌ Lütfen tüm zorunlu alanları doldurun!')
      return
    }

    if (!localData.address || !localData.city || !localData.postalCode) {
      alert('❌ Lütfen adres bilgilerini tam doldurun!')
      return
    }

    // Context'e kaydet
    updateFormData(localData)

    // Sonraki adıma geç
    router.push('/seller-application/step-2')
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-background to-secondary/20">
      <FloatingParticles />

      <section className="relative py-12 px-4">
        <div className="container mx-auto max-w-3xl">
          {/* Progress */}
          <div className="mb-8">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-semibold text-primary">Adım 1/5</span>
              <span className="text-muted-foreground">Kişisel Bilgiler</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-primary w-[20%] transition-all duration-300"></div>
            </div>
          </div>

          {/* Form Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass border border-border rounded-3xl p-8"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Kişisel Bilgileriniz</h1>
                <p className="text-sm text-muted-foreground">Kimlik doğrulama için gereklidir</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Ad Soyad */}
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Ad Soyad <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={localData.fullName}
                  onChange={(e) => setLocalData({ ...localData, fullName: e.target.value })}
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary focus:outline-none"
                  placeholder="Ahmet Yılmaz"
                />
              </div>

              {/* Telefon & Email */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Telefon <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="tel"
                      value={localData.phone}
                      onChange={(e) => setLocalData({ ...localData, phone: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary focus:outline-none"
                      placeholder="+49 123 456 7890"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="email"
                      value={localData.email}
                      onChange={(e) => setLocalData({ ...localData, email: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary focus:outline-none"
                      placeholder="ornek@email.com"
                      disabled
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Hesap emailiniz kullanılacak</p>
                </div>
              </div>

              {/* Adres */}
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Adres <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-4 w-5 h-5 text-muted-foreground" />
                  <textarea
                    value={localData.address}
                    onChange={(e) => setLocalData({ ...localData, address: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary focus:outline-none resize-none"
                    rows={3}
                    placeholder="Sokak, mahalle, bina no, daire no"
                  />
                </div>
              </div>

              {/* Şehir, Posta Kodu, Ülke */}
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Şehir <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={localData.city}
                    onChange={(e) => setLocalData({ ...localData, city: e.target.value })}
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary focus:outline-none"
                    placeholder="Berlin"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Posta Kodu <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={localData.postalCode}
                    onChange={(e) => setLocalData({ ...localData, postalCode: e.target.value })}
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary focus:outline-none"
                    placeholder="10115"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Ülke <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={localData.country}
                    onChange={(e) => setLocalData({ ...localData, country: e.target.value })}
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary focus:outline-none"
                  >
                    <option value="Deutschland">Deutschland</option>
                    <option value="Österreich">Österreich</option>
                    <option value="Schweiz">Schweiz</option>
                    <option value="Türkiye">Türkiye</option>
                  </select>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <button
              onClick={() => router.push('/seller-application')}
              className="px-6 py-3 border border-border rounded-xl font-semibold hover:bg-secondary transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Geri
            </button>

            <button
              onClick={handleNext}
              className="px-8 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              İleri
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
