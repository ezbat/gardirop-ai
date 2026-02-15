"use client"

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowRight, ArrowLeft, Upload, FileCheck, X, Loader2, AlertCircle } from 'lucide-react'
import FloatingParticles from '@/components/floating-particles'
import { useSellerApplication } from '@/lib/seller-application-context'
import { supabase } from '@/lib/supabase'

export default function Step4Page() {
  const router = useRouter()
  const { data: session } = useSession()
  const userId = session?.user?.id
  const { formData, updateFormData } = useSellerApplication()

  const [files, setFiles] = useState<{
    personalausweisVorderseite: File | null
    personalausweisRückseite: File | null
    meldebescheinigung: File | null
    gewerbeschein: File | null
    handelsregisterauszug: File | null
  }>({
    personalausweisVorderseite: null,
    personalausweisRückseite: null,
    meldebescheinigung: null,
    gewerbeschein: null,
    handelsregisterauszug: null
  })

  const [previews, setPreviews] = useState<Record<string, string>>({
    personalausweisVorderseite: formData.personalausweisVorderseite || '',
    personalausweisRückseite: formData.personalausweisRückseite || '',
    meldebescheinigung: formData.meldebescheinigung || '',
    gewerbeschein: formData.gewerbeschein || '',
    handelsregisterauszug: formData.handelsregisterauszug || ''
  })

  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<Record<string, boolean>>({})

  const handleFileChange = (field: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Max 10MB
      if (file.size > 10 * 1024 * 1024) {
        alert('❌ Datei darf maximal 10MB groß sein!')
        return
      }

      setFiles({ ...files, [field]: file })

      // Preview oluştur
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviews({ ...previews, [field]: reader.result as string })
      }
      reader.readAsDataURL(file)
    }
  }

  const removeFile = (field: string) => {
    setFiles({ ...files, [field]: null })
    setPreviews({ ...previews, [field]: '' })
  }

  const uploadFile = async (file: File, folder: string, fileName: string): Promise<string> => {
    if (!userId) throw new Error('User ID nicht gefunden')

    const filePath = `${folder}/${userId}_${fileName}_${Date.now()}`
    const { data, error } = await supabase.storage
      .from('seller-documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Upload error:', error)
      throw new Error(`${fileName} konnte nicht hochgeladen werden`)
    }

    const { data: urlData } = supabase.storage
      .from('seller-documents')
      .getPublicUrl(filePath)

    return urlData.publicUrl
  }

  const handleNext = async () => {
    // Validasyon
    if (!files.personalausweisVorderseite && !formData.personalausweisVorderseite) {
      alert('❌ Personalausweis Vorderseite ist erforderlich!')
      return
    }

    if (!files.personalausweisRückseite && !formData.personalausweisRückseite) {
      alert('❌ Personalausweis Rückseite ist erforderlich!')
      return
    }

    if (!files.gewerbeschein && !formData.gewerbeschein) {
      alert('❌ Gewerbeschein ist erforderlich!')
      return
    }

    // GmbH/UG/e.K. için Handelsregisterauszug zorunlu
    if ((formData.businessType === 'GmbH' || formData.businessType === 'UG' || formData.businessType === 'e.K.') &&
        !files.handelsregisterauszug && !formData.handelsregisterauszug) {
      alert(`❌ Für ${formData.businessType} ist ein Handelsregisterauszug erforderlich!`)
      return
    }

    try {
      setUploading(true)

      const uploadedUrls: Record<string, string> = {
        personalausweisVorderseite: formData.personalausweisVorderseite || '',
        personalausweisRückseite: formData.personalausweisRückseite || '',
        meldebescheinigung: formData.meldebescheinigung || '',
        gewerbeschein: formData.gewerbeschein || '',
        handelsregisterauszug: formData.handelsregisterauszug || ''
      }

      // Dosyaları yükle
      if (files.personalausweisVorderseite) {
        setUploadProgress({ ...uploadProgress, personalausweisVorderseite: true })
        uploadedUrls.personalausweisVorderseite = await uploadFile(
          files.personalausweisVorderseite,
          'personalausweis',
          'vorderseite'
        )
      }

      if (files.personalausweisRückseite) {
        setUploadProgress({ ...uploadProgress, personalausweisRückseite: true })
        uploadedUrls.personalausweisRückseite = await uploadFile(
          files.personalausweisRückseite,
          'personalausweis',
          'rückseite'
        )
      }

      if (files.meldebescheinigung) {
        setUploadProgress({ ...uploadProgress, meldebescheinigung: true })
        uploadedUrls.meldebescheinigung = await uploadFile(
          files.meldebescheinigung,
          'meldebescheinigung',
          'adresse'
        )
      }

      if (files.gewerbeschein) {
        setUploadProgress({ ...uploadProgress, gewerbeschein: true })
        uploadedUrls.gewerbeschein = await uploadFile(
          files.gewerbeschein,
          'gewerbeschein',
          'gewerbe'
        )
      }

      if (files.handelsregisterauszug) {
        setUploadProgress({ ...uploadProgress, handelsregisterauszug: true })
        uploadedUrls.handelsregisterauszug = await uploadFile(
          files.handelsregisterauszug,
          'handelsregister',
          'auszug'
        )
      }

      // Context'e kaydet
      updateFormData(uploadedUrls)

      // Sonraki adıma geç
      router.push('/seller-application/step-5')
    } catch (error: any) {
      alert(error.message || 'Fehler beim Hochladen. Bitte versuchen Sie es erneut.')
    } finally {
      setUploading(false)
      setUploadProgress({})
    }
  }

  const FileUploadBox = ({
    field,
    label,
    required = false,
    description,
    info
  }: {
    field: string
    label: string
    required?: boolean
    description: string
    info?: string
  }) => (
    <div>
      <label className="block text-sm font-semibold mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      {previews[field] ? (
        <div className="relative">
          <div className="border-2 border-green-500/50 rounded-xl p-4 bg-green-500/10">
            <div className="flex items-center gap-4">
              <FileCheck className="w-10 h-10 text-green-500" />
              <div className="flex-1">
                <p className="font-semibold text-green-600">✓ Dokument hochgeladen</p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
              <button
                onClick={() => removeFile(field)}
                className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                disabled={uploading}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary transition-colors bg-secondary/30">
          <Upload className="w-8 h-8 text-muted-foreground mb-2" />
          <span className="text-sm font-medium">{label}</span>
          <span className="text-xs text-muted-foreground mt-1">{description}</span>
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={(e) => handleFileChange(field, e)}
            className="hidden"
            disabled={uploading}
          />
        </label>
      )}

      {info && (
        <p className="text-xs text-blue-500 mt-2 flex items-start gap-1">
          <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <span>{info}</span>
        </p>
      )}
    </div>
  )

  const requiresHandelsregister = formData.businessType === 'GmbH' || formData.businessType === 'UG' || formData.businessType === 'e.K.'

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-background to-secondary/20">
      <FloatingParticles />

      <section className="relative py-12 px-4">
        <div className="container mx-auto max-w-3xl">
          {/* Progress */}
          <div className="mb-8">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-semibold text-primary">Schritt 4/5</span>
              <span className="text-muted-foreground">Dokumente</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-primary w-[80%] transition-all duration-300"></div>
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
                <Upload className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Dokumente hochladen</h1>
                <p className="text-sm text-muted-foreground">Für die Identitätsprüfung erforderlich</p>
              </div>
            </div>

            <div className="space-y-6">
              <FileUploadBox
                field="personalausweisVorderseite"
                label="Personalausweis Vorderseite"
                required
                description="PNG, JPG oder PDF (max 10MB)"
                info="Aktueller deutscher Personalausweis oder Reisepass"
              />

              <FileUploadBox
                field="personalausweisRückseite"
                label="Personalausweis Rückseite"
                required
                description="PNG, JPG oder PDF (max 10MB)"
                info="Beide Seiten müssen gut lesbar sein"
              />

              <FileUploadBox
                field="gewerbeschein"
                label="Gewerbeschein / Gewerbeanmeldung"
                required
                description="Vom Gewerbeamt ausgestellt (max 10MB)"
                info="Erforderlich für den Verkauf auf unserer Plattform. Erhältlich bei Ihrem zuständigen Gewerbeamt."
              />

              <FileUploadBox
                field="meldebescheinigung"
                label="Meldebescheinigung"
                description="Aktuell (nicht älter als 3 Monate)"
                info="Optional, aber empfohlen. Erhältlich bei Ihrem Bürgeramt."
              />

              {requiresHandelsregister && (
                <FileUploadBox
                  field="handelsregisterauszug"
                  label={`Handelsregisterauszug (${formData.businessType})`}
                  required
                  description="Aktueller Auszug (nicht älter als 3 Monate)"
                  info={`Für ${formData.businessType} erforderlich. Erhältlich beim Handelsregister oder über www.handelsregister.de`}
                />
              )}

              {/* Wichtiger Hinweis */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-blue-500 mb-1">Datenschutz & Sicherheit</p>
                  <p className="text-muted-foreground">
                    Alle hochgeladenen Dokumente werden verschlüsselt gespeichert und dienen ausschließlich
                    der Identitätsprüfung gemäß Geldwäschegesetz (GwG). Nach erfolgreicher Verifizierung
                    werden die Dokumente sicher archiviert.
                  </p>
                </div>
              </div>

              {/* Gewerbeanmeldung Info */}
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
                <p className="text-sm font-semibold text-yellow-600 mb-2">
                  📋 Gewerbeanmeldung noch nicht vorhanden?
                </p>
                <p className="text-sm text-muted-foreground mb-2">
                  Sie können einen Gewerbeschein bei Ihrem zuständigen Gewerbeamt beantragen.
                  In den meisten Städten ist dies auch online möglich.
                </p>
                <p className="text-xs text-muted-foreground">
                  Kosten: ca. 20-60€ | Dauer: sofort bis 2 Wochen
                </p>
              </div>
            </div>
          </motion.div>

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <button
              onClick={() => router.push('/seller-application/step-3')}
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
              {uploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Wird hochgeladen...
                </>
              ) : (
                <>
                  Weiter
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
