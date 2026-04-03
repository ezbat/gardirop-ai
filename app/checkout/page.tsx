'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  ArrowLeft, MapPin, CreditCard, Loader2, Mail, Phone,
  AlertTriangle, CheckCircle2, RefreshCw, XCircle, Shield,
  Truck, Lock, RotateCcw, ChevronDown, ChevronUp, Package,
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { getLocalCart } from '@/lib/cart-local'
import { CargoPlaneLoading } from '@/components/motion/cargo-plane'
import type { ValidatedItem } from '@/app/api/cart/validate/route'

// ─── Constants ──────────────────────────────────────────────────────────────

const FREE_SHIPPING_THRESHOLD = 100
const SHIPPING_COST = 9.99

// ─── Types ──────────────────────────────────────────────────────────────────

interface CheckoutItem {
  product_id:     string
  title:          string
  price:          number
  quantity:       number
  images:         string[]
  brand:          string | null
  seller_id:      string
  selected_size?: string
}

interface ShippingForm {
  firstName:  string
  lastName:   string
  email:      string
  phone:      string
  street:     string
  extra:      string
  postalCode: string
  city:       string
  country:    string
}

const EMPTY_FORM: ShippingForm = {
  firstName: '', lastName: '', email: '', phone: '',
  street: '', extra: '', postalCode: '', city: '', country: 'Deutschland',
}

// ─── Form Field Component ───────────────────────────────────────────────────

function Field({
  label, value, onChange, error, type = 'text', required = true,
  placeholder, helper, autoComplete, inputMode, half, id,
}: {
  label: string; value: string; onChange: (v: string) => void;
  error?: string; type?: string; required?: boolean;
  placeholder?: string; helper?: string; autoComplete?: string;
  inputMode?: 'text' | 'numeric' | 'tel' | 'email'; half?: boolean; id?: string;
}) {
  return (
    <div className={half ? '' : 'col-span-2'}>
      <label htmlFor={id} className="block text-xs font-semibold text-muted-foreground mb-1.5 tracking-wide uppercase">
        {label}{!required && <span className="text-muted-foreground/50 normal-case tracking-normal ml-1 font-normal">(optional)</span>}
      </label>
      <input
        id={id}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`w-full px-4 py-3 rounded-xl text-sm text-foreground outline-none transition-all duration-200
          border bg-white/[0.06] backdrop-blur-sm
          placeholder:text-muted-foreground/40
          focus:border-primary focus:ring-1 focus:ring-primary/30 focus:bg-white/[0.09]
          ${error ? 'border-red-400/70 bg-red-500/[0.06]' : 'border-white/[0.12]'}`}
      />
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
      {helper && !error && <p className="text-xs text-muted-foreground/60 mt-1">{helper}</p>}
    </div>
  )
}

// ─── Inner Component ────────────────────────────────────────────────────────

