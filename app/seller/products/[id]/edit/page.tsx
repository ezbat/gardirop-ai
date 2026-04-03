'use client'

/**
 * /seller/products/[id]/edit — Premium Product Edit Form
 *
 * Preloads from GET /api/seller/products/[id]
 * Saves via    PATCH /api/seller/products/[id]
 *
 * Image management:
 *   - Existing images shown with remove buttons
 *   - New images can be added (base64 → uploaded by API)
 *   - keepImages + newImages sent in PATCH body
 *
 * Moderation: core-field changes (title, description, price, images, category)
 * will reset moderation_status to 'pending' if product was previously approved.
 */

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowLeft, Save, Loader2, Upload, X, Package, AlertCircle,
  CheckCircle2, ImageIcon, RefreshCw, Info,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface NewImage {
  name: string
  preview: string
  data: string
}

interface FormState {
  title: string
  description: string
  price: string
  original_price: string
  category: string
  brand: string
  color: string
  stock_quantity: string
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

// ─── Moderation badge ─────────────────────────────────────────────────────────

function ModerationBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    approved: { label: 'Freigegeben', className: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20' },
    pending:  { label: 'In Prüfung',  className: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20' },
    rejected: { label: 'Abgelehnt',   className: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' },
  }
  const { label, className } = map[status] ?? map.pending
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${className}`}>
      {label}
    </span>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function EditProductPage() {
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()
  const params = useParams()
  const productId = params.id as string

  // Loading states
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)

  // Form state
  const [form, setForm] = useState<FormState>({
    title: '', description: '', price: '', original_price: '',
    category: '', brand: '', color: '', stock_quantity: '',
  })
  const [sizes, setSizes] = useState<string[]>([])
  const [keepImages, setKeepImages] = useState<string[]>([])   // existing URLs to retain
  const [newImages, setNewImages] = useState<NewImage[]>([])   // new files to upload
  const [moderationStatus, setModerationStatus] = useState<string>('pending')
  const [errors, setErrors] = useState<FormErrors>({})

  // ── Load product ────────────────────────────────────────────────────────────

  const loadProduct = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await fetch(`/api/seller/products/${productId}`, { cache: 'no-store' })
      if (res.status === 404 || res.status === 403) {
        router.push('/seller/products')
        return
      }
      if (!res.ok) {
        setLoadError('Produkt konnte nicht geladen werden.')
        return
      }
      const json = await res.json()
      const p = json.product
      setForm({
        title:          p.title ?? '',
        description:    p.description ?? '',
        price:          p.price?.toString() ?? '',
        original_price: p.original_price?.toString() ?? '',
        category:       p.category ?? '',
        brand:          p.brand ?? '',
        color:          p.color ?? '',
        stock_quantity: p.stock_quantity?.toString() ?? '',
      })
      setSizes(Array.isArray(p.sizes) ? p.sizes : [])
      setKeepImages(Array.isArray(p.images) ? p.images : [])
      setModerationStatus(p.moderation_status ?? 'pending')
    } catch {
      setLoadError('Netzwerkfehler beim Laden.')
    } finally {
      setLoading(false)
    }
  }, [productId, router])

  useEffect(() => {
    if (sessionStatus === 'authenticated' && productId) {
      loadProduct()
    }
  }, [sessionStatus, productId, loadProduct])

  // ── Validation ──────────────────────────────────────────────────────────────

  function validate(): FormErrors {
    const e: FormErrors = {}
    if (!form.title.trim()) e.title = 'Produktname ist erforderlich'
    if (!form.price || isNaN(parseFloat(form.price)) || parseFloat(form.price) <= 0)
      e.price = 'Gültiger Preis erforderlich (> 0)'
    if (!form.category) e.category = 'Kategorie ist erforderlich'
    if (form.stock_quantity === '' || parseInt(form.stock_quantity) < 0)
      e.stock_quantity = 'Lagerbestand muss ≥ 0 sein'
    if (keepImages.length + newImages.length === 0)
      e.images = 'Mindestens ein Bild erforderlich'
    return e
  }

  // ── Image handling ──────────────────────────────────────────────────────────

  const totalImages = keepImages.length + newImages.length

  const handleImageFiles = useCallback((files: FileList | null) => {
    if (!files) return
    const remaining = MAX_IMAGES - totalImages
    const toAdd = Array.from(files).slice(0, remaining)
    toAdd.forEach(file => {
      const reader = new FileReader()
      reader.onload = e => {
        const dataUrl = e.target?.result as string
        setNewImages(prev => [...prev, { name: file.name, preview: dataUrl, data: dataUrl }])
      }
      reader.readAsDataURL(file)
    })
  }, [totalImages])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    handleImageFiles(e.dataTransfer.files)
  }, [handleImageFiles])

  const removeKeepImage = (index: number) => {
    setKeepImages(prev => prev.filter((_, i) => i !== index))
  }

  const removeNewImage = (index: number) => {
    setNewImages(prev => prev.filter((_, i) => i !== index))
  }

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

    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        title:          form.title.trim(),
        description:    form.description.trim() || null,
        price:          parseFloat(form.price),
        original_price: form.original_price ? parseFloat(form.original_price) : null,
        category:       form.category,
        brand:          form.brand.trim() || null,
        color:          form.color.trim() || null,
        sizes,
        stock_quantity: parseInt(form.stock_quantity),
        keepImages,
        newImages: newImages.map(img => ({ name: img.name, data: img.data })),
      }

      const res = await fetch(`/api/seller/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        setServerError(json.error || 'Produkt konnte nicht aktualisiert werden.')
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

  // ── Loading ─────────────────────────────────────────────────────────────────

  if (sessionStatus === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">{loadError}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={loadProduct} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold flex items-center gap-2">
              <RefreshCw className="w-4 h-4" /> Erneut versuchen
            </button>
            <Link href="/seller/products" className="px-4 py-2 glass border border-border rounded-lg text-sm font-semibold text-foreground">
              Zurück
            </Link>
          </div>
        </div>
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
            <div className="flex-1">
              <h1 className="font-serif text-2xl font-bold flex items-center gap-2">
                <Package className="w-6 h-6 text-primary" />
                Produkt bearbeiten
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-muted-foreground">Moderationsstatus:</span>
                <ModerationBadge status={moderationStatus} />
              </div>
            </div>
          </div>

          {/* Remoderation notice */}
          {moderationStatus === 'approved' && (
            <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-start gap-3 text-yellow-700 dark:text-yellow-400">
              <Info className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm">
                Dieses Produkt ist freigegeben. Änderungen an Titel, Beschreibung, Preis, Bildern oder Kategorie
                setzen den Status zurück auf <strong>In Prüfung</strong>.
              </p>
            </div>
          )}

          {/* Success banner */}
          {success && (
            <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl flex items-center gap-3 text-green-600 dark:text-green-400">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>Änderungen gespeichert! Sie werden weitergeleitet…</span>
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
                  ({totalImages}/{MAX_IMAGES})
                </span>
              </h2>

              {/* Existing images */}
              {(keepImages.length > 0 || newImages.length > 0) && (
                <div className="grid grid-cols-4 gap-3 mb-4">
                  {/* Kept existing */}
                  {keepImages.map((url, i) => (
                    <div key={`keep-${i}`} className="relative aspect-square rounded-xl overflow-hidden group border border-border">
                      <Image
                        src={url}
                        alt={`Bild ${i + 1}`}
                        fill
                        className="object-cover"
                        sizes="120px"
                      />
                      <button
                        type="button"
                        onClick={() => removeKeepImage(i)}
                        className="absolute top-1 right-1 p-1 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                      >
                        <X className="w-3.5 h-3.5 text-white" />
                      </button>
                      {i === 0 && newImages.length === 0 && (
                        <span className="absolute bottom-1 left-1 text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded font-semibold">
                          Haupt
                        </span>
                      )}
                    </div>
                  ))}
                  {/* New images */}
                  {newImages.map((img, i) => (
                    <div key={`new-${i}`} className="relative aspect-square rounded-xl overflow-hidden group border border-primary/40">
                      <Image
                        src={img.preview}
                        alt={`Neues Bild ${i + 1}`}
                        fill
                        className="object-cover"
                        sizes="120px"
                        unoptimized
                      />
                      <button
                        type="button"
                        onClick={() => removeNewImage(i)}
                        className="absolute top-1 right-1 p-1 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                      >
                        <X className="w-3.5 h-3.5 text-white" />
                      </button>
                      <span className="absolute bottom-1 left-1 text-[10px] bg-primary/80 text-primary-foreground px-1.5 py-0.5 rounded font-semibold">
                        Neu
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Drop zone */}
              {totalImages < MAX_IMAGES && (
                <div
                  onDrop={handleDrop}
                  onDragOver={e => e.preventDefault()}
                  className="relative border-2 border-dashed border-border hover:border-primary/50 rounded-xl p-6 text-center cursor-pointer transition-colors"
                >
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={e => handleImageFiles(e.target.files)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Upload className="w-7 h-7 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Neue Bilder hinzufügen oder <span className="text-primary font-semibold">auswählen</span>
                  </p>
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
                    className="w-full px-4 py-2.5 glass border border-border rounded-xl outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Farbe</label>
                  <input
                    type="text"
                    value={form.color}
                    onChange={e => setForm({ ...form, color: e.target.value })}
                    className="w-full px-4 py-2.5 glass border border-border rounded-xl outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* ── Section: Pricing & Stock ─────────────────────────────────── */}
            <div className="glass border border-border rounded-2xl p-6 space-y-4">
              <h2 className="text-lg font-bold">Preis & Lagerbestand</h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Verkaufspreis (€) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={form.price}
                    onChange={e => setForm({ ...form, price: e.target.value })}
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
                    className="w-full px-4 py-2.5 glass border border-border rounded-xl outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1.5">Lagerbestand *</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.stock_quantity}
                  onChange={e => setForm({ ...form, stock_quantity: e.target.value })}
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
                    Wird gespeichert…
                  </>
                ) : success ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Gespeichert!
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Änderungen speichern
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
