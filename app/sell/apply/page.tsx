'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ChevronRight, ChevronLeft, Check, AlertCircle, Info,
  User, Building2, Store, Truck, ClipboardCheck, CheckCircle2,
  Loader2, X,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const COUNTRIES = [
  'Deutschland', 'Österreich', 'Schweiz', 'Vereinigtes Königreich',
  'Frankreich', 'Niederlande', 'Belgien', 'Spanien', 'Italien',
  'Polen', 'Tschechien', 'Schweden', 'Dänemark', 'Norwegen',
  'Finnland', 'Portugal', 'Ungarn', 'Rumänien', 'Griechenland',
  'Türkei', 'Vereinigte Staaten', 'Kanada', 'Australien',
  'Sonstiges',
]

const SHIPPING_COUNTRIES = [
  'Deutschland', 'Österreich', 'Schweiz', 'EU (alle Länder)',
  'Vereinigtes Königreich', 'Frankreich', 'Niederlande', 'Belgien',
  'Spanien', 'Italien', 'Polen', 'Schweden', 'Dänemark',
  'Weltweit', 'Sonstiges',
]

const PRODUCT_CATEGORIES = [
  'Mode & Bekleidung', 'Schuhe & Taschen', 'Accessoires & Schmuck',
  'Sportwear & Outdoor', 'Unterwäsche & Nachtwäsche', 'Kinder & Baby',
  'Beauty & Pflege', 'Heimtextilien', 'Sonstiges',
]

const BUSINESS_TYPES = [
  'Einzelunternehmen / Freelancer',
  'GmbH / UG',
  'AG',
  'OHG / KG',
  'GbR',
  'Ausländisches Unternehmen',
  'Sonstiges',
]

const ESTIMATED_ORDERS = [
  '1–50 Bestellungen / Monat',
  '51–200 Bestellungen / Monat',
  '201–500 Bestellungen / Monat',
  '501–1.000 Bestellungen / Monat',
  'Über 1.000 Bestellungen / Monat',
]

const AVG_ORDER_VALUES = [
  'Unter €20', '€20–€50', '€50–€100', '€100–€250',
  '€250–€500', 'Über €500',
]

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface FormData {
  // Step 1 — Contact
  full_name: string
  email: string
  phone: string
  country: string
  applicant_type: 'individual' | 'company' | ''

  // Step 2 — Identity (individual)
  legal_full_name: string
  date_of_birth: string
  residence_country: string

  // Step 2 — Identity (company)
  company_name: string
  company_reg_number: string
  vat_id: string
  business_type: string
  company_address_line1: string
  company_address_line2: string
  company_address_city: string
  company_address_postal: string
  company_address_country: string

  // Step 3 — Store profile
  store_name: string
  brand_name: string
  product_categories: string[]
  store_description: string
  website_url: string
  social_instagram: string
  social_tiktok: string
  social_youtube: string
  estimated_monthly_orders: string
  avg_order_value: string
  product_origin: 'own_brand' | 'resale' | 'handmade' | 'other' | ''
  product_origin_detail: string

  // Step 4 — Operations & compliance
  return_address_line1: string
  return_address_city: string
  return_address_postal: string
  return_address_country: string
  support_email: string
  shipping_countries: string[]
  fulfillment_model: 'self' | 'warehouse' | 'dropshipping' | ''

  // Declarations
  decl_accurate_info: boolean
  decl_terms_agreed: boolean
  decl_verification_consent: boolean
  decl_product_compliance: boolean
  decl_privacy_acknowledged: boolean
  decl_is_trader: boolean
}

type StepErrors = Record<string, string>

const EMPTY_FORM: FormData = {
  full_name: '', email: '', phone: '', country: '', applicant_type: '',
  legal_full_name: '', date_of_birth: '', residence_country: '',
  company_name: '', company_reg_number: '', vat_id: '', business_type: '',
  company_address_line1: '', company_address_line2: '',
  company_address_city: '', company_address_postal: '', company_address_country: '',
  store_name: '', brand_name: '', product_categories: [],
  store_description: '', website_url: '',
  social_instagram: '', social_tiktok: '', social_youtube: '',
  estimated_monthly_orders: '', avg_order_value: '',
  product_origin: '', product_origin_detail: '',
  return_address_line1: '', return_address_city: '',
  return_address_postal: '', return_address_country: '',
  support_email: '', shipping_countries: [], fulfillment_model: '',
  decl_accurate_info: false, decl_terms_agreed: false,
  decl_verification_consent: false, decl_product_compliance: false,
  decl_privacy_acknowledged: false, decl_is_trader: false,
}

const STORAGE_KEY = 'seller_application_draft'

// ─────────────────────────────────────────────────────────────────────────────
// Validation helpers
// ─────────────────────────────────────────────────────────────────────────────

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
const isUrl = (v: string) => {
  if (!v.trim()) return true
  try { new URL(v.startsWith('http') ? v : `https://${v}`); return true } catch { return false }
}

