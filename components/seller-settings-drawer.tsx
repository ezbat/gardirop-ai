"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import {
  X, Save, Loader2,
  Building2, CreditCard, MapPin, Bell, Shield, Key,
  ChevronRight,
} from 'lucide-react'
import { useLanguage } from '@/lib/language-context'

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

type SettingsTab = 'profile' | 'address' | 'payment' | 'notifications' | 'security'

const TABS: { id: SettingsTab; icon: any; labelKey: string; fallback: string }[] = [
  { id: 'profile', icon: Building2, labelKey: 'shopInfo', fallback: 'Shop Info' },
  { id: 'address', icon: MapPin, labelKey: 'addressInfo', fallback: 'Address' },
  { id: 'payment', icon: CreditCard, labelKey: 'paymentInfo', fallback: 'Payment' },
  { id: 'notifications', icon: Bell, labelKey: 'notificationsHub', fallback: 'Notifications' },
  { id: 'security', icon: Shield, labelKey: 'securityLabel', fallback: 'Security' },
]

export default function SellerSettingsDrawer({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { data: session } = useSession()
  const { t } = useLanguage()
  const userId = session?.user?.id

  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [isLocked, setIsLocked] = useState(false)
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
    paypal_email: '',
  })

  useEffect(() => {
    if (open && userId) loadSettings()
  }, [open, userId])

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (open) window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/seller/settings', {
        headers: { 'x-user-id': userId! },
      })
      const data = await response.json()
      if (response.ok && data.seller) {
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
          paypal_email: data.seller.paypal_email || '',
        })
      }
    } catch (e) {
      console.error('Load settings error:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!userId) return
    setSaving(true)
    setSaveSuccess(false)
    try {
      const response = await fetch('/api/seller/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
        body: JSON.stringify(formData),
      })
      if (response.ok) {
        setSaveSuccess(true)
        if (formData.iban || formData.paypal_email) setIsLocked(true)
        setTimeout(() => setSaveSuccess(false), 3000)
      }
    } catch (e) {
      console.error('Save error:', e)
    } finally {
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 12,
    border: '1px solid oklch(0.25 0.01 285)',
    background: 'oklch(0.12 0.01 285)',
    color: 'oklch(0.95 0.005 285)',
    fontSize: 14,
    outline: 'none',
    transition: 'border-color 0.2s',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: 'oklch(0.65 0.01 285)',
    marginBottom: 6,
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'oklch(0 0 0 / 0.5)',
          backdropFilter: 'blur(4px)',
          zIndex: 60,
          animation: 'fadeIn 0.2s ease',
        }}
      />

      {/* Drawer */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 480,
          maxWidth: '100vw',
          background: 'oklch(0.10 0.02 285)',
          borderLeft: '1px solid oklch(0.22 0.01 285)',
          zIndex: 61,
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideInRight 0.3s ease',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid oklch(0.22 0.01 285)',
          }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'oklch(0.95 0.005 285)', margin: 0 }}>
            {(t as any)('settings') || 'Settings'}
          </h2>
          <button
            onClick={onClose}
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'oklch(1 0 0 / 0.06)',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={18} style={{ color: 'oklch(0.65 0.01 285)' }} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            gap: 4,
            padding: '12px 20px',
            borderBottom: '1px solid oklch(0.22 0.01 285)',
            overflowX: 'auto',
          }}
        >
          {TABS.map((tab) => {
            const Icon = tab.icon
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 14px',
                  borderRadius: 10,
                  border: 'none',
                  background: active ? 'oklch(0.78 0.14 85 / 0.12)' : 'transparent',
                  color: active ? 'oklch(0.78 0.14 85)' : 'oklch(0.55 0.01 285)',
                  fontWeight: active ? 600 : 500,
                  fontSize: 12,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  transition: 'all 0.2s',
                }}
              >
                <Icon size={14} />
                {(t as any)(tab.labelKey) || tab.fallback}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 60 }}>
              <Loader2 size={24} style={{ color: 'oklch(0.78 0.14 85)', animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : (
            <>
              {/* PROFILE TAB */}
              {activeTab === 'profile' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={labelStyle}>Shop Name *</label>
                    <input
                      type="text"
                      value={formData.shop_name}
                      onChange={(e) => setFormData({ ...formData, shop_name: e.target.value })}
                      style={inputStyle}
                      required
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>{(t as any)('shopDescription') || 'Description'}</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      style={{ ...inputStyle, resize: 'vertical' }}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>{(t as any)('phone') || 'Phone'}</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      style={inputStyle}
                      placeholder="+49 123 456789"
                    />
                  </div>
                </div>
              )}

              {/* ADDRESS TAB */}
              {activeTab === 'address' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={labelStyle}>{(t as any)('address') || 'Street'}</label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={labelStyle}>PLZ</label>
                      <input
                        type="text"
                        value={formData.postal_code}
                        onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>{(t as any)('city') || 'City'}</label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        style={inputStyle}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>{(t as any)('country') || 'Country'}</label>
                    <input
                      type="text"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      style={inputStyle}
                    />
                  </div>
                </div>
              )}

              {/* PAYMENT TAB */}
              {activeTab === 'payment' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {isLocked && (
                    <div style={{
                      padding: '12px 16px',
                      borderRadius: 12,
                      background: 'oklch(0.82 0.17 85 / 0.08)',
                      border: '1px solid oklch(0.82 0.17 85 / 0.2)',
                    }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: 'oklch(0.82 0.17 85)', margin: 0 }}>
                        Payment info locked. Contact support to change.
                      </p>
                    </div>
                  )}
                  <div>
                    <label style={labelStyle}>Bank Name</label>
                    <input
                      type="text"
                      value={formData.bank_name}
                      onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                      disabled={isLocked}
                      style={{ ...inputStyle, opacity: isLocked ? 0.5 : 1 }}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Account Holder</label>
                    <input
                      type="text"
                      value={formData.account_holder}
                      onChange={(e) => setFormData({ ...formData, account_holder: e.target.value })}
                      disabled={isLocked}
                      style={{ ...inputStyle, opacity: isLocked ? 0.5 : 1 }}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>IBAN</label>
                    <input
                      type="text"
                      value={formData.iban}
                      onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
                      disabled={isLocked}
                      style={{ ...inputStyle, opacity: isLocked ? 0.5 : 1 }}
                      placeholder="DE89 3704 0044 0532 0130 00"
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>PayPal Email</label>
                    <input
                      type="email"
                      value={formData.paypal_email}
                      onChange={(e) => setFormData({ ...formData, paypal_email: e.target.value })}
                      disabled={isLocked}
                      style={{ ...inputStyle, opacity: isLocked ? 0.5 : 1 }}
                    />
                  </div>
                </div>
              )}

              {/* NOTIFICATIONS TAB */}
              {activeTab === 'notifications' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {['New Orders', 'Low Stock', 'Reviews', 'Promotions', 'Weekly Reports'].map((item) => (
                    <div
                      key={item}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        borderRadius: 12,
                        background: 'oklch(0.14 0.01 285)',
                        border: '1px solid oklch(0.22 0.01 285)',
                      }}
                    >
                      <span style={{ fontSize: 13, color: 'oklch(0.85 0.005 285)' }}>{item}</span>
                      <input type="checkbox" defaultChecked style={{ accentColor: 'oklch(0.78 0.14 85)' }} />
                    </div>
                  ))}
                </div>
              )}

              {/* SECURITY TAB */}
              {activeTab === 'security' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div
                    style={{
                      padding: '16px',
                      borderRadius: 12,
                      background: 'oklch(0.14 0.01 285)',
                      border: '1px solid oklch(0.22 0.01 285)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: 'oklch(0.85 0.005 285)', margin: 0 }}>
                          Two-Factor Auth
                        </p>
                        <p style={{ fontSize: 11, color: 'oklch(0.50 0.01 285)', margin: '4px 0 0' }}>
                          Extra security for your account
                        </p>
                      </div>
                      <ChevronRight size={16} style={{ color: 'oklch(0.50 0.01 285)' }} />
                    </div>
                  </div>
                  <div
                    style={{
                      padding: '16px',
                      borderRadius: 12,
                      background: 'oklch(0.14 0.01 285)',
                      border: '1px solid oklch(0.22 0.01 285)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: 'oklch(0.85 0.005 285)', margin: 0 }}>
                          Change Password
                        </p>
                        <p style={{ fontSize: 11, color: 'oklch(0.50 0.01 285)', margin: '4px 0 0' }}>
                          Update your login credentials
                        </p>
                      </div>
                      <ChevronRight size={16} style={{ color: 'oklch(0.50 0.01 285)' }} />
                    </div>
                  </div>
                  <div
                    style={{
                      padding: '16px',
                      borderRadius: 12,
                      background: 'oklch(0.14 0.01 285)',
                      border: '1px solid oklch(0.22 0.01 285)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: 'oklch(0.85 0.005 285)', margin: 0 }}>
                          API Keys
                        </p>
                        <p style={{ fontSize: 11, color: 'oklch(0.50 0.01 285)', margin: '4px 0 0' }}>
                          Manage your API access tokens
                        </p>
                      </div>
                      <Key size={16} style={{ color: 'oklch(0.50 0.01 285)' }} />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Save Button */}
        {(activeTab === 'profile' || activeTab === 'address' || activeTab === 'payment') && (
          <div style={{
            padding: '16px 20px',
            borderTop: '1px solid oklch(0.22 0.01 285)',
          }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                width: '100%',
                height: 44,
                borderRadius: 12,
                border: 'none',
                background: saveSuccess
                  ? 'oklch(0.72 0.19 145)'
                  : 'linear-gradient(135deg, oklch(0.78 0.14 85), oklch(0.70 0.16 70))',
                color: '#000',
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'all 0.3s',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? (
                <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} />
              ) : saveSuccess ? (
                '✓ Saved!'
              ) : (
                <>
                  <Save size={16} />
                  {(t as any)('save') || 'Save'}
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Animations */}
      <style jsx global>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  )
}