function CheckoutContent() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status: authStatus } = useSession()
  const userId       = session?.user?.id

  // ── Cart state ────────────────────────────────────────────────────────────
  const [loading,     setLoading]     = useState(true)
  const [validating,  setValidating]  = useState(false)
  const [items,       setItems]       = useState<CheckoutItem[]>([])
  const [validated,   setValidated]   = useState<ValidatedItem[] | null>(null)
  const [hasBlocking, setHasBlocking] = useState(false)

  // ── Form state ────────────────────────────────────────────────────────────
  const [form, setForm] = useState<ShippingForm>({
    ...EMPTY_FORM,
    email: session?.user?.email ?? '',
  })
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof ShippingForm, string>>>({})
  const [touched, setTouched] = useState<Set<string>>(new Set())

  // ── Submission state ──────────────────────────────────────────────────────
  const [submitting,  setSubmitting]  = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const submittingRef = useRef(false)

  // ── Mobile summary toggle ─────────────────────────────────────────────────
  const [summaryOpen, setSummaryOpen] = useState(false)

  // ── URL params ────────────────────────────────────────────────────────────
  const wasCancelled   = searchParams.get('canceled') === 'true'
  const expressProduct = searchParams.get('product')
  const expressQty     = Math.max(1, parseInt(searchParams.get('quantity') ?? '1', 10))

  // ── Pre-fill email from session ───────────────────────────────────────────
  useEffect(() => {
    if (session?.user?.email && !form.email) {
      setForm(f => ({ ...f, email: session.user?.email ?? '' }))
    }
  }, [session?.user?.email])

  // ── Load cart ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (authStatus === 'loading') return
    // Guest checkout allowed — don't redirect to signin
    if (expressProduct) loadExpressProduct(expressProduct, expressQty)
    else loadCart()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStatus])

  async function loadExpressProduct(productId: string, quantity: number) {
    try {
      const res = await fetch(`/api/products/${productId}`)
      if (!res.ok) throw new Error('Produkt nicht gefunden')
      const { product: dto } = await res.json()
      const item: CheckoutItem = {
        product_id: dto.id, title: dto.title, price: dto.price,
        quantity: Math.min(quantity, dto.stockQuantity),
        images: dto.images ?? [], brand: dto.brand ?? null,
        seller_id: dto.seller?.id ?? '',
      }
      setItems([item])
      await validateItems([item])
    } catch { router.push('/') }
    finally { setLoading(false) }
  }

  async function loadCart() {
    try {
      let cartItems: CheckoutItem[] = []
      const res = await fetch('/api/cart', { cache: 'no-store' })
      if (res.ok) {
        const json = await res.json()
        if (json.success && json.items?.length > 0) {
          cartItems = (json.items as any[]).map(i => ({
            product_id: i.productId, title: i.title, price: i.price,
            quantity: i.quantity, images: i.images, brand: i.brand,
            seller_id: i.sellerId, selected_size: i.selectedSize,
          }))
        }
      }
      if (cartItems.length === 0) {
        const local = getLocalCart()
        cartItems = local.map(l => ({
          product_id: l.product.id, title: l.product.title, price: l.product.price,
          quantity: l.quantity, images: l.product.images, brand: l.product.brand ?? null,
          seller_id: l.product.seller_id, selected_size: l.selectedSize,
        }))
      }
      if (cartItems.length === 0) { router.push('/cart'); return }
      setItems(cartItems)
      await validateItems(cartItems)
    } catch { router.push('/cart') }
    finally { setLoading(false) }
  }

  // ── Validate ──────────────────────────────────────────────────────────────

  async function validateItems(cartItems: CheckoutItem[]) {
    setValidating(true)
    try {
      const payload = cartItems.map(i => ({
        product_id: i.product_id, quantity: i.quantity,
        price: i.price, selected_size: i.selected_size,
      }))
      const res = await fetch('/api/cart/validate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: payload }),
      })
      const data = await res.json()
      if (res.ok) {
        setValidated(data.items)
        setHasBlocking(data.hasBlockingIssues)
        if (data.items) {
          setItems(prev => prev.map(item => {
            const v = (data.items as ValidatedItem[]).find(vi => vi.product_id === item.product_id)
            if (!v) return item
            return { ...item, quantity: v.cappedQty > 0 ? v.cappedQty : item.quantity }
          }))
        }
      }
    } catch {}
    finally { setValidating(false) }
  }

  // ── Form validation ───────────────────────────────────────────────────────

  function validateForm(): boolean {
    const e: Partial<Record<keyof ShippingForm, string>> = {}
    if (!form.firstName.trim()) e.firstName = 'Bitte Vornamen eingeben'
    if (!form.lastName.trim())  e.lastName  = 'Bitte Nachnamen eingeben'
    if (!form.email.trim())     e.email     = 'Bitte E-Mail eingeben'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Ungültige E-Mail-Adresse'
    if (!form.street.trim())    e.street    = 'Bitte Straße und Hausnummer eingeben'
    if (!form.postalCode.trim()) e.postalCode = 'Bitte Postleitzahl eingeben'
    if (!form.city.trim())      e.city      = 'Bitte Stadt eingeben'
    setFormErrors(e)
    return Object.keys(e).length === 0
  }

  function blurValidate(key: keyof ShippingForm) {
    setTouched(t => new Set(t).add(key))
    // Only show errors for touched fields
    const e = { ...formErrors }
    const v = form[key].trim()
    if (key === 'firstName' && !v) e.firstName = 'Bitte Vornamen eingeben'
    else if (key === 'lastName' && !v) e.lastName = 'Bitte Nachnamen eingeben'
    else if (key === 'email' && !v) e.email = 'Bitte E-Mail eingeben'
    else if (key === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) e.email = 'Ungültige E-Mail-Adresse'
    else if (key === 'street' && !v) e.street = 'Bitte Straße und Hausnummer eingeben'
    else if (key === 'postalCode' && !v) e.postalCode = 'Bitte Postleitzahl eingeben'
    else if (key === 'city' && !v) e.city = 'Bitte Stadt eingeben'
    else delete e[key]
    setFormErrors(e)
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (hasBlocking) return
    if (!validateForm()) return
    if (submittingRef.current) return
    submittingRef.current = true
    setSubmitting(true)
    setSubmitError(null)

    try {
      const validateRes = await fetch('/api/cart/validate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(i => ({
            product_id: i.product_id, quantity: i.quantity,
            price: i.price, selected_size: i.selected_size,
          })),
        }),
      })
      const validateData = await validateRes.json()
      if (validateData.hasBlockingIssues) {
        setValidated(validateData.items)
        setHasBlocking(true)
        setSubmitError('Einige Artikel sind nicht mehr verfügbar. Bitte prüfe deinen Warenkorb.')
        return
      }

      const cartPayload = items.map(item => {
        const v = (validateData.items as ValidatedItem[]).find(vi => vi.product_id === item.product_id)
        return {
          product_id: item.product_id, title: item.title,
          price: v ? v.currentPrice : item.price,
          quantity: v ? v.cappedQty : item.quantity,
          images: item.images, brand: item.brand, seller_id: item.seller_id,
        }
      }).filter(i => i.quantity > 0)

      if (cartPayload.length === 0) {
        setSubmitError('Keine gültigen Artikel im Warenkorb.')
        return
      }

      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartItems: cartPayload,
          shippingAddress: {
            fullName: `${form.firstName} ${form.lastName}`.trim(),
            phone: form.phone,
            address: `${form.street}${form.extra ? ', ' + form.extra : ''}`,
            city: form.city,
            district: form.city,
            postalCode: form.postalCode,
            email: form.email,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Bestellung fehlgeschlagen')
      if (data.url) { window.location.href = data.url }
      else throw new Error('Keine Weiterleitungs-URL erhalten')
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Unbekannter Fehler')
      setSubmitting(false)
      submittingRef.current = false
    }
  }

  // ── Derived totals ────────────────────────────────────────────────────────

  const displayItems = items.map(item => {
    const v = validated?.find(vi => vi.product_id === item.product_id)
    return {
      ...item,
      displayPrice: v ? v.currentPrice : item.price,
      qty: v ? (v.cappedQty > 0 ? v.cappedQty : item.quantity) : item.quantity,
    }
  })
  const subtotal = displayItems.reduce((s, i) => s + i.displayPrice * i.qty, 0)
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST
  const total    = subtotal + shipping
  const itemCount = displayItems.reduce((s, i) => s + i.qty, 0)

  // ── Field update helper ───────────────────────────────────────────────────

  const up = (key: keyof ShippingForm) => (v: string) => {
    setForm(f => ({ ...f, [key]: v }))
    if (formErrors[key]) setFormErrors(e => { const n = { ...e }; delete n[key]; return n })
  }

  // ── Render: Loading ───────────────────────────────────────────────────────

  if (authStatus === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <CargoPlaneLoading text="Checkout wird geladen…" />
      </div>
    )
  }

  // ── Validation warnings ───────────────────────────────────────────────────

  const hasWarnings = validated && validated.some(v => v.isUnavailable || v.isOutOfStock || v.priceChanged || v.isQtyCapped)

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      {/* ═══ Header ═══════════════════════════════════════════════════════════ */}
      <div className="border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Zurück</span>
          </button>

          {/* Step indicator */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
                <span className="text-xs font-bold text-primary-foreground">1</span>
              </div>
              <span className="text-xs font-semibold text-foreground hidden sm:inline">Daten & Versand</span>
            </div>
            <div className="w-8 h-px bg-white/[0.15]" />
            <div className="flex items-center gap-1.5">
              <div className="w-7 h-7 rounded-full border border-white/[0.2] flex items-center justify-center">
                <span className="text-xs font-semibold text-muted-foreground">2</span>
              </div>
              <span className="text-xs text-muted-foreground hidden sm:inline">Zahlung</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Lock className="w-3.5 h-3.5" />
            <span className="text-xs font-medium hidden sm:inline">Sichere Verbindung</span>
          </div>
        </div>
      </div>

      {/* ═══ Cancel banner ════════════════════════════════════════════════════ */}
      {wasCancelled && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-3 text-sm text-amber-400">
            <XCircle className="w-4 h-4 flex-shrink-0" />
            Zahlung abgebrochen. Du kannst es jederzeit erneut versuchen.
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 lg:py-10">
        {/* ═══ Mobile Summary Toggle ═════════════════════════════════════════ */}
        <div className="lg:hidden mb-5">
          <button
            onClick={() => setSummaryOpen(!summaryOpen)}
            className="w-full flex items-center justify-between p-4 rounded-xl border border-white/[0.1] bg-white/[0.04]"
          >
            <div className="flex items-center gap-3">
              <Package className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">
                Bestellübersicht ({itemCount} {itemCount === 1 ? 'Artikel' : 'Artikel'})
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-primary">€{total.toFixed(2)}</span>
              {summaryOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </div>
          </button>

          {summaryOpen && (
            <div className="mt-2 p-4 rounded-xl border border-white/[0.1] bg-white/[0.04]">
              <OrderSummaryContent
                displayItems={displayItems} validated={validated}
                subtotal={subtotal} shipping={shipping} total={total}
              />
            </div>
          )}
        </div>

        {/* ═══ Validation warnings ═══════════════════════════════════════════ */}
        {validating && (
          <div className="mb-5 p-3 border border-primary/20 rounded-xl flex items-center gap-3 text-sm text-primary bg-primary/5">
            <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
            Preise und Lagerbestand werden geprüft…
          </div>
        )}

        {hasWarnings && (
          <div className="mb-5 space-y-2">
            {validated!.filter(v => v.isUnavailable || v.isOutOfStock).map(v => (
              <div key={v.product_id} className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-sm text-red-400">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span><strong>{v.title}</strong> {v.isUnavailable ? 'ist nicht mehr verfügbar' : 'ist ausverkauft'}</span>
                <Link href="/cart" className="underline ml-auto flex-shrink-0">Bearbeiten</Link>
              </div>
            ))}
            {validated!.filter(v => v.priceChanged && !v.isUnavailable && !v.isOutOfStock).map(v => (
              <div key={v.product_id} className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-3 text-sm text-amber-400">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>Preis für <strong>{v.title}</strong> geändert: <span className="line-through">€{v.cartPrice.toFixed(2)}</span> → <strong>€{v.currentPrice.toFixed(2)}</strong></span>
              </div>
            ))}
            {validated!.filter(v => v.isQtyCapped).map(v => (
              <div key={v.product_id} className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-3 text-sm text-amber-400">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span><strong>{v.title}</strong> — Menge auf {v.cappedQty} reduziert ({v.stockQuantity} vorrätig)</span>
              </div>
            ))}
          </div>
        )}

        {/* ═══ 2-column layout ═══════════════════════════════════════════════ */}
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-12">

          {/* ── LEFT: Form ─────────────────────────────────────────────────── */}
          <div className="lg:col-span-7">
            <form onSubmit={handleSubmit} className="space-y-8">

              {/* ── Section 1: Kontakt ──────────────────────────────────────── */}
              <section>
                <div className="flex items-center gap-2.5 mb-5">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Mail className="w-4 h-4 text-primary" />
                  </div>
                  <h2 className="text-base font-bold text-foreground">Kontaktinformationen</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
                  <Field id="email" label="E-Mail-Adresse" value={form.email} onChange={up('email')}
                    error={touched.has('email') ? formErrors.email : undefined}
                    type="email" autoComplete="email" inputMode="email" placeholder="deine@email.de" />
                  <Field id="phone" label="Telefonnummer" value={form.phone} onChange={up('phone')}
                    type="tel" autoComplete="tel" inputMode="tel" placeholder="+49 123 456789"
                    required={false} helper="Für Lieferbenachrichtigungen" />
                </div>
              </section>

              {/* ── Section 2: Lieferadresse ────────────────────────────────── */}
              <section>
                <div className="flex items-center gap-2.5 mb-5">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-primary" />
                  </div>
                  <h2 className="text-base font-bold text-foreground">Lieferadresse</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
                  <Field id="firstName" label="Vorname" value={form.firstName} onChange={up('firstName')}
                    error={touched.has('firstName') ? formErrors.firstName : undefined}
                    autoComplete="given-name" placeholder="Max" half />
                  <Field id="lastName" label="Nachname" value={form.lastName} onChange={up('lastName')}
                    error={touched.has('lastName') ? formErrors.lastName : undefined}
                    autoComplete="family-name" placeholder="Mustermann" half />
                  <Field id="street" label="Straße und Hausnummer" value={form.street} onChange={up('street')}
                    error={touched.has('street') ? formErrors.street : undefined}
                    autoComplete="address-line1" placeholder="Musterstraße 12" />
                  <Field id="extra" label="Adresszusatz" value={form.extra} onChange={up('extra')}
                    required={false} autoComplete="address-line2" placeholder="Etage, Wohnung, c/o" />
                  <Field id="postalCode" label="PLZ" value={form.postalCode} onChange={up('postalCode')}
                    error={touched.has('postalCode') ? formErrors.postalCode : undefined}
                    autoComplete="postal-code" inputMode="numeric" placeholder="10115" half />
                  <Field id="city" label="Stadt" value={form.city} onChange={up('city')}
                    error={touched.has('city') ? formErrors.city : undefined}
                    autoComplete="address-level2" placeholder="Berlin" half />
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5 tracking-wide uppercase">Land</label>
                    <div className="relative">
                      <select
                        value={form.country}
                        onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                        autoComplete="country-name"
                        className="w-full px-4 py-3 rounded-xl text-sm text-foreground outline-none transition-all duration-200
                          border bg-white/[0.06] border-white/[0.12] appearance-none
                          focus:border-primary focus:ring-1 focus:ring-primary/30"
                      >
                        <option value="Deutschland">Deutschland</option>
                        <option value="Österreich">Österreich</option>
                        <option value="Schweiz">Schweiz</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>
                </div>
              </section>

              {/* ── Section 3: Zahlung ──────────────────────────────────────── */}
              <section>
                <div className="flex items-center gap-2.5 mb-5">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <CreditCard className="w-4 h-4 text-primary" />
                  </div>
                  <h2 className="text-base font-bold text-foreground">Zahlungsmethode</h2>
                </div>
                <div className="p-4 rounded-xl border border-primary/30 bg-primary/[0.06] flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <CreditCard className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">Kreditkarte / Debitkarte</p>
                    <p className="text-xs text-muted-foreground">Sichere Abwicklung über Stripe — du wirst weitergeleitet</p>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                </div>
              </section>

              {/* ── Submit error ─────────────────────────────────────────────── */}
              {submitError && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400 flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{submitError}</span>
                </div>
              )}

              {hasBlocking && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
                  Einige Artikel im Warenkorb sind nicht verfügbar.{' '}
                  <Link href="/cart" className="underline font-semibold">Warenkorb bearbeiten</Link>
                </div>
              )}

              {/* ── CTA ─────────────────────────────────────────────────────── */}
              <div className="space-y-3 pt-2">
                <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
                  Mit deiner Bestellung akzeptierst du unsere{' '}
                  <Link href="/legal/agb" target="_blank" className="underline hover:text-foreground">AGB</Link>,{' '}
                  <Link href="/legal/privacy" target="_blank" className="underline hover:text-foreground">Datenschutzrichtlinie</Link>{' '}
                  und nimmst das{' '}
                  <Link href="/legal/widerrufsrecht" target="_blank" className="underline hover:text-foreground">Widerrufsrecht</Link>{' '}
                  zur Kenntnis.
                </p>

                <button
                  type="submit"
                  disabled={submitting || hasBlocking || validating}
                  className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-bold text-[15px]
                    hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed
                    flex items-center justify-center gap-2.5 shadow-lg shadow-primary/20"
                >
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Wird verarbeitet…</>
                  ) : validating ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Wird geprüft…</>
                  ) : hasBlocking ? (
                    'Nicht verfügbare Artikel entfernen'
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      Jetzt sicher bezahlen — €{total.toFixed(2)}
                    </>
                  )}
                </button>

                <p className="text-center text-xs text-muted-foreground/60">
                  Du wirst zu Stripe weitergeleitet, um die Zahlung sicher abzuschließen.
                </p>

                {validated && !validating && (
                  <button
                    type="button"
                    onClick={() => validateItems(items)}
                    className="w-full py-2 text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Preise & Verfügbarkeit erneut prüfen
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* ── RIGHT: Summary (desktop) ──────────────────────────────────── */}
          <div className="hidden lg:block lg:col-span-5">
            <div className="sticky top-8 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
              <h2 className="text-base font-bold text-foreground mb-5">
                Bestellübersicht
                <span className="text-muted-foreground font-normal ml-2 text-sm">({itemCount} {itemCount === 1 ? 'Artikel' : 'Artikel'})</span>
              </h2>

              <OrderSummaryContent
                displayItems={displayItems} validated={validated}
                subtotal={subtotal} shipping={shipping} total={total}
              />

              {/* Free shipping progress */}
              {shipping > 0 && (
                <div className="mt-5 pt-4 border-t border-white/[0.06]">
                  <p className="text-xs text-muted-foreground mb-2">
                    Noch <strong className="text-foreground">€{(FREE_SHIPPING_THRESHOLD - subtotal).toFixed(2)}</strong> bis zum kostenlosen Versand
                  </p>
                  <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary/60 transition-all duration-500"
                      style={{ width: `${Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Trust signals */}
              <div className="mt-6 pt-5 border-t border-white/[0.06] space-y-3">
                <TrustRow icon={<Shield className="w-4 h-4" />} text="Käuferschutz bei jeder Bestellung" />
                <TrustRow icon={<Lock className="w-4 h-4" />} text="Verschlüsselte Zahlungsabwicklung" />
                <TrustRow icon={<RotateCcw className="w-4 h-4" />} text="14 Tage Rückgaberecht" />
                <TrustRow icon={<Truck className="w-4 h-4" />} text={shipping === 0 ? 'Kostenloser Versand' : 'Schneller & sicherer Versand'} />
              </div>

              <Link
                href="/cart"
                className="block text-center text-xs text-muted-foreground hover:text-foreground mt-5 transition-colors"
              >
                Warenkorb bearbeiten
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Mobile sticky CTA ═══════════════════════════════════════════════ */}
      <div className="lg:hidden fixed bottom-[72px] left-0 right-0 z-40 p-3 border-t border-white/[0.06] bg-background/95 backdrop-blur-md">
        <button
          type="button"
          onClick={e => { e.preventDefault(); document.querySelector('form')?.requestSubmit() }}
          disabled={submitting || hasBlocking || validating}
          className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm
            hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed
            flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
        >
          {submitting ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Wird verarbeitet…</>
          ) : (
            <>
              <Lock className="w-3.5 h-3.5" />
              Jetzt bezahlen — €{total.toFixed(2)}
            </>
          )}
        </button>
      </div>
    </div>
  )
}

// ─── Order Summary Sub-component ─────────────────────────────────────────────

function OrderSummaryContent({
  displayItems, validated, subtotal, shipping, total,
}: {
  displayItems: Array<{ product_id: string; title: string; displayPrice: number; qty: number; images: string[]; selected_size?: string }>
  validated: ValidatedItem[] | null
  subtotal: number; shipping: number; total: number
}) {
  return (
    <>
      <div className="space-y-3 mb-5">
        {displayItems.map(item => {
          const v = validated?.find(vi => vi.product_id === item.product_id)
          return (
            <div key={item.product_id + (item.selected_size ?? '')}
              className="flex gap-3 pb-3 border-b border-white/[0.06] last:border-0 last:pb-0">
              <div className="w-16 h-16 rounded-lg overflow-hidden border border-white/[0.08] flex-shrink-0 bg-white/[0.04]">
                {item.images?.[0] ? (
                  <Image src={item.images[0]} alt={item.title} width={64} height={64} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-5 h-5 text-muted-foreground/30" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground line-clamp-2 leading-snug">{item.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  {item.selected_size && (
                    <span className="text-xs text-muted-foreground px-1.5 py-0.5 rounded border border-white/[0.08]">Gr. {item.selected_size}</span>
                  )}
                  <span className="text-xs text-muted-foreground">× {item.qty}</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                {v?.priceChanged && (
                  <p className="text-xs line-through text-muted-foreground">€{v.cartPrice.toFixed(2)}</p>
                )}
                <p className={`text-sm font-bold ${v?.priceChanged ? 'text-amber-400' : 'text-foreground'}`}>
                  €{(item.displayPrice * item.qty).toFixed(2)}
                </p>
                {v?.isOutOfStock && <p className="text-xs text-red-400">Ausverkauft</p>}
                {v?.isUnavailable && <p className="text-xs text-red-400">Nicht verfügbar</p>}
              </div>
            </div>
          )
        })}
      </div>

      <div className="space-y-2.5 text-sm">
        <div className="flex justify-between text-muted-foreground">
          <span>Zwischensumme</span>
          <span className="text-foreground">€{subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Versand</span>
          <span className={shipping === 0 ? 'text-green-400 font-semibold' : 'text-foreground'}>
            {shipping === 0 ? 'Kostenlos' : `€${shipping.toFixed(2)}`}
          </span>
        </div>
        <div className="flex justify-between font-bold text-base pt-3 border-t border-white/[0.06]">
          <span className="text-foreground">Gesamt</span>
          <span className="text-primary">€{total.toFixed(2)}</span>
        </div>
      </div>
    </>
  )
}

// ─── Trust Row ──────────────────────────────────────────────────────────────

function TrustRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="text-primary/60">{icon}</div>
      <span className="text-xs text-muted-foreground">{text}</span>
    </div>
  )
}

// ─── Page Wrapper ───────────────────────────────────────────────────────────

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  )
}