function validateStep(step: number, data: FormData): StepErrors {
  const err: StepErrors = {}

  if (step === 1) {
    if (!data.full_name.trim())                  err.full_name = 'Vollständiger Name erforderlich'
    if (!data.email.trim())                      err.email = 'E-Mail-Adresse erforderlich'
    else if (!isEmail(data.email))               err.email = 'Ungültige E-Mail-Adresse'
    if (!data.country)                           err.country = 'Bitte Land auswählen'
    if (!data.applicant_type)                    err.applicant_type = 'Bitte Art des Antragstellers wählen'
  }

  if (step === 2) {
    if (data.applicant_type === 'individual') {
      if (!data.legal_full_name.trim())          err.legal_full_name = 'Rechtlicher Name erforderlich'
      if (!data.residence_country)               err.residence_country = 'Wohnsitzland erforderlich'
    }
    if (data.applicant_type === 'company') {
      if (!data.company_name.trim())             err.company_name = 'Unternehmensname erforderlich'
      if (!data.business_type)                   err.business_type = 'Unternehmensform erforderlich'
      if (!data.company_address_line1.trim())    err.company_address_line1 = 'Straße & Hausnummer erforderlich'
      if (!data.company_address_city.trim())     err.company_address_city = 'Stadt erforderlich'
      if (!data.company_address_country)         err.company_address_country = 'Land erforderlich'
    }
  }

  if (step === 3) {
    if (!data.store_name.trim())                 err.store_name = 'Store-Name erforderlich'
    if (data.product_categories.length === 0)   err.product_categories = 'Mindestens eine Kategorie wählen'
    if (!data.store_description.trim())          err.store_description = 'Store-Beschreibung erforderlich'
    else if (data.store_description.trim().length < 30)
                                                 err.store_description = 'Mindestens 30 Zeichen'
    if (data.website_url && !isUrl(data.website_url))
                                                 err.website_url = 'Ungültige URL'
    if (!data.product_origin)                   err.product_origin = 'Produktherkunft erforderlich'
    if (!data.estimated_monthly_orders)         err.estimated_monthly_orders = 'Bitte Schätzung angeben'
  }

  if (step === 4) {
    if (!data.return_address_line1.trim())       err.return_address_line1 = 'Retourenstraße erforderlich'
    if (!data.return_address_city.trim())        err.return_address_city = 'Stadt erforderlich'
    if (!data.return_address_country)            err.return_address_country = 'Land erforderlich'
    if (!data.support_email.trim())              err.support_email = 'Support-E-Mail erforderlich'
    else if (!isEmail(data.support_email))       err.support_email = 'Ungültige E-Mail-Adresse'
    if (data.shipping_countries.length === 0)   err.shipping_countries = 'Mindestens ein Versandland wählen'
    if (!data.fulfillment_model)                 err.fulfillment_model = 'Fulfillment-Modell erforderlich'
    if (!data.decl_accurate_info)               err.decl_accurate_info = 'Pflichtfeld'
    if (!data.decl_terms_agreed)                err.decl_terms_agreed = 'Pflichtfeld'
    if (!data.decl_verification_consent)        err.decl_verification_consent = 'Pflichtfeld'
    if (!data.decl_product_compliance)          err.decl_product_compliance = 'Pflichtfeld'
    if (!data.decl_privacy_acknowledged)        err.decl_privacy_acknowledged = 'Pflichtfeld'
  }

  return err
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function Field({
  label, required, helper, error, children,
}: {
  label: string
  required?: boolean
  helper?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-[6px]">
      <label className="text-[13px] font-semibold" style={{ color: '#1A1A1A' }}>
        {label}
        {required && <span className="ml-[3px]" style={{ color: '#DC2626' }}>*</span>}
      </label>
      {children}
      {helper && !error && (
        <p className="text-[11px] flex items-start gap-[4px]" style={{ color: '#888' }}>
          <Info className="w-[12px] h-[12px] flex-shrink-0 mt-[1px]" />
          {helper}
        </p>
      )}
      {error && (
        <p className="text-[11px] flex items-start gap-[4px]" style={{ color: '#DC2626' }}>
          <AlertCircle className="w-[12px] h-[12px] flex-shrink-0 mt-[1px]" />
          {error}
        </p>
      )}
    </div>
  )
}

const inputClass = (hasErr?: boolean) =>
  `w-full px-[12px] py-[10px] rounded-[8px] text-[14px] outline-none transition-all duration-150 ` +
  `border ${hasErr
    ? 'border-red-400 bg-red-50 focus:ring-2 focus:ring-red-200'
    : 'border-[#E5E5E5] bg-white focus:border-[#D97706] focus:ring-2 focus:ring-amber-100'
  }`

const selectClass = (hasErr?: boolean) =>
  `w-full px-[12px] py-[10px] rounded-[8px] text-[14px] outline-none transition-all duration-150 ` +
  `border appearance-none bg-white ${hasErr
    ? 'border-red-400 focus:ring-2 focus:ring-red-200'
    : 'border-[#E5E5E5] focus:border-[#D97706] focus:ring-2 focus:ring-amber-100'
  }`

function CheckboxRow({
  id, checked, onChange, label, sub, error,
}: {
  id: string
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  sub?: string
  error?: string
}) {
  return (
    <label
      htmlFor={id}
      className="flex gap-[12px] items-start cursor-pointer p-[14px] rounded-[10px] transition-colors duration-150"
      style={{
        background: checked ? '#FFFBEB' : '#FAFAFA',
        border: `1px solid ${checked ? '#D97706' : error ? '#FCA5A5' : '#E5E5E5'}`,
      }}
    >
      <div
        className="w-[18px] h-[18px] rounded-[4px] flex-shrink-0 flex items-center justify-center mt-[1px] transition-all duration-150"
        style={{
          background: checked ? '#D97706' : 'white',
          border: `2px solid ${checked ? '#D97706' : error ? '#EF4444' : '#D1D5DB'}`,
        }}
      >
        {checked && <Check className="w-[11px] h-[11px] text-white" strokeWidth={3} />}
      </div>
      <input
        id={id}
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <div className="flex-1">
        <p className="text-[13px] font-medium leading-snug" style={{ color: '#1A1A1A' }}>{label}</p>
        {sub && <p className="text-[12px] mt-[3px] leading-relaxed" style={{ color: '#777' }}>{sub}</p>}
        {error && (
          <p className="text-[11px] mt-[4px] flex items-center gap-[4px]" style={{ color: '#DC2626' }}>
            <AlertCircle className="w-[11px] h-[11px]" />{error}
          </p>
        )}
      </div>
    </label>
  )
}

function Stepper({ step }: { step: number }) {
  const steps = [
    { label: 'Kontakt',    icon: User },
    { label: 'Identität', icon: Building2 },
    { label: 'Store',     icon: Store },
    { label: 'Betrieb',  icon: Truck },
    { label: 'Prüfung',  icon: ClipboardCheck },
  ]

  return (
    <div className="flex items-start justify-between relative">
      {/* connecting line */}
      <div
        className="absolute top-[17px] left-0 right-0 h-[2px] hidden sm:block"
        style={{ background: '#E5E5E5', zIndex: 0 }}
      />
      <div
        className="absolute top-[17px] left-0 h-[2px] hidden sm:block transition-all duration-500"
        style={{
          background: 'linear-gradient(90deg, #D97706, #F59E0B)',
          width: `${((step - 1) / (steps.length - 1)) * 100}%`,
          zIndex: 1,
        }}
      />

      {steps.map((s, i) => {
        const idx = i + 1
        const done = idx < step
        const active = idx === step
        const Icon = s.icon

        return (
          <div key={idx} className="flex flex-col items-center gap-[6px] relative z-10 flex-1">
            <div
              className="w-[34px] h-[34px] rounded-full flex items-center justify-center transition-all duration-300"
              style={{
                background: done ? '#D97706' : active ? '#FFFBEB' : '#F5F5F5',
                border: `2px solid ${done || active ? '#D97706' : '#E5E5E5'}`,
              }}
            >
              {done
                ? <Check className="w-[15px] h-[15px] text-white" strokeWidth={3} />
                : <Icon
                    className="w-[15px] h-[15px]"
                    style={{ color: active ? '#D97706' : '#AAAAAA' }}
                  />
              }
            </div>
            <span
              className="text-[10px] font-semibold text-center leading-tight hidden sm:block"
              style={{ color: active ? '#D97706' : done ? '#555' : '#AAAAAA' }}
            >
              {s.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Step renderers
// ─────────────────────────────────────────────────────────────────────────────

function Step1({ data, set, errors }: {
  data: FormData
  set: (k: keyof FormData, v: unknown) => void
  errors: StepErrors
}) {
  return (
    <div className="flex flex-col gap-[20px]">
      <div className="p-[14px] rounded-[10px]" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
        <p className="text-[12px] leading-relaxed" style={{ color: '#92400E' }}>
          <strong>Willkommen!</strong> Dieser Antrag dauert ca. 10–15 Minuten. Dein Fortschritt wird
          automatisch gespeichert, damit du jederzeit weitermachen kannst.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-[16px]">
        <Field label="Vollständiger Name" required error={errors.full_name}
          helper="Wie auf einem amtlichen Ausweis">
          <input
            className={inputClass(!!errors.full_name)}
            placeholder="Max Mustermann"
            value={data.full_name}
            onChange={(e) => set('full_name', e.target.value)}
          />
        </Field>

        <Field label="E-Mail-Adresse" required error={errors.email}
          helper="Für Bewerbungsbenachrichtigungen">
          <input
            className={inputClass(!!errors.email)}
            type="email"
            placeholder="max@beispiel.de"
            value={data.email}
            onChange={(e) => set('email', e.target.value)}
          />
        </Field>

        <Field label="Telefonnummer" helper="Optional – für Rückfragen">
          <input
            className={inputClass()}
            type="tel"
            placeholder="+49 170 000 0000"
            value={data.phone}
            onChange={(e) => set('phone', e.target.value)}
          />
        </Field>

        <Field label="Land" required error={errors.country}
          helper="Dein aktuelles Wohnsitz- oder Geschäftsland">
          <select
            className={selectClass(!!errors.country)}
            value={data.country}
            onChange={(e) => set('country', e.target.value)}
          >
            <option value="">– Bitte wählen –</option>
            {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
      </div>

      <Field label="Art des Antragstellers" required error={errors.applicant_type}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-[10px]">
          {([['individual', 'Privatperson / Selbstständig', 'Verkäufer als natürliche Person'],
             ['company',    'Unternehmen / GmbH / AG',     'Eingetragener Gewerbetreibender']] as const)
            .map(([val, title, desc]) => (
              <button
                key={val}
                type="button"
                onClick={() => set('applicant_type', val)}
                className="text-left p-[14px] rounded-[10px] transition-all duration-150"
                style={{
                  background: data.applicant_type === val ? '#FFFBEB' : 'white',
                  border: `2px solid ${data.applicant_type === val
                    ? '#D97706'
                    : errors.applicant_type ? '#FCA5A5' : '#E5E5E5'}`,
                }}
              >
                <p className="text-[13px] font-semibold" style={{ color: '#1A1A1A' }}>{title}</p>
                <p className="text-[12px] mt-[2px]" style={{ color: '#888' }}>{desc}</p>
              </button>
            ))
          }
        </div>
        {errors.applicant_type && (
          <p className="text-[11px] flex items-center gap-[4px]" style={{ color: '#DC2626' }}>
            <AlertCircle className="w-[12px] h-[12px]" />{errors.applicant_type}
          </p>
        )}
      </Field>
    </div>
  )
}

function Step2({ data, set, errors }: {
  data: FormData
  set: (k: keyof FormData, v: unknown) => void
  errors: StepErrors
}) {
  const isIndividual = data.applicant_type === 'individual'

  return (
    <div className="flex flex-col gap-[20px]">
      <div className="p-[14px] rounded-[10px]" style={{ background: '#F0F9FF', border: '1px solid #BAE6FD' }}>
        <p className="text-[12px] leading-relaxed" style={{ color: '#0C4A6E' }}>
          <strong>Warum diese Angaben?</strong>{' '}
          {isIndividual
            ? 'Als Verkäufer auf unserem Marktplatz sind wir verpflichtet, die Identität natürlicher Personen zu prüfen (EU Digital Services Act, §5 TMG). Deine Daten werden vertraulich behandelt.'
            : 'Für Unternehmen benötigen wir Angaben zur rechtlichen Einheit, um Compliance-Anforderungen (EU DSA, KYB) zu erfüllen und Auszahlungen korrekt abzuwickeln.'}
        </p>
      </div>

      {isIndividual ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-[16px]">
          <div className="sm:col-span-2">
            <Field label="Vollständiger rechtlicher Name" required error={errors.legal_full_name}
              helper="Wie im Personalausweis oder Reisepass angegeben">
              <input
                className={inputClass(!!errors.legal_full_name)}
                placeholder="Max Friedrich Mustermann"
                value={data.legal_full_name}
                onChange={(e) => set('legal_full_name', e.target.value)}
              />
            </Field>
          </div>

          <Field label="Geburtsdatum"
            helper="Optional – kann für Zahlungsabwicklung benötigt werden">
            <input
              className={inputClass()}
              type="date"
              value={data.date_of_birth}
              onChange={(e) => set('date_of_birth', e.target.value)}
            />
          </Field>

          <Field label="Wohnsitzland" required error={errors.residence_country}
            helper="Dein offizieller Wohnsitz">
            <select
              className={selectClass(!!errors.residence_country)}
              value={data.residence_country}
              onChange={(e) => set('residence_country', e.target.value)}
            >
              <option value="">– Bitte wählen –</option>
              {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-[16px]">
          <div className="sm:col-span-2">
            <Field label="Unternehmensname" required error={errors.company_name}
              helper="Vollständiger rechtlicher Name lt. Handelsregister">
              <input
                className={inputClass(!!errors.company_name)}
                placeholder="Mustermann GmbH"
                value={data.company_name}
                onChange={(e) => set('company_name', e.target.value)}
              />
            </Field>
          </div>

          <Field label="Handelsregisternummer"
            helper="Optional – z.B. HRB 12345 (stärkt Identitätsverifizierung)">
            <input
              className={inputClass()}
              placeholder="HRB 12345"
              value={data.company_reg_number}
              onChange={(e) => set('company_reg_number', e.target.value)}
            />
          </Field>

          <Field label="Umsatzsteuer-ID"
            helper="Optional – z.B. DE123456789">
            <input
              className={inputClass()}
              placeholder="DE123456789"
              value={data.vat_id}
              onChange={(e) => set('vat_id', e.target.value)}
            />
          </Field>

          <div className="sm:col-span-2">
            <Field label="Rechtsform" required error={errors.business_type}>
              <select
                className={selectClass(!!errors.business_type)}
                value={data.business_type}
                onChange={(e) => set('business_type', e.target.value)}
              >
                <option value="">– Bitte wählen –</option>
                {BUSINESS_TYPES.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </Field>
          </div>

          <div className="sm:col-span-2">
            <p className="text-[13px] font-semibold mb-[12px]" style={{ color: '#1A1A1A' }}>
              Firmenanschrift <span style={{ color: '#DC2626' }}>*</span>
            </p>
          </div>

          <div className="sm:col-span-2">
            <Field label="Straße & Hausnummer" required error={errors.company_address_line1}>
              <input
                className={inputClass(!!errors.company_address_line1)}
                placeholder="Musterstraße 42"
                value={data.company_address_line1}
                onChange={(e) => set('company_address_line1', e.target.value)}
              />
            </Field>
          </div>

          <Field label="Adresszusatz (optional)">
            <input
              className={inputClass()}
              placeholder="c/o, Etage, etc."
              value={data.company_address_line2}
              onChange={(e) => set('company_address_line2', e.target.value)}
            />
          </Field>

          <Field label="PLZ">
            <input
              className={inputClass()}
              placeholder="12345"
              value={data.company_address_postal}
              onChange={(e) => set('company_address_postal', e.target.value)}
            />
          </Field>

          <Field label="Stadt" required error={errors.company_address_city}>
            <input
              className={inputClass(!!errors.company_address_city)}
              placeholder="Berlin"
              value={data.company_address_city}
              onChange={(e) => set('company_address_city', e.target.value)}
            />
          </Field>

          <Field label="Land" required error={errors.company_address_country}>
            <select
              className={selectClass(!!errors.company_address_country)}
              value={data.company_address_country}
              onChange={(e) => set('company_address_country', e.target.value)}
            >
              <option value="">– Bitte wählen –</option>
              {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
        </div>
      )}
    </div>
  )
}

function Step3({ data, set, errors }: {
  data: FormData
  set: (k: keyof FormData, v: unknown) => void
  errors: StepErrors
}) {
  const toggleCategory = (cat: string) => {
    const next = data.product_categories.includes(cat)
      ? data.product_categories.filter((c) => c !== cat)
      : [...data.product_categories, cat]
    set('product_categories', next)
  }

  return (
    <div className="flex flex-col gap-[20px]">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-[16px]">
        <Field label="Store-Name" required error={errors.store_name}
          helper="Name deines Shops, der für Käufer sichtbar ist">
          <input
            className={inputClass(!!errors.store_name)}
            placeholder="MeinShop"
            value={data.store_name}
            onChange={(e) => set('store_name', e.target.value)}
          />
        </Field>

        <Field label="Markenname"
          helper="Falls du unter einem anderen Markennamen verkaufst">
          <input
            className={inputClass()}
            placeholder="Meine Marke"
            value={data.brand_name}
            onChange={(e) => set('brand_name', e.target.value)}
          />
        </Field>
      </div>

      <Field label="Produktkategorien" required error={errors.product_categories}
        helper="Alle zutreffenden Kategorien auswählen">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-[8px] mt-[4px]">
          {PRODUCT_CATEGORIES.map((cat) => {
            const checked = data.product_categories.includes(cat)
            return (
              <button
                key={cat}
                type="button"
                onClick={() => toggleCategory(cat)}
                className="px-[10px] py-[8px] rounded-[8px] text-[12px] font-medium text-left transition-all duration-150"
                style={{
                  background: checked ? '#FFFBEB' : '#F5F5F5',
                  border: `1px solid ${checked ? '#D97706' : errors.product_categories ? '#FCA5A5' : '#E5E5E5'}`,
                  color: checked ? '#92400E' : '#555',
                }}
              >
                {checked && <span className="mr-[4px]">✓</span>}{cat}
              </button>
            )
          })}
        </div>
        {errors.product_categories && (
          <p className="text-[11px] flex items-center gap-[4px]" style={{ color: '#DC2626' }}>
            <AlertCircle className="w-[12px] h-[12px]" />{errors.product_categories}
          </p>
        )}
      </Field>

      <Field label="Store-Beschreibung" required error={errors.store_description}
        helper="Beschreibe deinen Shop und deine Produkte (min. 30 Zeichen)">
        <textarea
          rows={4}
          className={`${inputClass(!!errors.store_description)} resize-none`}
          placeholder="Erzähl uns von deinem Store, deinen Produkten und was dich von anderen unterscheidet…"
          value={data.store_description}
          onChange={(e) => set('store_description', e.target.value)}
        />
        <p className="text-[11px] text-right" style={{ color: data.store_description.length < 30 ? '#DC2626' : '#999' }}>
          {data.store_description.length} / min. 30
        </p>
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-[16px]">
        <Field label="Website" error={errors.website_url}
          helper="Optional – deine bestehende Website oder Online-Shop">
          <input
            className={inputClass(!!errors.website_url)}
            placeholder="https://meinshop.de"
            value={data.website_url}
            onChange={(e) => set('website_url', e.target.value)}
          />
        </Field>

        <div className="flex flex-col gap-[8px]">
          <p className="text-[13px] font-semibold" style={{ color: '#1A1A1A' }}>
            Social Media <span className="font-normal" style={{ color: '#999' }}>(optional)</span>
          </p>
          <input
            className={inputClass()}
            placeholder="Instagram: @dein_handle"
            value={data.social_instagram}
            onChange={(e) => set('social_instagram', e.target.value)}
          />
          <input
            className={inputClass()}
            placeholder="TikTok: @dein_handle"
            value={data.social_tiktok}
            onChange={(e) => set('social_tiktok', e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-[16px]">
        <Field label="Geschätzte Bestellungen / Monat" required error={errors.estimated_monthly_orders}>
          <select
            className={selectClass(!!errors.estimated_monthly_orders)}
            value={data.estimated_monthly_orders}
            onChange={(e) => set('estimated_monthly_orders', e.target.value)}
          >
            <option value="">– Bitte schätzen –</option>
            {ESTIMATED_ORDERS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </Field>

        <Field label="Durchschnittlicher Bestellwert">
          <select
            className={selectClass()}
            value={data.avg_order_value}
            onChange={(e) => set('avg_order_value', e.target.value)}
          >
            <option value="">– Optional –</option>
            {AVG_ORDER_VALUES.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </Field>
      </div>

      <Field label="Produktherkunft" required error={errors.product_origin}
        helper="Wie entstehen oder kommen deine Produkte zu dir?">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-[8px]">
          {([
            ['own_brand',  '🏷️', 'Eigenmarke'],
            ['resale',     '🔁', 'Wiederverkauf'],
            ['handmade',   '🤲', 'Handgemacht'],
            ['other',      '📦', 'Sonstiges'],
          ] as const).map(([val, emoji, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => set('product_origin', val)}
              className="p-[12px] rounded-[8px] flex flex-col items-center gap-[4px] transition-all duration-150"
              style={{
                background: data.product_origin === val ? '#FFFBEB' : '#F5F5F5',
                border: `2px solid ${data.product_origin === val
                  ? '#D97706'
                  : errors.product_origin ? '#FCA5A5' : '#E5E5E5'}`,
              }}
            >
              <span className="text-[20px]">{emoji}</span>
              <span className="text-[11px] font-semibold" style={{ color: data.product_origin === val ? '#92400E' : '#555' }}>
                {label}
              </span>
            </button>
          ))}
        </div>
        {errors.product_origin && (
          <p className="text-[11px] flex items-center gap-[4px]" style={{ color: '#DC2626' }}>
            <AlertCircle className="w-[12px] h-[12px]" />{errors.product_origin}
          </p>
        )}
      </Field>

      {(data.product_origin === 'resale' || data.product_origin === 'other') && (
        <Field label="Produktherkunft – Details"
          helper="Woher beziehst du deine Produkte? (optional)">
          <input
            className={inputClass()}
            placeholder="z.B. Großhändler in Europa, eigene Produktion, …"
            value={data.product_origin_detail}
            onChange={(e) => set('product_origin_detail', e.target.value)}
          />
        </Field>
      )}
    </div>
  )
}

function Step4({ data, set, errors }: {
  data: FormData
  set: (k: keyof FormData, v: unknown) => void
  errors: StepErrors
}) {
  const toggleShipping = (c: string) => {
    const next = data.shipping_countries.includes(c)
      ? data.shipping_countries.filter((x) => x !== c)
      : [...data.shipping_countries, c]
    set('shipping_countries', next)
  }

  return (
    <div className="flex flex-col gap-[24px]">
      {/* Return address */}
      <div>
        <p className="text-[14px] font-bold mb-[14px]" style={{ color: '#1A1A1A' }}>
          Rücksendeadresse
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-[14px]">
          <div className="sm:col-span-2">
            <Field label="Straße & Hausnummer" required error={errors.return_address_line1}>
              <input
                className={inputClass(!!errors.return_address_line1)}
                placeholder="Rücksende-Straße 1"
                value={data.return_address_line1}
                onChange={(e) => set('return_address_line1', e.target.value)}
              />
            </Field>
          </div>
          <Field label="PLZ">
            <input
              className={inputClass()}
              placeholder="12345"
              value={data.return_address_postal}
              onChange={(e) => set('return_address_postal', e.target.value)}
            />
          </Field>
          <Field label="Stadt" required error={errors.return_address_city}>
            <input
              className={inputClass(!!errors.return_address_city)}
              placeholder="Berlin"
              value={data.return_address_city}
              onChange={(e) => set('return_address_city', e.target.value)}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Land" required error={errors.return_address_country}>
              <select
                className={selectClass(!!errors.return_address_country)}
                value={data.return_address_country}
                onChange={(e) => set('return_address_country', e.target.value)}
              >
                <option value="">– Bitte wählen –</option>
                {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          </div>
        </div>
      </div>

      {/* Support & fulfillment */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-[16px]">
        <Field label="Support-E-Mail" required error={errors.support_email}
          helper="Sichtbar für Käufer bei Fragen / Reklamationen">
          <input
            className={inputClass(!!errors.support_email)}
            type="email"
            placeholder="support@meinshop.de"
            value={data.support_email}
            onChange={(e) => set('support_email', e.target.value)}
          />
        </Field>

        <Field label="Fulfillment-Modell" required error={errors.fulfillment_model}
          helper="Wie werden deine Bestellungen versendet?">
          <select
            className={selectClass(!!errors.fulfillment_model)}
            value={data.fulfillment_model}
            onChange={(e) => set('fulfillment_model', e.target.value as FormData['fulfillment_model'])}
          >
            <option value="">– Bitte wählen –</option>
            <option value="self">Selbstversand</option>
            <option value="warehouse">Lager / 3PL</option>
            <option value="dropshipping">Dropshipping</option>
          </select>
        </Field>
      </div>

      {/* Shipping countries */}
      <Field label="Versandländer" required error={errors.shipping_countries}
        helper="In welche Länder lieferst du?">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-[8px] mt-[4px]">
          {SHIPPING_COUNTRIES.map((c) => {
            const checked = data.shipping_countries.includes(c)
            return (
              <button
                key={c}
                type="button"
                onClick={() => toggleShipping(c)}
                className="px-[10px] py-[8px] rounded-[8px] text-[12px] font-medium text-left transition-all duration-150"
                style={{
                  background: checked ? '#FFFBEB' : '#F5F5F5',
                  border: `1px solid ${checked ? '#D97706' : errors.shipping_countries ? '#FCA5A5' : '#E5E5E5'}`,
                  color: checked ? '#92400E' : '#555',
                }}
              >
                {checked && <span className="mr-[4px]">✓</span>}{c}
              </button>
            )
          })}
        </div>
        {errors.shipping_countries && (
          <p className="text-[11px] flex items-center gap-[4px] mt-[6px]" style={{ color: '#DC2626' }}>
            <AlertCircle className="w-[12px] h-[12px]" />{errors.shipping_countries}
          </p>
        )}
      </Field>

      {/* Declarations */}
      <div>
        <p className="text-[14px] font-bold mb-[4px]" style={{ color: '#1A1A1A' }}>
          Erklärungen & Einwilligungen
        </p>
        <p className="text-[12px] mb-[14px]" style={{ color: '#777' }}>
          Alle Punkte müssen bestätigt werden, um den Antrag einzureichen.
        </p>

        <div className="flex flex-col gap-[10px]">
          <CheckboxRow
            id="decl_accurate_info"
            checked={data.decl_accurate_info}
            onChange={(v) => set('decl_accurate_info', v)}
            error={!data.decl_accurate_info && errors.decl_accurate_info ? errors.decl_accurate_info : undefined}
            label="Ich bestätige, dass alle Angaben in diesem Antrag vollständig und korrekt sind."
          />
          <CheckboxRow
            id="decl_terms_agreed"
            checked={data.decl_terms_agreed}
            onChange={(v) => set('decl_terms_agreed', v)}
            error={!data.decl_terms_agreed && errors.decl_terms_agreed ? errors.decl_terms_agreed : undefined}
            label="Ich stimme den Verkäufer-AGB und der Marktplatz-Richtlinie zu."
            sub="Unsere AGB findest du unter /seller-terms"
          />
          <CheckboxRow
            id="decl_verification_consent"
            checked={data.decl_verification_consent}
            onChange={(v) => set('decl_verification_consent', v)}
            error={!data.decl_verification_consent && errors.decl_verification_consent ? errors.decl_verification_consent : undefined}
            label="Ich willige ein, dass meine Identität und mein Unternehmen im Rahmen des Onboardings geprüft werden dürfen."
            sub="Wir behalten uns vor, zusätzliche Nachweise anzufordern (z.B. Gewerbeanmeldung, Personalausweis)."
          />
          <CheckboxRow
            id="decl_product_compliance"
            checked={data.decl_product_compliance}
            onChange={(v) => set('decl_product_compliance', v)}
            error={!data.decl_product_compliance && errors.decl_product_compliance ? errors.decl_product_compliance : undefined}
            label="Ich bestätige, dass alle von mir angebotenen Produkte den geltenden gesetzlichen Vorschriften entsprechen und keine Rechte Dritter verletzen."
          />
          <CheckboxRow
            id="decl_privacy_acknowledged"
            checked={data.decl_privacy_acknowledged}
            onChange={(v) => set('decl_privacy_acknowledged', v)}
            error={!data.decl_privacy_acknowledged && errors.decl_privacy_acknowledged ? errors.decl_privacy_acknowledged : undefined}
            label="Ich habe die Datenschutzerklärung zur Kenntnis genommen."
            sub="Datenschutzerklärung unter /privacy einsehbar."
          />
          <CheckboxRow
            id="decl_is_trader"
            checked={data.decl_is_trader}
            onChange={(v) => set('decl_is_trader', v)}
            label="Ich bin gewerblicher Händler im Sinne des EU Digital Services Act (DSA)."
            sub="Optional – Selbstauskunft als Trader. Nicht zwingend erforderlich."
          />
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 5: Review
// ─────────────────────────────────────────────────────────────────────────────

function ReviewRow({ label, value }: { label: string; value?: string | string[] | boolean | null }) {
  if (value === undefined || value === null || value === '' || value === false) return null
  if (Array.isArray(value) && value.length === 0) return null

  const display = Array.isArray(value)
    ? value.join(', ')
    : value === true
    ? '✓ Ja'
    : String(value)

  return (
    <div className="flex gap-[12px] py-[8px]" style={{ borderBottom: '1px solid #F0F0F0' }}>
      <span className="text-[12px] w-[160px] flex-shrink-0" style={{ color: '#888' }}>{label}</span>
      <span className="text-[13px] flex-1" style={{ color: '#1A1A1A' }}>{display}</span>
    </div>
  )
}

function ReviewSection({ title, goTo, children }: {
  title: string
  goTo: () => void
  children: React.ReactNode
}) {
  return (
    <div className="rounded-[12px] overflow-hidden" style={{ border: '1px solid #E5E5E5' }}>
      <div
        className="flex items-center justify-between px-[16px] py-[12px]"
        style={{ background: '#FAFAFA', borderBottom: '1px solid #E5E5E5' }}
      >
        <p className="text-[13px] font-bold" style={{ color: '#1A1A1A' }}>{title}</p>
        <button
          type="button"
          onClick={goTo}
          className="text-[12px] font-semibold transition-opacity hover:opacity-70"
          style={{ color: '#D97706' }}
        >
          Bearbeiten
        </button>
      </div>
      <div className="px-[16px] py-[4px]">{children}</div>
    </div>
  )
}

function Step5({ data, goToStep }: {
  data: FormData
  goToStep: (s: number) => void
}) {
  return (
    <div className="flex flex-col gap-[16px]">
      <div className="p-[14px] rounded-[10px]" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
        <p className="text-[12px] leading-relaxed" style={{ color: '#14532D' }}>
          <strong>Fast geschafft!</strong> Prüfe deine Angaben und klicke dann auf „Antrag einreichen".
          Nach dem Absenden erhältst du eine Bestätigungs-E-Mail. Die Überprüfung dauert in der Regel 2–5 Werktage.
        </p>
      </div>

      <ReviewSection title="1 · Kontakt" goTo={() => goToStep(1)}>
        <ReviewRow label="Name" value={data.full_name} />
        <ReviewRow label="E-Mail" value={data.email} />
        <ReviewRow label="Telefon" value={data.phone} />
        <ReviewRow label="Land" value={data.country} />
        <ReviewRow label="Art" value={data.applicant_type === 'individual' ? 'Privatperson' : 'Unternehmen'} />
      </ReviewSection>

      <ReviewSection title="2 · Identität" goTo={() => goToStep(2)}>
        {data.applicant_type === 'individual' ? (
          <>
            <ReviewRow label="Rechtlicher Name" value={data.legal_full_name} />
            <ReviewRow label="Geburtsdatum" value={data.date_of_birth} />
            <ReviewRow label="Wohnsitzland" value={data.residence_country} />
          </>
        ) : (
          <>
            <ReviewRow label="Unternehmensname" value={data.company_name} />
            <ReviewRow label="Handelsreg.-Nr." value={data.company_reg_number} />
            <ReviewRow label="USt-ID" value={data.vat_id} />
            <ReviewRow label="Rechtsform" value={data.business_type} />
            <ReviewRow label="Anschrift"
              value={[
                data.company_address_line1,
                data.company_address_line2,
                `${data.company_address_postal} ${data.company_address_city}`,
                data.company_address_country,
              ].filter(Boolean).join(', ')}
            />
          </>
        )}
      </ReviewSection>

      <ReviewSection title="3 · Store-Profil" goTo={() => goToStep(3)}>
        <ReviewRow label="Store-Name" value={data.store_name} />
        <ReviewRow label="Markenname" value={data.brand_name} />
        <ReviewRow label="Kategorien" value={data.product_categories} />
        <ReviewRow label="Beschreibung" value={data.store_description} />
        <ReviewRow label="Website" value={data.website_url} />
        <ReviewRow label="Instagram" value={data.social_instagram} />
        <ReviewRow label="TikTok" value={data.social_tiktok} />
        <ReviewRow label="Bestellvolumen" value={data.estimated_monthly_orders} />
        <ReviewRow label="Ø Bestellwert" value={data.avg_order_value} />
        <ReviewRow label="Produktherkunft" value={data.product_origin} />
        <ReviewRow label="Herkunft-Details" value={data.product_origin_detail} />
      </ReviewSection>

      <ReviewSection title="4 · Betrieb & Erklärungen" goTo={() => goToStep(4)}>
        <ReviewRow label="Retourenaddr."
          value={`${data.return_address_line1}, ${data.return_address_city}, ${data.return_address_country}`}
        />
        <ReviewRow label="Support-E-Mail" value={data.support_email} />
        <ReviewRow label="Versandländer" value={data.shipping_countries} />
        <ReviewRow label="Fulfillment"
          value={data.fulfillment_model === 'self'
            ? 'Selbstversand'
            : data.fulfillment_model === 'warehouse'
            ? 'Lager / 3PL'
            : data.fulfillment_model === 'dropshipping'
            ? 'Dropshipping'
            : ''}
        />
        <ReviewRow label="Erklärungen" value="Alle 5 Pflichtfelder bestätigt" />
        {data.decl_is_trader && <ReviewRow label="Gewerblicher Händler" value={true} />}
      </ReviewSection>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Success screen
// ─────────────────────────────────────────────────────────────────────────────

function SuccessScreen({ applicationId }: { applicationId: string }) {
  return (
    <div className="flex flex-col items-center text-center py-[32px] px-[24px]">
      <div
        className="w-[72px] h-[72px] rounded-full flex items-center justify-center mb-[20px]"
        style={{ background: 'linear-gradient(135deg, #D97706, #F59E0B)' }}
      >
        <CheckCircle2 className="w-[36px] h-[36px] text-white" />
      </div>

      <h2 className="text-[22px] font-bold mb-[8px]" style={{ color: '#1A1A1A' }}>
        Antrag eingereicht!
      </h2>
      <p className="text-[14px] mb-[6px]" style={{ color: '#555' }}>
        Deine Verkäuferbewerbung wurde erfolgreich übermittelt.
      </p>
      <p className="text-[12px]" style={{ color: '#999' }}>
        Referenz: <span className="font-mono font-semibold" style={{ color: '#D97706' }}>
          {applicationId.slice(0, 8).toUpperCase()}
        </span>
      </p>

      <div
        className="mt-[24px] w-full max-w-[400px] p-[18px] rounded-[12px] text-left"
        style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}
      >
        <p className="text-[13px] font-bold mb-[10px]" style={{ color: '#92400E' }}>
          Was passiert als nächstes?
        </p>
        {[
          'Du erhältst eine Bestätigungs-E-Mail mit deiner Referenznummer.',
          'Unser Team prüft deinen Antrag innerhalb von 2–5 Werktagen.',
          'Wir können zusätzliche Nachweise oder Informationen anfordern.',
          'Bei Freigabe erhältst du Zugang zum Seller-Dashboard.',
        ].map((item, i) => (
          <div key={i} className="flex items-start gap-[10px] mb-[8px]">
            <div
              className="w-[18px] h-[18px] rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white"
              style={{ background: '#D97706' }}
            >
              {i + 1}
            </div>
            <p className="text-[12px] leading-relaxed" style={{ color: '#92400E' }}>{item}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-[10px] mt-[28px] w-full max-w-[400px]">
        <Link
          href="/"
          className="flex-1 py-[12px] rounded-[10px] text-[14px] font-semibold text-center transition-opacity hover:opacity-80"
          style={{ background: '#F5F5F5', color: '#555' }}
        >
          Zur Startseite
        </Link>
        <Link
          href="/sell"
          className="flex-1 py-[12px] rounded-[10px] text-[14px] font-semibold text-center text-white transition-opacity hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #D97706, #F59E0B)' }}
        >
          Infoseite ansehen
        </Link>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function SellerApplyPage() {
  const router = useRouter()

  const [step, setStep] = useState(1)
  const [data, setData] = useState<FormData>(EMPTY_FORM)
  const [errors, setErrors] = useState<StepErrors>({})
  const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [submitError, setSubmitError] = useState('')
  const [applicationId, setApplicationId] = useState('')
  const [draftSaved, setDraftSaved] = useState(false)
  const [draftTimer, setDraftTimer] = useState<ReturnType<typeof setTimeout> | null>(null)

  // Load draft from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        setData(parsed.data ?? EMPTY_FORM)
        setStep(parsed.step ?? 1)
      }
    } catch {
      // ignore parse errors
    }
  }, [])

  // Save draft to localStorage (debounced)
  const saveDraft = useCallback((d: FormData, s: number) => {
    if (draftTimer) clearTimeout(draftTimer)
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ data: d, step: s }))
        setDraftSaved(true)
        setTimeout(() => setDraftSaved(false), 2000)
      } catch { /* storage unavailable */ }
    }, 800)
    setDraftTimer(t)
  }, [draftTimer])

  const set = useCallback((key: keyof FormData, value: unknown) => {
    setData((prev) => {
      const next = { ...prev, [key]: value }
      saveDraft(next, step)
      return next
    })
    // Clear field error on change
    if (errors[key]) setErrors((prev) => { const e = { ...prev }; delete e[key]; return e })
  }, [errors, saveDraft, step])

  const goToStep = (target: number) => {
    setErrors({})
    setStep(target)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const next = () => {
    const err = validateStep(step, data)
    if (Object.keys(err).length > 0) {
      setErrors(err)
      // Scroll to first error
      const firstKey = Object.keys(err)[0]
      const el = document.getElementById(firstKey)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setErrors({})
    goToStep(step + 1)
  }

  const back = () => {
    setErrors({})
    goToStep(step - 1)
  }

  const handleSubmit = async () => {
    setSubmitState('submitting')
    setSubmitError('')

    try {
      // Build company_address JSONB
      const company_address = data.applicant_type === 'company'
        ? {
            line1: data.company_address_line1,
            ...(data.company_address_line2 ? { line2: data.company_address_line2 } : {}),
            city: data.company_address_city,
            postal_code: data.company_address_postal,
            country: data.company_address_country,
          }
        : undefined

      // Build return_address JSONB
      const return_address = {
        line1: data.return_address_line1,
        city: data.return_address_city,
        ...(data.return_address_postal ? { postal_code: data.return_address_postal } : {}),
        country: data.return_address_country,
      }

      // Build social_links JSONB
      const social_links: Record<string, string> = {}
      if (data.social_instagram) social_links.instagram = data.social_instagram
      if (data.social_tiktok)    social_links.tiktok    = data.social_tiktok
      if (data.social_youtube)   social_links.youtube   = data.social_youtube

      const payload = {
        full_name:                  data.full_name,
        email:                      data.email,
        phone:                      data.phone || undefined,
        country:                    data.country,
        applicant_type:             data.applicant_type,

        // Individual
        legal_full_name:            data.applicant_type === 'individual' ? data.legal_full_name : undefined,
        date_of_birth:              data.applicant_type === 'individual' && data.date_of_birth ? data.date_of_birth : undefined,
        residence_country:          data.applicant_type === 'individual' ? data.residence_country : undefined,

        // Company
        company_name:               data.applicant_type === 'company' ? data.company_name : undefined,
        company_reg_number:         data.applicant_type === 'company' && data.company_reg_number ? data.company_reg_number : undefined,
        vat_id:                     data.applicant_type === 'company' && data.vat_id ? data.vat_id : undefined,
        company_address,
        business_type:              data.applicant_type === 'company' ? data.business_type : undefined,

        // Store
        store_name:                 data.store_name,
        brand_name:                 data.brand_name || undefined,
        product_categories:         data.product_categories,
        store_description:          data.store_description,
        website_url:                data.website_url || undefined,
        social_links:               Object.keys(social_links).length > 0 ? social_links : undefined,
        estimated_monthly_orders:   data.estimated_monthly_orders || undefined,
        avg_order_value:            data.avg_order_value || undefined,
        product_origin:             data.product_origin || undefined,
        product_origin_detail:      data.product_origin_detail || undefined,

        // Operations
        return_address,
        support_email:              data.support_email,
        shipping_countries:         data.shipping_countries,
        fulfillment_model:          data.fulfillment_model || undefined,

        // Declarations
        decl_accurate_info:         data.decl_accurate_info,
        decl_terms_agreed:          data.decl_terms_agreed,
        decl_verification_consent:  data.decl_verification_consent,
        decl_product_compliance:    data.decl_product_compliance,
        decl_privacy_acknowledged:  data.decl_privacy_acknowledged,
        decl_is_trader:             data.decl_is_trader,
      }

      const res = await fetch('/api/seller/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json()

      if (!res.ok || !json.success) {
        throw new Error(json.error || json.message || 'Unbekannter Fehler')
      }

      // Clear draft
      try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }

      setApplicationId(json.application?.id ?? '')
      setSubmitState('success')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Fehler beim Einreichen. Bitte erneut versuchen.'
      setSubmitError(message)
      setSubmitState('error')
    }
  }

  // ───────────────────────────────────────────────────────────────
  // Render
  // ───────────────────────────────────────────────────────────────

  if (submitState === 'success') {
    return (
      <main className="min-h-screen" style={{ background: '#FAFAFA' }}>
        <div className="max-w-[640px] mx-auto px-4 py-[40px]">
          <div
            className="bg-white rounded-[16px] overflow-hidden"
            style={{ border: '1px solid #E5E5E5', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}
          >
            <SuccessScreen applicationId={applicationId} />
          </div>
        </div>
      </main>
    )
  }

  const STEP_TITLES = [
    'Kontakt & Kontotyp',
    data.applicant_type === 'company' ? 'Unternehmensdaten' : 'Persönliche Identität',
    'Store-Profil',
    'Betrieb & Erklärungen',
    'Überprüfung & Einreichen',
  ]

  const STEP_DESCS = [
    'Grundlegende Kontaktinformationen und Art des Verkäufers.',
    data.applicant_type === 'company'
      ? 'Rechtliche Daten deines Unternehmens für Compliance & Auszahlungen.'
      : 'Persönliche Identitätsdaten für gesetzliche Verifizierung.',
    'Name, Kategorien und Beschreibung deines Stores.',
    'Logistik, Versand und verbindliche Erklärungen.',
    'Prüfe alle Angaben vor dem Einreichen.',
  ]

  return (
    <main className="min-h-screen" style={{ background: '#FAFAFA' }}>
      {/* Top nav */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between px-4 py-[14px]"
        style={{ background: 'white', borderBottom: '1px solid #E5E5E5' }}
      >
        <Link
          href="/sell"
          className="flex items-center gap-[6px] text-[13px] font-semibold transition-opacity hover:opacity-70"
          style={{ color: '#555' }}
        >
          <ChevronLeft className="w-[14px] h-[14px]" />
          Zurück zur Infoseite
        </Link>

        <div className="flex items-center gap-[8px]">
          {draftSaved && (
            <span className="text-[11px] flex items-center gap-[4px] transition-opacity"
              style={{ color: '#16A34A' }}>
              <Check className="w-[11px] h-[11px]" /> Entwurf gespeichert
            </span>
          )}
          <span
            className="text-[12px] font-semibold px-[10px] py-[4px] rounded-full"
            style={{ background: '#FFFBEB', color: '#92400E' }}
          >
            Schritt {step} / 5
          </span>
        </div>
      </header>

      <div className="max-w-[700px] mx-auto px-4 py-[32px]">
        {/* Stepper */}
        <div className="mb-[32px]">
          <Stepper step={step} />
        </div>

        {/* Card */}
        <div
          className="bg-white rounded-[16px] overflow-hidden"
          style={{ border: '1px solid #E5E5E5', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}
        >
          {/* Card header */}
          <div
            className="px-[24px] py-[20px]"
            style={{ borderBottom: '1px solid #F0F0F0' }}
          >
            <h1 className="text-[18px] font-bold" style={{ color: '#1A1A1A' }}>
              {STEP_TITLES[step - 1]}
            </h1>
            <p className="text-[13px] mt-[2px]" style={{ color: '#888' }}>
              {STEP_DESCS[step - 1]}
            </p>
          </div>

          {/* Card body */}
          <div className="px-[24px] py-[24px]">
            {step === 1 && <Step1 data={data} set={set} errors={errors} />}
            {step === 2 && <Step2 data={data} set={set} errors={errors} />}
            {step === 3 && <Step3 data={data} set={set} errors={errors} />}
            {step === 4 && <Step4 data={data} set={set} errors={errors} />}
            {step === 5 && <Step5 data={data} goToStep={goToStep} />}
          </div>

          {/* Submit error banner */}
          {submitState === 'error' && (
            <div
              className="mx-[24px] mb-[16px] p-[12px] rounded-[8px] flex items-start gap-[10px]"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}
            >
              <AlertCircle className="w-[16px] h-[16px] flex-shrink-0 mt-[1px]" style={{ color: '#DC2626' }} />
              <div>
                <p className="text-[13px] font-semibold" style={{ color: '#DC2626' }}>
                  Einreichen fehlgeschlagen
                </p>
                <p className="text-[12px] mt-[2px]" style={{ color: '#991B1B' }}>{submitError}</p>
              </div>
              <button
                onClick={() => setSubmitState('idle')}
                className="ml-auto flex-shrink-0 opacity-60 hover:opacity-100"
              >
                <X className="w-[14px] h-[14px]" style={{ color: '#DC2626' }} />
              </button>
            </div>
          )}

          {/* Card footer / nav */}
          <div
            className="px-[24px] py-[18px] flex items-center justify-between gap-[10px]"
            style={{ borderTop: '1px solid #F0F0F0', background: '#FAFAFA' }}
          >
            <button
              type="button"
              onClick={back}
              disabled={step === 1}
              className="flex items-center gap-[6px] px-[16px] py-[10px] rounded-[10px] text-[13px] font-semibold transition-all duration-150 disabled:opacity-30"
              style={{ background: '#F0F0F0', color: '#555' }}
            >
              <ChevronLeft className="w-[14px] h-[14px]" />
              Zurück
            </button>

            <div className="flex items-center gap-[6px]">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="rounded-full transition-all duration-300"
                  style={{
                    width: i === step ? '20px' : '6px',
                    height: '6px',
                    background: i <= step ? '#D97706' : '#E5E5E5',
                  }}
                />
              ))}
            </div>

            {step < 5 ? (
              <button
                type="button"
                onClick={next}
                className="flex items-center gap-[6px] px-[20px] py-[10px] rounded-[10px] text-[13px] font-semibold text-white transition-all duration-150 hover:opacity-90 active:opacity-80"
                style={{ background: 'linear-gradient(135deg, #D97706, #F59E0B)' }}
              >
                Weiter
                <ChevronRight className="w-[14px] h-[14px]" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitState === 'submitting'}
                className="flex items-center gap-[6px] px-[24px] py-[10px] rounded-[10px] text-[13px] font-semibold text-white transition-all duration-150 hover:opacity-90 active:opacity-80 disabled:opacity-70"
                style={{ background: 'linear-gradient(135deg, #D97706, #F59E0B)' }}
              >
                {submitState === 'submitting' ? (
                  <>
                    <Loader2 className="w-[14px] h-[14px] animate-spin" />
                    Wird eingereicht…
                  </>
                ) : (
                  <>
                    <Check className="w-[14px] h-[14px]" />
                    Antrag einreichen
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-[11px] mt-[20px]" style={{ color: '#BBB' }}>
          Dein Fortschritt wird automatisch gespeichert.{' '}
          <Link href="/privacy" className="underline hover:text-gray-500">Datenschutz</Link>
          {' · '}
          <Link href="/seller-terms" className="underline hover:text-gray-500">AGB</Link>
        </p>
      </div>
    </main>
  )
}
