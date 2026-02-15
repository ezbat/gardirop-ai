"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Settings, Loader2, Save, Building2, CreditCard, MapPin, Phone, Mail, ArrowLeft } from "lucide-react"
import FloatingParticles from "@/components/floating-particles"
import Link from "next/link"

interface SellerSettings {
  shop_name: string
  description: string
  phone: string
  address: string
  city: string
  postal_code: string
  country: string
  bank_name: string
  account_holder: string
  iban: string
  paypal_email: string
}

export default function SellerSettingsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const userId = session?.user?.id

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isLocked, setIsLocked] = useState(false) // If payment info is saved, lock it
  const [formData, setFormData] = useState<SellerSettings>({
    shop_name: '',
    description: '',
    phone: '',
    address: '',
    city: '',
    postal_code: '',
    country: 'Deutschland',
    bank_name: '',
    account_holder: '',
    iban: '',
    paypal_email: ''
  })

  useEffect(() => {
    if (userId) {
      loadSettings()
    }
  }, [userId])

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/seller/settings', {
        headers: { 'x-user-id': userId! }
      })

      const data = await response.json()

      if (response.ok && data.seller) {
        // Check if payment info is already saved - if yes, lock editing
        const hasPaymentInfo = data.seller.iban || data.seller.paypal_email
        setIsLocked(!!hasPaymentInfo)

        setFormData({
          shop_name: data.seller.shop_name || '',
          description: data.seller.shop_description || '',
          phone: data.seller.phone || '',
          address: data.seller.address || '',
          city: data.seller.city || '',
          postal_code: data.seller.postal_code || '',
          country: data.seller.country || 'Deutschland',
          bank_name: data.seller.bank_name || '',
          account_holder: data.seller.account_holder || '',
          iban: data.seller.iban || '',
          paypal_email: data.seller.paypal_email || ''
        })
      }
    } catch (error) {
      console.error('Load settings error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return

    setSaving(true)
    try {
      const response = await fetch('/api/seller/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        alert('✅ Einstellungen erfolgreich gespeichert!')
        // Lock payment info after first save
        if (formData.iban || formData.paypal_email) {
          setIsLocked(true)
        }
      } else {
        alert('❌ Fehler beim Speichern!')
      }
    } catch (error) {
      console.error('Save settings error:', error)
      alert('❌ Ein Fehler ist aufgetreten!')
    } finally {
      setSaving(false)
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
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Link
              href="/seller/dashboard"
              className="p-2 hover:bg-primary/10 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div>
              <h1 className="font-serif text-3xl font-bold">Verkäufer-Einstellungen</h1>
              <p className="text-muted-foreground">Verwalten Sie Ihre Geschäftsinformationen</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Shop Information */}
            <div className="glass border border-border rounded-2xl p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Building2 className="w-6 h-6 text-primary" />
                Shop-Informationen
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Shop-Name *</label>
                  <input
                    type="text"
                    value={formData.shop_name}
                    onChange={(e) => setFormData({ ...formData, shop_name: e.target.value })}
                    required
                    className="w-full px-4 py-2 glass border border-border rounded-xl outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Beschreibung</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 glass border border-border rounded-xl outline-none focus:border-primary"
                    placeholder="Beschreiben Sie Ihr Geschäft..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Telefonnummer</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 glass border border-border rounded-xl outline-none focus:border-primary"
                    placeholder="+49 123 456789"
                  />
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div className="glass border border-border rounded-2xl p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <MapPin className="w-6 h-6 text-primary" />
                Adresse
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Straße und Hausnummer</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-4 py-2 glass border border-border rounded-xl outline-none focus:border-primary"
                    placeholder="Musterstraße 123"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Postleitzahl</label>
                    <input
                      type="text"
                      value={formData.postal_code}
                      onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                      className="w-full px-4 py-2 glass border border-border rounded-xl outline-none focus:border-primary"
                      placeholder="12345"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">Stadt</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-4 py-2 glass border border-border rounded-xl outline-none focus:border-primary"
                      placeholder="Berlin"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Land</label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full px-4 py-2 glass border border-border rounded-xl outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>

            {/* Payment Information */}
            <div className="glass border border-border rounded-2xl p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <CreditCard className="w-6 h-6 text-primary" />
                Zahlungsinformationen
              </h2>

              {isLocked ? (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl mb-4">
                  <p className="text-sm text-yellow-600 dark:text-yellow-400 font-semibold mb-2">
                    🔒 Zahlungsinformationen gesperrt
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Ihre Zahlungsinformationen wurden bereits gespeichert und können aus Sicherheitsgründen nicht geändert werden.
                    Wenn Sie Änderungen vornehmen möchten, kontaktieren Sie bitte den Support über die{' '}
                    <Link href="/seller/support" className="text-primary underline">Support-Seite</Link>.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mb-4">
                  Diese Informationen werden für Auszahlungen verwendet und können nur einmal eingegeben werden. Nach dem Speichern sind Änderungen nur über den Support möglich.
                </p>
              )}

              <div className="space-y-4">
                <div className="p-4 glass border border-border rounded-xl">
                  <h3 className="font-bold mb-3">Bankverbindung</h3>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-semibold mb-2">Bankname</label>
                      <input
                        type="text"
                        value={formData.bank_name}
                        onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                        disabled={isLocked}
                        className="w-full px-4 py-2 glass border border-border rounded-xl outline-none focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        placeholder="z.B. Deutsche Bank"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-2">Kontoinhaber</label>
                      <input
                        type="text"
                        value={formData.account_holder}
                        onChange={(e) => setFormData({ ...formData, account_holder: e.target.value })}
                        disabled={isLocked}
                        className="w-full px-4 py-2 glass border border-border rounded-xl outline-none focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        placeholder="Vollständiger Name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-2">IBAN</label>
                      <input
                        type="text"
                        value={formData.iban}
                        onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
                        disabled={isLocked}
                        className="w-full px-4 py-2 glass border border-border rounded-xl outline-none focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        placeholder="DE89 3704 0044 0532 0130 00"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 glass border border-border rounded-xl">
                  <h3 className="font-bold mb-3">PayPal (Optional)</h3>

                  <div>
                    <label className="block text-sm font-semibold mb-2">PayPal E-Mail</label>
                    <input
                      type="email"
                      value={formData.paypal_email}
                      onChange={(e) => setFormData({ ...formData, paypal_email: e.target.value })}
                      disabled={isLocked}
                      className="w-full px-4 py-2 glass border border-border rounded-xl outline-none focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="ihre@email.de"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <button
              type="submit"
              disabled={saving}
              className="w-full px-6 py-4 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Wird gespeichert...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Einstellungen speichern
                </>
              )}
            </button>
          </form>
        </div>
      </section>
    </div>
  )
}
