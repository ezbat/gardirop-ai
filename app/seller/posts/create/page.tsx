'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Upload, X, ImagePlus, Hash, Link2, Loader2,
  ShoppingBag, Check,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

// ── Seller dark theme tokens ─────────────────────────────────────
const BG       = '#0B0D14'
const SURFACE  = '#111520'
const ELEVATED = '#1A1E2E'
const BORDER   = '#252A3C'
const TEXT1    = '#F1F1F4'
const TEXT2    = '#9BA3B5'
const ACCENT   = '#D97706'

interface SellerProduct {
  id: string
  title: string
  images: string[]
  price: number
}

export default function CreatePostPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [caption, setCaption] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [postType, setPostType] = useState<'image' | 'product_showcase'>('image')
  const [products, setProducts] = useState<SellerProduct[]>([])
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Load seller's products for linking
  useEffect(() => {
    fetch('/api/seller/products')
      .then(r => r.json())
      .then(d => { if (d.success) setProducts(d.products || []) })
      .catch(() => {})
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const removeImage = () => {
    setImageFile(null)
    setImagePreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const toggleProduct = (id: string) => {
    setSelectedProducts(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    )
  }

  const handleSubmit = async () => {
    if (!imageFile && !imagePreview) {
      setError('Bitte ein Bild hochladen.')
      return
    }
    setError('')
    setSubmitting(true)

    try {
      // Upload image to Supabase Storage
      let imageUrl = ''
      if (imageFile) {
        const ext = imageFile.name.split('.').pop() || 'jpg'
        const path = `posts/${session?.user?.id}/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(path, imageFile, { cacheControl: '3600', upsert: false })

        if (uploadError) throw new Error('Bild-Upload fehlgeschlagen')

        const { data: urlData } = supabase.storage.from('images').getPublicUrl(path)
        imageUrl = urlData.publicUrl
      }

      // Create post via API
      const res = await fetch('/api/seller/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caption,
          imageUrl,
          postType: selectedProducts.length > 0 ? 'product_showcase' : 'image',
          linkedProductIds: selectedProducts,
        }),
      })

      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Fehler beim Erstellen')

      router.push('/seller/posts')
    } catch (e: any) {
      setError(e.message || 'Unbekannter Fehler')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: BG, color: TEXT1 }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          <Link href="/seller/posts" style={{ color: TEXT2, display: 'flex' }}>
            <ArrowLeft style={{ width: 20, height: 20 }} />
          </Link>
          <h1 style={{ fontSize: 22, fontWeight: 800 }}>Neuer Beitrag</h1>
        </div>

        {/* Image upload */}
        <div style={{
          background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16,
          padding: 24, marginBottom: 20,
        }}>
          <label style={{ fontSize: 13, fontWeight: 700, color: TEXT2, marginBottom: 12, display: 'block' }}>
            Bild *
          </label>
          {imagePreview ? (
            <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', maxHeight: 400 }}>
              <img src={imagePreview} alt="Vorschau" style={{ width: '100%', maxHeight: 400, objectFit: 'cover' }} />
              <button
                onClick={removeImage}
                style={{
                  position: 'absolute', top: 10, right: 10,
                  width: 30, height: 30, borderRadius: '50%',
                  background: 'rgba(0,0,0,0.7)', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <X style={{ width: 16, height: 16, color: '#fff' }} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              style={{
                width: '100%', padding: '48px 0', borderRadius: 12,
                background: ELEVATED, border: `2px dashed ${BORDER}`,
                color: TEXT2, cursor: 'pointer', display: 'flex',
                flexDirection: 'column', alignItems: 'center', gap: 10,
              }}
            >
              <Upload style={{ width: 28, height: 28 }} />
              <span style={{ fontWeight: 600, fontSize: 14 }}>Bild auswählen</span>
              <span style={{ fontSize: 12 }}>JPG, PNG, WebP — max 10 MB</span>
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
        </div>

        {/* Caption */}
        <div style={{
          background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16,
          padding: 24, marginBottom: 20,
        }}>
          <label style={{ fontSize: 13, fontWeight: 700, color: TEXT2, marginBottom: 12, display: 'block' }}>
            Beschreibung
          </label>
          <textarea
            value={caption}
            onChange={e => setCaption(e.target.value)}
            placeholder="Beschreibe deinen Beitrag... Nutze #Hashtags für mehr Reichweite"
            rows={4}
            maxLength={2000}
            style={{
              width: '100%', padding: 14, borderRadius: 10,
              background: ELEVATED, border: `1px solid ${BORDER}`, color: TEXT1,
              fontSize: 14, outline: 'none', resize: 'vertical',
            }}
          />
          <div style={{ textAlign: 'right', fontSize: 11, color: TEXT2, marginTop: 6 }}>
            {caption.length}/2000
          </div>
        </div>

        {/* Link products */}
        <div style={{
          background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16,
          padding: 24, marginBottom: 20,
        }}>
          <label style={{ fontSize: 13, fontWeight: 700, color: TEXT2, marginBottom: 12, display: 'block' }}>
            <ShoppingBag style={{ width: 14, height: 14, display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
            Produkte verknüpfen (optional)
          </label>
          {products.length === 0 ? (
            <p style={{ fontSize: 13, color: TEXT2 }}>Keine Produkte vorhanden.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10, maxHeight: 300, overflowY: 'auto' }}>
              {products.slice(0, 20).map(p => {
                const selected = selectedProducts.includes(p.id)
                return (
                  <button
                    key={p.id}
                    onClick={() => toggleProduct(p.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: 10, borderRadius: 10, textAlign: 'left',
                      background: selected ? `${ACCENT}18` : ELEVATED,
                      border: `1px solid ${selected ? ACCENT : BORDER}`,
                      color: TEXT1, cursor: 'pointer',
                    }}
                  >
                    <img
                      src={p.images?.[0] || '/placeholder.png'}
                      alt={p.title}
                      style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</div>
                      <div style={{ fontSize: 11, color: TEXT2 }}>{p.price.toFixed(2)} €</div>
                    </div>
                    {selected && <Check style={{ width: 16, height: 16, color: ACCENT, flexShrink: 0 }} />}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={{
            padding: '12px 16px', borderRadius: 10, marginBottom: 16,
            background: 'rgba(239,68,68,0.12)', color: '#EF4444',
            fontSize: 13, fontWeight: 600,
          }}>
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={submitting || !imageFile}
          style={{
            width: '100%', padding: '14px 0', borderRadius: 12,
            background: ACCENT, color: '#fff', fontWeight: 700, fontSize: 15,
            border: 'none', cursor: submitting || !imageFile ? 'not-allowed' : 'pointer',
            opacity: submitting || !imageFile ? 0.5 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {submitting ? (
            <><Loader2 style={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} /> Wird erstellt...</>
          ) : (
            <><ImagePlus style={{ width: 18, height: 18 }} /> Beitrag veröffentlichen</>
          )}
        </button>
      </div>
    </div>
  )
}
