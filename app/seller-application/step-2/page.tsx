"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowRight, ArrowLeft, Store, Upload, X } from 'lucide-react'
import FloatingParticles from '@/components/floating-particles'
import { useSellerApplication } from '@/lib/seller-application-context'
import { supabase } from '@/lib/supabase'
import { useSession } from 'next-auth/react'

export default function Step2Page() {
  const router = useRouter()
  const { data: session } = useSession()
  const userId = session?.user?.id
  const { formData, updateFormData } = useSellerApplication()

  const [localData, setLocalData] = useState({
    shopName: formData.shopName || '',
    shopDescription: formData.shopDescription || '',
    businessType: formData.businessType || 'einzelunternehmer',
  })

  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string>(formData.logoUrl || '')
  const [uploading, setUploading] = useState(false)

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Max 5MB
      if (file.size > 5 * 1024 * 1024) {
        alert('❌ Logo-Datei darf maximal 5MB groß sein!')
        return
      }

      setLogoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeLogo = () => {
    setLogoFile(null)
    setLogoPreview('')
  }

  const uploadLogo = async (): Promise<string> => {
    if (!logoFile || !userId) return ''

    const filePath = `logos/${userId}_logo_${Date.now()}`
    const { data, error } = await supabase.storage
      .from('seller-documents')
      .upload(filePath, logoFile, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Logo upload error:', error)
      throw new Error('Logo konnte nicht hochgeladen werden')
    }

    const { data: urlData } = supabase.storage
      .from('seller-documents')
      .getPublicUrl(filePath)

    return urlData.publicUrl
  }

  const handleNext = async () => {
    // Validasyon
    if (!localData.shopName || localData.shopName.length < 3) {
      alert('❌ Shop-Name muss mindestens 3 Zeichen lang sein!')
      return
    }

    if (!localData.shopDescription || localData.shopDescription.length < 50) {
      alert('❌ Shop-Beschreibung muss mindestens 50 Zeichen lang sein!')
      return
    }

    try {
      setUploading(true)

      // Logo varsa yükle
      let logoUrl = formData.logoUrl
      if (logoFile) {
        logoUrl = await uploadLogo()
      }

      // Context'e kaydet
      updateFormData({
        ...localData,
        logoUrl
      })

      // Sonraki adıma geç
      router.push('/seller-application/step-3')
    } catch (error: any) {
      alert(error.message || 'Ein Fehler ist aufgetreten!')
    } finally {
      setUploading(false)
    }
  }

  const businessTypes = [
    {
      id: 'einzelunternehmer',
      icon: '👤',
      title: 'Einzelunternehmer',
      description: 'Freiberufler oder Gewerbetreibende',
      documents: 'Gewerbeschein erforderlich'
    },
    {
      id: 'e.K.',
      icon: '🏪',
      title: 'e.K. (eingetragener Kaufmann)',
      description: 'Ins Handelsregister eingetragen',
      documents: 'Handelsregisterauszug erforderlich'
    },
    {
      id: 'GmbH',
      icon: '🏢',
      title: 'GmbH',
      description: 'Gesellschaft mit beschränkter Haftung',
      documents: 'Handelsregisterauszug erforderlich'
    },
    {
      id: 'UG',
      icon: '🏛️',
      title: 'UG (haftungsbeschränkt)',
      description: 'Unternehmergesellschaft',
      documents: 'Handelsregisterauszug erforderlich'
    }
  ]

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-background to-secondary/20">
      <FloatingParticles />

      <section className="relative py-12 px-4">
        <div className="container mx-auto max-w-3xl">
          {/* Progress */}
          <div className="mb-8">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-semibold text-primary">Schritt 2/5</span>
              <span className="text-muted-foreground">Geschäftsinformationen</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-primary w-[40%] transition-all duration-300"></div>
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
                <Store className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Shop-Informationen</h1>
                <p className="text-sm text-muted-foreground">Informationen für Ihre Kunden</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Shop Name */}
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Shop-Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={localData.shopName}
                  onChange={(e) => setLocalData({ ...localData, shopName: e.target.value })}
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary focus:outline-none"
                  placeholder="z.B. Modehaus Müller"
                  maxLength={50}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {localData.shopName.length}/50 Zeichen
                </p>
              </div>

              {/* Rechtsform */}
              <div>
                <label className="block text-sm font-semibold mb-2 mb-4">
                  Rechtsform <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {businessTypes.map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setLocalData({ ...localData, businessType: type.id as any })}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        localData.businessType === type.id
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="text-3xl mb-2">{type.icon}</div>
                      <div className="font-semibold mb-1">{type.title}</div>
                      <div className="text-xs text-muted-foreground mb-2">{type.description}</div>
                      <div className="text-xs text-primary font-medium">{type.documents}</div>
                    </button>
                  ))}
                </div>

                {(localData.businessType === 'GmbH' || localData.businessType === 'UG' || localData.businessType === 'e.K.') && (
                  <div className="mt-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
                    <p className="text-sm">
                      <span className="font-semibold text-yellow-600">⚠️ Wichtig:</span> Für{' '}
                      <strong>{localData.businessType}</strong> benötigen Sie im Schritt 4 einen aktuellen
                      Handelsregisterauszug (nicht älter als 3 Monate).
                    </p>
                  </div>
                )}
              </div>

              {/* Shop Beschreibung */}
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Shop-Beschreibung <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={localData.shopDescription}
                  onChange={(e) => setLocalData({ ...localData, shopDescription: e.target.value })}
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary focus:outline-none resize-none"
                  rows={6}
                  placeholder="Beschreiben Sie Ihren Shop und Ihr Sortiment. Was macht Ihren Shop besonders? Welche Produkte bieten Sie an?"
                  maxLength={1000}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {localData.shopDescription.length}/1000 Zeichen (min. 50)
                </p>
              </div>

              {/* Logo */}
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Shop-Logo (Optional)
                </label>

                {logoPreview ? (
                  <div className="relative inline-block">
                    <img
                      src={logoPreview}
                      alt="Logo Vorschau"
                      className="w-40 h-40 rounded-xl object-cover border-2 border-border"
                    />
                    <button
                      onClick={removeLogo}
                      className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary transition-colors">
                    <Upload className="w-10 h-10 text-muted-foreground mb-3" />
                    <span className="text-sm font-medium">Logo hochladen</span>
                    <span className="text-xs text-muted-foreground mt-1">PNG, JPG (max 5MB)</span>
                    <span className="text-xs text-muted-foreground">Empfohlen: quadratisch, min. 400x400px</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          </motion.div>

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <button
              onClick={() => router.push('/seller-application/step-1')}
              className="px-6 py-3 border border-border rounded-xl font-semibold hover:bg-secondary transition-colors flex items-center gap-2"
              disabled={uploading}
            >
              <ArrowLeft className="w-5 h-5" />
              Zurück
            </button>

            <button
              onClick={handleNext}
              disabled={uploading}
              className="px-8 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50"
            >
              {uploading ? 'Wird hochgeladen...' : 'Weiter'}
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
