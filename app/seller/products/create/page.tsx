'use client'

/**
 * /seller/products/create — Premium Product Creation Form
 *
 * Fields: title, description, category, price, original_price,
 *         brand, color, sizes[], stock_quantity, images[]
 *
 * Auth:   useSession → POST /api/seller/products/create
 * UX:     Inline validation, image preview/remove, no alert(), no FloatingParticles
 */

import { useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowLeft, Save, Loader2, Upload, X, Package, AlertCircle,
  CheckCircle2, ImageIcon,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ImageFile {
  name: string
  preview: string   // DataURL for display
  data: string      // DataURL for upload
}

interface FormErrors {
  title?: string
  price?: string
  category?: string
  stock_quantity?: string
  images?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  'Oberteile',
  'Hosen & Shorts',
  'Kleider & Röcke',
  'Jacken & Mäntel',
  'Schuhe',
  'Taschen & Accessoires',
  'Sportbekleidung',
  'Unterwäsche',
  'Sonstiges',
]

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45']

const MAX_IMAGES = 8

// ─── Component ────────────────────────────────────────────────────────────────

export default function CreateProductPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // Form state
  const [form, setForm] = useState({
    title: '',
    description: '',
    price: '',
    original_price: '',
    category: '',
    brand: '',
    color: '',
    stock_quantity: '',
  })
  const [sizes, setSizes] = useState<string[]>([])
  const [images, setImages] = useState<ImageFile[]>([])
  const [errors, setErrors] = useState<FormErrors>({})
  const [saving, setSaving] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // ── Validation ──────────────────────────────────────────────────────────────

  function validate(): FormErrors {
    const e: FormErrors = {}
    if (!form.title.trim()) e.title = 'Produktname ist erforderlich'
    if (!form.price || isNaN(parseFloat(form.price)) || parseFloat(form.price) <= 0)
      e.price = 'Gültiger Preis erforderlich (> 0)'
    if (!form.category) e.category = 'Kategorie ist erforderlich'
    if (!form.stock_quantity || parseInt(form.stock_quantity) < 0)
      e.stock_quantity = 'Lagerbestand muss ≥ 0 sein'
    if (images.length === 0) e.images = 'Mindestens ein Bild erforderlich'
    return e
  }

  // ── Image handling ──────────────────────────────────────────────────────────

  const handleImageFiles = useCallback((files: FileList | null) => {
    if (!files) return
    const remaining = MAX_IMAGES - images.length
    const toAdd = Array.from(files).slice(0, remaining)

    toAdd.forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string
        setImages(prev => [...prev, { name: file.name, preview: dataUrl, data: dataUrl }])
      }
      reader.readAsDataURL(file)
    })
  }, [images.length])

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    handleImageFiles(e.dataTransfer.files)
  }, [handleImageFiles])

  // ── Size toggle ─────────────────────────────────────────────────────────────

  const toggleSize = (s: string) => {
    setSizes(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setServerError(null)

    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    if (!session?.user?.id) return
    setSaving(true)

    try {
      // We need the seller's DB id — fetch it via the products list endpoint
      const sellerRes = await fetch('/api/seller/products', { cache: 'no-store' })
      if (!sellerRes.ok) {
        setServerError('Verkäuferkonto konnte nicht geladen werden.')
        return
      }
      const sellerData = await sellerRes.json()
      const sellerId = sellerData.seller?.id

      if (!sellerId) {
        setServerError('Verkäufer-ID nicht gefunden.')
        return
      }

      const payload = {
        sellerId,
        title: form.title.trim(),
        description: form.description.trim() || null,
        price: form.price,
        originalPrice: form.original_price || null,
        category: form.category,
        brand: form.brand.trim() || null,
        color: form.color.trim() || null,
        sizes,
        stockQuantity: form.stock_quantity,
        images: images.map(img => ({ name: img.name, data: img.data })),
      }

      const res = await fetch('/api/seller/products/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json()

      if (!res.ok || !json.success) {
        if (json.code === 'STRIPE_VERIFICATION_REQUIRED') {
          setServerError('Stripe-Verifizierung erforderlich. Bitte schließen Sie das Onboarding ab.')
        } else {
          setServerError(json.error || 'Produkt konnte nicht erstellt werden.')
        }
        return
      }

      setSuccess(true)
      setTimeout(() => router.push('/seller/products'), 1000)
    } catch {
      setServerError('Netzwerkfehler. Bitte versuchen Sie es erneut.')
    } finally {
      setSaving(false)
    }
  }

  // ── Loading / auth guard ────────────────────────────────────────────────────

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen">
      <section className="py-8 px-4">
        <div className="container mx-auto max-w-3xl">

          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Link href="/seller/products" className="p-2 hover:bg-primary/10 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="font-serif text-2xl font-bold flex items-center gap-2">
                <Package className="w-6 h-6 text-primary" />
                Neues Produkt erstellen
              </h1>
              <p className="text-sm text-muted-foreground">Füllen Sie alle Pflichtfelder (*) aus</p>
            </div>
          </div>

          {/* Success banner */}
          {success && (
            <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl flex items-center gap-3 text-green-600 dark:text-green-400">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>Produkt erfolgreich erstellt! Sie werden weitergeleitet…</span>
            </div>
          )}

          {/* Server error banner */}
          {serverError && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-xl flex items-center gap-3 text-destructive">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* ── Section: Images ─────────────────────────────────────────── */}
            <div className="glass border border-border rounded-2xl p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-primary" />
                Produktbilder *
                <span className="text-sm font-normal text-muted-foreground ml-1">
                  ({images.length}/{MAX_IMAGES})
                </span>
              </h2>

              {/* Drop zone */}
              {images.length < MAX_IMAGES && (
                <div
                  onDrop={handleDrop}
                  onDragOver={e => e.preventDefault()}
                  className="relative border-2 border-dashed border-border hover:border-primary/50 rounded-xl p-8 text-center cursor-pointer transition-colors mb-4"
                >
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={e => handleImageFiles(e.target.files)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Bilder hier ablegen oder <span className="text-primary font-semibold">auswählen</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP – max. {MAX_IMAGES} Bilder</p>
                </div>
              )}

              {/* Thumbnails */}
              {images.length > 0 && (
                <div className="grid grid-cols-4 gap-3">
                  {images.map((img, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden group border border-border">
                      <Image
                        src={img.preview}
                        alt={`Bild ${i + 1}`}
                        fill
                        className="object-cover"
                        sizes="120px"
                        unoptimized
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute top-1 right-1 p-1 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                      >
                        <X className="w-3.5 h-3.5 text-white" />
                      </button>
                      {i === 0 && (
                        <span className="absolute bottom-1 left-1 text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded font-semibold">
                          Haupt
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {errors.images && (
                <p className="mt-2 text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {errors.images}
                </p>
              )}
            </div>

            {/* ── Section: Basic Info ──────────────────────────────────────── */}
            <div className="glass border border-border rounded-2xl p-6 space-y-4">
              <h2 className="text-lg font-bold">Grundinformationen</h2>

              {/* Title */}
              <div>
                <label className="block text-sm font-semibold mb-1.5">Produktname *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="z.B. Slim-Fit Chino"
                  className={`w-full px-4 py-2.5 glass border rounded-xl outline-none focus:border-primary transition-colors ${
                    errors.title ? 'border-destructive' : 'border-border'
                  }`}
                />
                {errors.title && (
                  <p className="mt-1 text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.title}
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold mb-1.5">Beschreibung</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={4}
                  placeholder="Produktbeschreibung, Material, Pflege…"
                  className="w-full px-4 py-2.5 glass border border-border rounded-xl outline-none focus:border-primary transition-colors resize-none"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-semibold mb-1.5">Kategorie *</label>
                <select
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                  className={`w-full px-4 py-2.5 glass border rounded-xl outline-none focus:border-primary transition-colors ${
                    errors.category ? 'border-destructive' : 'border-border'
                  }`}
                >
                  <option value="">Kategorie wählen…</option>
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                {errors.category && (
                  <p className="mt-1 text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.category}
                  </p>
                )}
              </div>

              {/* Brand + Color */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Marke</label>
                  <input
                    type="text"
                    value={form.brand}
                    onChange={e => setForm({ ...form, brand: e.target.value })}
                    placeholder="z.B. Nike"
                    className="w-full px-4 py-2.5 glass border border-border rounded-xl outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Farbe</label>
                  <input
                    type="text"
                    value={form.color}
                    onChange={e => setForm({ ...form, color: e.target.value })}
                    placeholder="z.B. Schwarz"
                    className="w-full px-4 py-2.5 glass border border-border rounded-xl outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* ── Section: Pricing & Stock ─────────────────────────────────── */}
            <div className="glass border border-border rounded-2xl p-6 space-y-4">
              <h2 className="text-lg font-bold">Preis & Lagerbestand</h2>

              <div className="grid grid-cols-2 gap-4">
                {/* Price */}
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Verkaufspreis (€) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={form.price}
                    onChange={e => setForm({ ...form, price: e.target.value })}
                    placeholder="0.00"
                    className={`w-full px-4 py-2.5 glass border rounded-xl outline-none focus:border-primary transition-colors ${
                      errors.price ? 'border-destructive' : 'border-border'
                    }`}
                  />
                  {errors.price && (
                    <p className="mt-1 text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errors.price}
                    </p>
                  )}
                </div>

                {/* Original price */}
                <div>
                  <label className="block text-sm font-semibold mb-1.5">
                    Originalpreis (€)
                    <span className="text-xs font-normal text-muted-foreground ml-1">für Rabatt</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.original_price}
                    onChange={e => setForm({ ...form, original_price: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-4 py-2.5 glass border border-border rounded-xl outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>

              {/* Stock */}
              <div>
                <label className="block text-sm font-semibold mb-1.5">Lagerbestand *</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.stock_quantity}
                  onChange={e => setForm({ ...form, stock_quantity: e.target.value })}
                  placeholder="0"
                  className={`w-full px-4 py-2.5 glass border rounded-xl outline-none focus:border-primary transition-colors ${
                    errors.stock_quantity ? 'border-destructive' : 'border-border'
                  }`}
                />
                {errors.stock_quantity && (
                  <p className="mt-1 text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.stock_quantity}
                  </p>
                )}
              </div>
            </div>

            {/* ── Section: Sizes ───────────────────────────────────────────── */}
            <div className="glass border border-border rounded-2xl p-6">
              <h2 className="text-lg font-bold mb-4">Größen</h2>
              <div className="flex flex-wrap gap-2">
                {SIZES.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSize(s)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${
                      sizes.includes(s)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'glass border-border hover:border-primary/60 text-foreground'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              {sizes.length > 0 && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Ausgewählt: {sizes.join(', ')}
                </p>
              )}
            </div>

            {/* ── Submit ───────────────────────────────────────────────────── */}
            <div className="flex gap-3">
              <Link
                href="/seller/products"
                className="flex-1 px-6 py-3 glass border border-border rounded-xl font-semibold text-center hover:border-primary/50 transition-colors text-foreground"
              >
                Abbrechen
              </Link>
              <button
                type="submit"
                disabled={saving || success}
                className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Wird erstellt…
                  </>
                ) : success ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Erstellt!
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Produkt erstellen
                  </>
                )}
              </button>
            </div>

          </form>
        </div>
      </section>
    </div>
  )
}
