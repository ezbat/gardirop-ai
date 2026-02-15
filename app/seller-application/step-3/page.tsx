"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowRight, ArrowLeft, CreditCard, FileText, AlertCircle, Info, CheckCircle, Loader2 } from 'lucide-react'
import FloatingParticles from '@/components/floating-particles'
import { useSellerApplication } from '@/lib/seller-application-context'

export default function Step3Page() {
  const router = useRouter()
  const { formData, updateFormData } = useSellerApplication()

  const [localData, setLocalData] = useState({
    iban: formData.iban || '',
    bic: formData.bic || '',
    bankName: formData.bankName || '',
    accountHolderName: formData.accountHolderName || '',
    steuernummer: formData.steuernummer || '',
    ustIdNr: formData.ustIdNr || '',
    finanzamt: formData.finanzamt || '',
    kleinunternehmer: formData.kleinunternehmer || false,
  })

  const [validating, setValidating] = useState<{
    iban: boolean
    vat: boolean
  }>({ iban: false, vat: false })

  const [validated, setValidated] = useState<{
    iban: boolean
    vat: boolean
  }>({ iban: false, vat: false })

  const validateIBAN = (iban: string) => {
    const cleaned = iban.replace(/\s/g, '')
    // Almanya IBAN: DE + 2 kontrol hanesi + 8 hane banka kodu + 10 hane hesap numarası = 22 karakter
    return cleaned.startsWith('DE') && cleaned.length === 22
  }

  const validateBIC = (bic: string) => {
    // BIC: 8 veya 11 karakter
    return bic.length === 8 || bic.length === 11
  }

  const validateSteuernummer = (steuer: string) => {
    // Alman vergi numarası formatı: 11 haneli (örn: 12/345/67890)
    const cleaned = steuer.replace(/[^0-9]/g, '')
    return cleaned.length >= 10 && cleaned.length <= 13
  }

  const formatIBAN = (value: string) => {
    const cleaned = value.replace(/\s/g, '').toUpperCase()
    return cleaned.match(/.{1,4}/g)?.join(' ') || cleaned
  }

  const handleValidateIBAN = async () => {
    if (!localData.iban || !validateIBAN(localData.iban)) {
      alert('❌ Bitte geben Sie zuerst eine gültige IBAN ein!')
      return
    }

    setValidating({ ...validating, iban: true })

    try {
      const response = await fetch('/api/validate/iban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          iban: localData.iban,
          bic: localData.bic
        })
      })

      const data = await response.json()

      if (data.iban?.valid) {
        setValidated({ ...validated, iban: true })
        // Banka adını otomatik doldur
        if (data.iban.bankName && !localData.bankName) {
          setLocalData({ ...localData, bankName: data.iban.bankName })
        }
        alert(`✅ ${data.iban.message}\n\nBankleitzahl: ${data.iban.bankCode}\n${data.iban.bankName || ''}`)
      } else {
        setValidated({ ...validated, iban: false })
        alert(`❌ ${data.iban?.error || 'IBAN konnte nicht verifiziert werden'}`)
      }
    } catch (error) {
      alert('❌ Fehler bei der IBAN-Validierung. Bitte versuchen Sie es erneut.')
    } finally {
      setValidating({ ...validating, iban: false })
    }
  }

  const handleValidateVAT = async () => {
    if (!localData.ustIdNr || localData.ustIdNr.length < 9) {
      alert('❌ Bitte geben Sie zuerst eine USt-IdNr ein!')
      return
    }

    setValidating({ ...validating, vat: true })

    try {
      const response = await fetch('/api/validate/vat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vatNumber: localData.ustIdNr })
      })

      const data = await response.json()

      if (data.valid) {
        setValidated({ ...validated, vat: true })
        alert(`✅ ${data.message}\n\nFirma: ${data.companyName || 'N/A'}\nAdresse: ${data.address || 'N/A'}`)
      } else {
        setValidated({ ...validated, vat: false })
        alert(`❌ ${data.error || 'USt-IdNr konnte nicht verifiziert werden'}`)
      }
    } catch (error) {
      alert('❌ Fehler bei der USt-IdNr-Validierung. VIES-Dienst ist möglicherweise nicht erreichbar.')
    } finally {
      setValidating({ ...validating, vat: false })
    }
  }

  const handleNext = () => {
    // Validasyon
    if (!localData.iban || !validateIBAN(localData.iban)) {
      alert('❌ Bitte geben Sie eine gültige deutsche IBAN ein! (DE + 20 Ziffern)')
      return
    }

    if (!localData.bic || !validateBIC(localData.bic)) {
      alert('❌ Bitte geben Sie einen gültigen BIC/SWIFT-Code ein! (8 oder 11 Zeichen)')
      return
    }

    if (!localData.bankName || localData.bankName.length < 2) {
      alert('❌ Bitte geben Sie den Banknamen ein!')
      return
    }

    if (!localData.accountHolderName || localData.accountHolderName.length < 3) {
      alert('❌ Bitte geben Sie den Kontoinhaber ein!')
      return
    }

    if (!localData.steuernummer || !validateSteuernummer(localData.steuernummer)) {
      alert('❌ Bitte geben Sie eine gültige Steuernummer ein!')
      return
    }

    if (!localData.finanzamt || localData.finanzamt.length < 3) {
      alert('❌ Bitte geben Sie Ihr Finanzamt an!')
      return
    }

    // Kleinunternehmer değilse USt-IdNr zorunlu
    if (!localData.kleinunternehmer && (!localData.ustIdNr || localData.ustIdNr.length < 9)) {
      alert('❌ USt-IdNr ist erforderlich (oder aktivieren Sie Kleinunternehmerregelung §19 UStG)')
      return
    }

    // Context'e kaydet
    updateFormData(localData)

    // Sonraki adıma geç
    router.push('/seller-application/step-4')
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-background to-secondary/20">
      <FloatingParticles />

      <section className="relative py-12 px-4">
        <div className="container mx-auto max-w-3xl">
          {/* Progress */}
          <div className="mb-8">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-semibold text-primary">Schritt 3/5</span>
              <span className="text-muted-foreground">Bank & Steuer</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-primary w-[60%] transition-all duration-300"></div>
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
                <CreditCard className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Bank- und Steuerinformationen</h1>
                <p className="text-sm text-muted-foreground">Für Auszahlungen und steuerliche Pflichten</p>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-6 flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-blue-500 mb-1">Sichere Auszahlung über Stripe Connect</p>
                <p className="text-muted-foreground">
                  Ihre Verkaufserlöse werden über Stripe Connect direkt auf Ihr Konto überwiesen.
                  Alle Angaben werden verschlüsselt gespeichert.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="font-semibold flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                Bankverbindung
              </h3>

              {/* IBAN & BIC */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    IBAN <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={localData.iban}
                      onChange={(e) => {
                        setLocalData({ ...localData, iban: formatIBAN(e.target.value) })
                        setValidated({ ...validated, iban: false })
                      }}
                      className="flex-1 px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary focus:outline-none font-mono text-sm"
                      placeholder="DE89 3704 0044 0532 0130 00"
                      maxLength={27}
                    />
                    <button
                      type="button"
                      onClick={handleValidateIBAN}
                      disabled={validating.iban || !localData.iban}
                      className={`px-4 py-3 rounded-xl font-semibold transition-colors whitespace-nowrap ${
                        validated.iban
                          ? 'bg-green-500 text-white'
                          : 'bg-secondary hover:bg-secondary/80'
                      } disabled:opacity-50`}
                    >
                      {validating.iban ? '⏳' : validated.iban ? '✓' : 'Prüfen'}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Deutsche IBAN (22 Zeichen)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">
                    BIC/SWIFT <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={localData.bic}
                    onChange={(e) => setLocalData({ ...localData, bic: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary focus:outline-none font-mono"
                    placeholder="COBADEFFXXX"
                    maxLength={11}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Bank Identifier Code
                  </p>
                </div>
              </div>

              {/* Bank & Kontoinhaber */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Bankname <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={localData.bankName}
                    onChange={(e) => setLocalData({ ...localData, bankName: e.target.value })}
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary focus:outline-none"
                    placeholder="Sparkasse, Deutsche Bank, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Kontoinhaber <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={localData.accountHolderName}
                    onChange={(e) => setLocalData({ ...localData, accountHolderName: e.target.value })}
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary focus:outline-none"
                    placeholder="Max Mustermann"
                  />
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-border pt-6">
                <h3 className="font-semibold flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-primary" />
                  Steuerliche Angaben
                </h3>
              </div>

              {/* Steuernummer & Finanzamt */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Steuernummer <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={localData.steuernummer}
                    onChange={(e) => setLocalData({ ...localData, steuernummer: e.target.value })}
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary focus:outline-none font-mono"
                    placeholder="12/345/67890"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    11-13 stellige Steuernummer
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Finanzamt <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={localData.finanzamt}
                    onChange={(e) => setLocalData({ ...localData, finanzamt: e.target.value })}
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary focus:outline-none"
                    placeholder="Finanzamt Berlin-Mitte"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Zuständiges Finanzamt
                  </p>
                </div>
              </div>

              {/* Kleinunternehmer Checkbox */}
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localData.kleinunternehmer}
                    onChange={(e) => setLocalData({ ...localData, kleinunternehmer: e.target.checked })}
                    className="mt-1 w-5 h-5 rounded border-border"
                  />
                  <div className="text-sm">
                    <p className="font-semibold mb-1">Kleinunternehmerregelung nach §19 UStG</p>
                    <p className="text-muted-foreground">
                      Ich bin Kleinunternehmer und weise keine Umsatzsteuer aus. Mein Jahresumsatz
                      liegt unter 22.000€ (voraussichtlich unter 50.000€ im Folgejahr).
                    </p>
                  </div>
                </label>
              </div>

              {/* USt-IdNr - nur wenn NICHT Kleinunternehmer */}
              {!localData.kleinunternehmer && (
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Umsatzsteuer-Identifikationsnummer (USt-IdNr) <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={localData.ustIdNr}
                      onChange={(e) => {
                        setLocalData({ ...localData, ustIdNr: e.target.value.toUpperCase() })
                        setValidated({ ...validated, vat: false })
                      }}
                      className="flex-1 px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary focus:outline-none font-mono"
                      placeholder="DE123456789"
                      maxLength={11}
                    />
                    <button
                      type="button"
                      onClick={handleValidateVAT}
                      disabled={validating.vat || !localData.ustIdNr}
                      className={`px-4 py-3 rounded-xl font-semibold transition-colors whitespace-nowrap ${
                        validated.vat
                          ? 'bg-green-500 text-white'
                          : 'bg-secondary hover:bg-secondary/80'
                      } disabled:opacity-50`}
                    >
                      {validating.vat ? '⏳' : validated.vat ? '✓' : 'Prüfen'}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Format: DE + 9 Ziffern (bei Bundeszentralamt für Steuern beantragen)
                  </p>
                  <p className="text-xs text-blue-500 mt-1">
                    💡 Klicken Sie auf "Prüfen" um die USt-IdNr über EU VIES zu verifizieren
                  </p>
                </div>
              )}

              {/* Wichtiger Hinweis */}
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex gap-3">
                <Info className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-red-500 mb-1">Wichtiger Hinweis</p>
                  <p className="text-muted-foreground">
                    Die Plattform behält 15% Provision ein. Sie sind selbst verantwortlich für die
                    ordnungsgemäße Versteuerung Ihrer Einkünfte beim Finanzamt. Bei Fragen wenden Sie
                    sich bitte an einen Steuerberater.
                  </p>
                </div>
              </div>

              {/* Gewerbeanmeldung Info */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex gap-3">
                <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-blue-500 mb-1">Gewerbeanmeldung erforderlich</p>
                  <p className="text-muted-foreground">
                    Für den Verkauf auf unserer Plattform benötigen Sie einen Gewerbeschein.
                    Im nächsten Schritt müssen Sie Ihren Gewerbeschein hochladen.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <button
              onClick={() => router.push('/seller-application/step-2')}
              className="px-6 py-3 border border-border rounded-xl font-semibold hover:bg-secondary transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Zurück
            </button>

            <button
              onClick={handleNext}
              className="px-8 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              Weiter
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
