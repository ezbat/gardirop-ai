'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useLanguage } from '@/lib/language-context'
import { supabase } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  ArrowLeft,
  ShoppingCart,
  Heart,
  Star,
  Truck,
  ShieldCheck,
  RotateCcw,
  Lock,
  Eye,
  Clock,
  ChevronDown,
  ChevronUp,
  Flame,
  Store as StoreIcon,
  Check,
  Loader2,
  Share2,
  Zap,
} from 'lucide-react'

// ── Interfaces ──────────────────────────────────────────────────────
interface Product {
  id: string
  seller_id: string
  title: string
  description: string | null
  price: number
  original_price: number | null
  category: string
  brand: string | null
  color: string | null
  sizes: string[]
  stock_quantity: number
  images: string[]
  created_at: string
  seller?: {
    id: string
    shop_name: string
    logo_url: string | null
    is_verified: boolean
  }
}

// ── Colors (oklch gold theme) ───────────────────────────────────────
const GOLD = 'oklch(0.78 0.14 85)'
const GOLD_LIGHT = 'oklch(0.88 0.10 85)'
const GOLD_DARK = 'oklch(0.65 0.16 85)'
const GOLD_BG = 'oklch(0.78 0.14 85 / 0.08)'
const GOLD_BG_HOVER = 'oklch(0.78 0.14 85 / 0.15)'
const SURFACE = 'oklch(0.18 0.005 285)'
const SURFACE_LIGHT = 'oklch(0.22 0.005 285)'
const TEXT_PRIMARY = 'oklch(0.95 0.005 285)'
const TEXT_SECONDARY = 'oklch(0.70 0.01 285)'
const RED_URGENCY = 'oklch(0.65 0.25 25)'
const RED_BG = 'oklch(0.65 0.25 25 / 0.12)'
const BORDER = 'oklch(0.35 0.01 285)'

// ── Component ───────────────────────────────────────────────────────
export default function ProductDetailPage() {
  const router = useRouter()
  const params = useParams()
  const productId = params.id as string
  const { data: session } = useSession()
  const userId = session?.user?.id
  const { t } = useLanguage()

  // State
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState(0)
  const [selectedSize, setSelectedSize] = useState<string>('')
  const [isFavorited, setIsFavorited] = useState(false)
  const [favLoading, setFavLoading] = useState(false)
  const [addedToCart, setAddedToCart] = useState(false)
  const [similarProducts, setSimilarProducts] = useState<Product[]>([])
  const [descriptionOpen, setDescriptionOpen] = useState(false)
  const [countdown, setCountdown] = useState({ h: 2, m: 15, s: 33 })
  const [touchStartX, setTouchStartX] = useState(0)

  const imageContainerRef = useRef<HTMLDivElement>(null)

  // ── Load product ──────────────────────────────────────────────────
  useEffect(() => {
    if (!productId) return
    loadProduct()
  }, [productId])

  // ── Check favorite status ─────────────────────────────────────────
  useEffect(() => {
    if (userId && productId) checkFavorite()
  }, [userId, productId])

  // ── Countdown timer ───────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => {
        let { h, m, s } = prev
        s -= 1
        if (s < 0) { s = 59; m -= 1 }
        if (m < 0) { m = 59; h -= 1 }
        if (h < 0) { h = 23; m = 59; s = 59 }
        return { h, m, s }
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const loadProduct = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*, seller:sellers(id, shop_name, logo_url, is_verified)')
        .eq('id', productId)
        .single()

      if (error) throw error
      setProduct(data)
      if (data.sizes?.length > 0) setSelectedSize(data.sizes[0])
      loadSimilarProducts(data.category, data.id)
    } catch (err) {
      console.error('Product load error:', err)
      router.push('/store')
    } finally {
      setLoading(false)
    }
  }

  const loadSimilarProducts = async (category: string, excludeId: string) => {
    try {
      const { data } = await supabase
        .from('products')
        .select('*, seller:sellers(id, shop_name, logo_url, is_verified)')
        .eq('category', category)
        .neq('id', excludeId)
        .limit(8)
      setSimilarProducts(data || [])
    } catch (err) {
      console.error('Similar products error:', err)
    }
  }

  const checkFavorite = async () => {
    try {
      const res = await fetch(`/api/favorites/products?userId=${userId}&productId=${productId}`)
      if (res.ok) {
        const data = await res.json()
        setIsFavorited(data.isFavorited ?? false)
      }
    } catch (err) {
      console.error('Favorite check error:', err)
    }
  }

  const toggleFavorite = async () => {
    if (!userId) {
      router.push('/auth/signin')
      return
    }
    setFavLoading(true)
    try {
      if (isFavorited) {
        await fetch('/api/favorites/products', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, productId }),
        })
        setIsFavorited(false)
      } else {
        await fetch('/api/favorites/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, productId }),
        })
        setIsFavorited(true)
      }
    } catch (err) {
      console.error('Favorite toggle error:', err)
    } finally {
      setFavLoading(false)
    }
  }

  const addToCart = useCallback(() => {
    if (!product) return
    if (product.sizes.length > 0 && !selectedSize) return

    const cart = JSON.parse(localStorage.getItem('wearo-cart') || '[]')
    const existIdx = cart.findIndex(
      (item: any) => item.productId === product.id && item.size === selectedSize
    )

    if (existIdx > -1) {
      cart[existIdx].quantity += 1
    } else {
      cart.push({
        productId: product.id,
        title: product.title,
        price: product.price,
        image: product.images[0],
        size: selectedSize,
        quantity: 1,
        sellerId: product.seller_id,
      })
    }

    localStorage.setItem('wearo-cart', JSON.stringify(cart))
    setAddedToCart(true)
    setTimeout(() => setAddedToCart(false), 2000)
  }, [product, selectedSize])

  // ── Swipe handlers (mobile image gallery) ─────────────────────────
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!product) return
    const diff = touchStartX - e.changedTouches[0].clientX
    if (Math.abs(diff) > 50) {
      if (diff > 0 && selectedImage < product.images.length - 1) {
        setSelectedImage((p) => p + 1)
      } else if (diff < 0 && selectedImage > 0) {
        setSelectedImage((p) => p - 1)
      }
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────
  const discountPercent =
    product?.original_price && product.original_price > product.price
      ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
      : 0

  const pad = (n: number) => n.toString().padStart(2, '0')

  // ── Star rating renderer ──────────────────────────────────────────
  const renderStars = (rating: number) => {
    const stars = []
    for (let i = 1; i <= 5; i++) {
      if (i <= Math.floor(rating)) {
        stars.push(
          <Star key={i} size={16} fill={GOLD} style={{ color: GOLD }} />
        )
      } else if (i - rating < 1) {
        // half star
        stars.push(
          <span key={i} style={{ position: 'relative', display: 'inline-block', width: 16, height: 16 }}>
            <Star size={16} style={{ color: BORDER, position: 'absolute', top: 0, left: 0 }} />
            <span style={{ position: 'absolute', top: 0, left: 0, width: '50%', overflow: 'hidden' }}>
              <Star size={16} fill={GOLD} style={{ color: GOLD }} />
            </span>
          </span>
        )
      } else {
        stars.push(
          <Star key={i} size={16} style={{ color: BORDER }} />
        )
      }
    }
    return stars
  }

  // ── Loading state ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'oklch(0.13 0.005 285)',
      }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        >
          <Loader2 size={36} style={{ color: GOLD }} />
        </motion.div>
      </div>
    )
  }

  if (!product) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: TEXT_SECONDARY,
        background: 'oklch(0.13 0.005 285)',
      }}>
        <p>Produkt nicht gefunden</p>
      </div>
    )
  }

  // ── Main render ───────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'oklch(0.13 0.005 285)', paddingBottom: 100 }}>
      {/* ── Back button ────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          padding: '12px 16px',
          backdropFilter: 'blur(20px)',
          background: 'oklch(0.13 0.005 285 / 0.85)',
          borderBottom: `1px solid ${BORDER}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <button
          onClick={() => router.back()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'none',
            border: 'none',
            color: TEXT_PRIMARY,
            cursor: 'pointer',
            fontSize: 15,
            fontWeight: 500,
            padding: '8px 12px',
            borderRadius: 12,
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = GOLD_BG)}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
        >
          <ArrowLeft size={20} />
          <span>Zurück</span>
        </button>

        <button
          onClick={() => {
            if (navigator.share) {
              navigator.share({ title: product.title, url: window.location.href })
            } else {
              navigator.clipboard.writeText(window.location.href)
            }
          }}
          style={{
            background: 'none',
            border: 'none',
            color: TEXT_SECONDARY,
            cursor: 'pointer',
            padding: 8,
            borderRadius: 12,
          }}
        >
          <Share2 size={20} />
        </button>
      </motion.div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 32, paddingTop: 24 }}
          className="lg:!grid-cols-2"
        >
          {/* ═══════════════════════════════════════════════════════════
              LEFT COLUMN: IMAGE GALLERY
          ═══════════════════════════════════════════════════════════ */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Main Image */}
            <div
              ref={imageContainerRef}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              style={{
                position: 'relative',
                aspectRatio: '3 / 4',
                borderRadius: 20,
                overflow: 'hidden',
                background: SURFACE,
                border: `1px solid ${BORDER}`,
              }}
            >
              <AnimatePresence mode="wait">
                <motion.img
                  key={selectedImage}
                  src={product.images[selectedImage]}
                  alt={product.title}
                  initial={{ opacity: 0, scale: 1.02 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.3 }}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </AnimatePresence>

              {/* Discount badge */}
              {discountPercent > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: 'spring' }}
                  style={{
                    position: 'absolute',
                    top: 16,
                    left: 16,
                    background: RED_URGENCY,
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 14,
                    padding: '6px 14px',
                    borderRadius: 30,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Zap size={14} />
                  -{discountPercent}%
                </motion.div>
              )}

              {/* Favorite heart overlay */}
              <button
                onClick={toggleFavorite}
                disabled={favLoading}
                style={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: 'oklch(0.13 0.005 285 / 0.6)',
                  backdropFilter: 'blur(10px)',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'transform 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                {favLoading ? (
                  <Loader2 size={20} style={{ color: '#fff', animation: 'spin 1s linear infinite' }} />
                ) : (
                  <Heart
                    size={22}
                    fill={isFavorited ? '#ef4444' : 'none'}
                    style={{ color: isFavorited ? '#ef4444' : '#fff' }}
                  />
                )}
              </button>

              {/* Image dots indicator */}
              {product.images.length > 1 && (
                <div style={{
                  position: 'absolute',
                  bottom: 16,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  display: 'flex',
                  gap: 8,
                }}>
                  {product.images.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedImage(i)}
                      style={{
                        width: selectedImage === i ? 24 : 8,
                        height: 8,
                        borderRadius: 4,
                        background: selectedImage === i ? GOLD : 'oklch(0.95 0 0 / 0.4)',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.3s',
                        padding: 0,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Thumbnail strip */}
            {product.images.length > 1 && (
              <div style={{
                display: 'flex',
                gap: 10,
                marginTop: 14,
                overflowX: 'auto',
                paddingBottom: 4,
              }}>
                {product.images.map((img, i) => (
                  <motion.button
                    key={i}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedImage(i)}
                    style={{
                      width: 72,
                      height: 72,
                      minWidth: 72,
                      borderRadius: 12,
                      overflow: 'hidden',
                      border: selectedImage === i ? `2px solid ${GOLD}` : `1px solid ${BORDER}`,
                      cursor: 'pointer',
                      padding: 0,
                      background: 'none',
                      opacity: selectedImage === i ? 1 : 0.6,
                      transition: 'all 0.2s',
                    }}
                  >
                    <img
                      src={img}
                      alt={`${product.title} ${i + 1}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </motion.button>
                ))}
              </div>
            )}
          </motion.div>

          {/* ═══════════════════════════════════════════════════════════
              RIGHT COLUMN: PRODUCT INFO
          ═══════════════════════════════════════════════════════════ */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
          >
            {/* Brand */}
            {product.brand && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                style={{
                  color: GOLD,
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                }}
              >
                {product.brand}
              </motion.span>
            )}

            {/* Title */}
            <h1 style={{
              fontSize: 28,
              fontWeight: 700,
              color: TEXT_PRIMARY,
              lineHeight: 1.3,
              margin: 0,
            }}>
              {product.title}
            </h1>

            {/* Star rating */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {renderStars(4.5)}
              </div>
              <span style={{ color: GOLD, fontWeight: 600, fontSize: 14 }}>4.5</span>
              <span style={{ color: TEXT_SECONDARY, fontSize: 13 }}>(127 Bewertungen)</span>
            </div>

            {/* Price section */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
              <span style={{
                fontSize: 34,
                fontWeight: 800,
                color: GOLD,
              }}>
                {product.price.toFixed(2)} &euro;
              </span>
              {product.original_price && product.original_price > product.price && (
                <>
                  <span style={{
                    fontSize: 20,
                    color: TEXT_SECONDARY,
                    textDecoration: 'line-through',
                  }}>
                    {product.original_price.toFixed(2)} &euro;
                  </span>
                  <span style={{
                    background: RED_URGENCY,
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: 20,
                  }}>
                    -{discountPercent}% RABATT
                  </span>
                </>
              )}
            </div>

            {/* Shipping trust text */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Truck size={16} style={{ color: 'oklch(0.72 0.18 155)' }} />
                <span style={{ color: 'oklch(0.72 0.18 155)', fontSize: 13, fontWeight: 600 }}>
                  Kostenloser Versand
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={16} style={{ color: TEXT_SECONDARY }} />
                <span style={{ color: TEXT_SECONDARY, fontSize: 13 }}>
                  Lieferung in 3-5 Werktagen
                </span>
              </div>
            </div>

            {/* ── FOMO Elements ─────────────────────────────────────── */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              padding: 16,
              borderRadius: 16,
              background: SURFACE,
              border: `1px solid ${BORDER}`,
            }}>
              {/* Low stock warning */}
              {product.stock_quantity > 0 && product.stock_quantity < 10 && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: RED_BG,
                    padding: '8px 14px',
                    borderRadius: 10,
                  }}
                >
                  <Flame size={16} style={{ color: RED_URGENCY }} />
                  <span style={{ color: RED_URGENCY, fontWeight: 700, fontSize: 13 }}>
                    Nur noch {product.stock_quantity} auf Lager!
                  </span>
                </motion.div>
              )}

              {/* Social proof */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <Eye size={16} style={{ color: GOLD }} />
                <span style={{ color: TEXT_SECONDARY, fontSize: 13 }}>
                  <strong style={{ color: TEXT_PRIMARY }}>47 Personen</strong> sehen sich das gerade an
                </span>
              </div>

              {/* Countdown */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <Clock size={16} style={{ color: RED_URGENCY }} />
                <span style={{ color: TEXT_SECONDARY, fontSize: 13 }}>
                  Angebot endet in:
                </span>
                <span style={{
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  fontSize: 14,
                  color: RED_URGENCY,
                  background: RED_BG,
                  padding: '3px 10px',
                  borderRadius: 6,
                }}>
                  {pad(countdown.h)}:{pad(countdown.m)}:{pad(countdown.s)}
                </span>
              </div>
            </div>

            {/* ── Size selector ─────────────────────────────────────── */}
            {product.sizes && product.sizes.length > 0 && (
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 12,
                }}>
                  <span style={{ color: TEXT_PRIMARY, fontWeight: 600, fontSize: 15 }}>
                    Größe
                  </span>
                  <span style={{ color: TEXT_SECONDARY, fontSize: 12 }}>
                    Ausgewählt: <strong style={{ color: GOLD }}>{selectedSize}</strong>
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {product.sizes.map((size) => {
                    const isSelected = selectedSize === size
                    return (
                      <motion.button
                        key={size}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedSize(size)}
                        style={{
                          minWidth: 52,
                          height: 44,
                          padding: '0 18px',
                          borderRadius: 12,
                          border: isSelected ? `2px solid ${GOLD}` : `1px solid ${BORDER}`,
                          background: isSelected ? GOLD_BG : 'transparent',
                          color: isSelected ? GOLD : TEXT_PRIMARY,
                          fontWeight: isSelected ? 700 : 500,
                          fontSize: 14,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                      >
                        {size}
                      </motion.button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── Action buttons ────────────────────────────────────── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
              {/* Add to cart */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={addToCart}
                disabled={product.stock_quantity === 0}
                style={{
                  width: '100%',
                  height: 56,
                  borderRadius: 16,
                  border: 'none',
                  background: addedToCart
                    ? 'oklch(0.72 0.18 155)'
                    : `linear-gradient(135deg, ${GOLD}, ${GOLD_DARK})`,
                  color: '#000',
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: product.stock_quantity === 0 ? 'not-allowed' : 'pointer',
                  opacity: product.stock_quantity === 0 ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  transition: 'background 0.3s, opacity 0.3s',
                  boxShadow: `0 4px 20px oklch(0.78 0.14 85 / 0.3)`,
                }}
              >
                {addedToCart ? (
                  <>
                    <Check size={20} />
                    Hinzugefügt!
                  </>
                ) : (
                  <>
                    <ShoppingCart size={20} />
                    In den Warenkorb
                  </>
                )}
              </motion.button>

              {/* Buy now */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  addToCart()
                  router.push('/checkout')
                }}
                disabled={product.stock_quantity === 0}
                style={{
                  width: '100%',
                  height: 52,
                  borderRadius: 16,
                  border: `2px solid ${GOLD}`,
                  background: 'transparent',
                  color: GOLD,
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: product.stock_quantity === 0 ? 'not-allowed' : 'pointer',
                  opacity: product.stock_quantity === 0 ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = GOLD_BG)}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <Zap size={18} />
                Jetzt kaufen
              </motion.button>
            </div>

            {/* ── Trust badges row ──────────────────────────────────── */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 12,
              marginTop: 4,
            }}>
              {[
                { icon: <Lock size={20} style={{ color: GOLD }} />, label: 'SSL-Verschlüsselt', sub: '256-bit Schutz' },
                { icon: <RotateCcw size={20} style={{ color: GOLD }} />, label: '14 Tage Rückgabe', sub: 'Kostenlos' },
                { icon: <ShieldCheck size={20} style={{ color: GOLD }} />, label: 'Käuferschutz', sub: '100% Garantie' },
              ].map((badge, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                    padding: '14px 8px',
                    borderRadius: 14,
                    background: SURFACE,
                    border: `1px solid ${BORDER}`,
                    textAlign: 'center',
                  }}
                >
                  {badge.icon}
                  <span style={{ fontSize: 11, fontWeight: 600, color: TEXT_PRIMARY }}>
                    {badge.label}
                  </span>
                  <span style={{ fontSize: 10, color: TEXT_SECONDARY }}>
                    {badge.sub}
                  </span>
                </motion.div>
              ))}
            </div>

            {/* ── Product description accordion ────────────────────── */}
            {product.description && (
              <div style={{
                borderRadius: 16,
                border: `1px solid ${BORDER}`,
                overflow: 'hidden',
              }}>
                <button
                  onClick={() => setDescriptionOpen(!descriptionOpen)}
                  style={{
                    width: '100%',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: SURFACE,
                    border: 'none',
                    cursor: 'pointer',
                    color: TEXT_PRIMARY,
                    fontWeight: 600,
                    fontSize: 15,
                  }}
                >
                  <span>Produktbeschreibung</span>
                  {descriptionOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
                <AnimatePresence>
                  {descriptionOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div style={{
                        padding: '0 20px 20px',
                        background: SURFACE,
                        color: TEXT_SECONDARY,
                        fontSize: 14,
                        lineHeight: 1.7,
                      }}>
                        {product.description}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* ── Seller info card ─────────────────────────────────── */}
            {product.seller && (
              <Link
                href={`/seller/${product.seller.id}`}
                style={{ textDecoration: 'none' }}
              >
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: 16,
                    borderRadius: 16,
                    background: SURFACE,
                    border: `1px solid ${BORDER}`,
                    cursor: 'pointer',
                    transition: 'border-color 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = GOLD)}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = BORDER)}
                >
                  {product.seller.logo_url ? (
                    <img
                      src={product.seller.logo_url}
                      alt={product.seller.shop_name}
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: `2px solid ${BORDER}`,
                      }}
                    />
                  ) : (
                    <div style={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      background: GOLD_BG,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <StoreIcon size={22} style={{ color: GOLD }} />
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: TEXT_SECONDARY, marginBottom: 2 }}>Verkäufer</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 15, fontWeight: 600, color: TEXT_PRIMARY }}>
                        {product.seller.shop_name}
                      </span>
                      {product.seller.is_verified && (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 18,
                          height: 18,
                          borderRadius: '50%',
                          background: 'oklch(0.65 0.18 250)',
                        }}>
                          <Check size={11} style={{ color: '#fff' }} />
                        </span>
                      )}
                    </div>
                  </div>
                  <ArrowLeft size={18} style={{ color: TEXT_SECONDARY, transform: 'rotate(180deg)' }} />
                </motion.div>
              </Link>
            )}
          </motion.div>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            SIMILAR PRODUCTS SECTION
        ═══════════════════════════════════════════════════════════ */}
        {similarProducts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            style={{ marginTop: 48 }}
          >
            <h2 style={{
              fontSize: 22,
              fontWeight: 700,
              color: TEXT_PRIMARY,
              marginBottom: 20,
            }}>
              Ähnliche Produkte
            </h2>

            <div style={{
              display: 'flex',
              gap: 16,
              overflowX: 'auto',
              paddingBottom: 16,
              scrollSnapType: 'x mandatory',
            }}>
              {similarProducts.map((sp, i) => {
                const spDiscount =
                  sp.original_price && sp.original_price > sp.price
                    ? Math.round(((sp.original_price - sp.price) / sp.original_price) * 100)
                    : 0

                return (
                  <motion.div
                    key={sp.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + i * 0.05 }}
                    whileHover={{ y: -4 }}
                    onClick={() => router.push(`/store/${sp.id}`)}
                    style={{
                      minWidth: 200,
                      maxWidth: 220,
                      flexShrink: 0,
                      borderRadius: 16,
                      overflow: 'hidden',
                      background: SURFACE,
                      border: `1px solid ${BORDER}`,
                      cursor: 'pointer',
                      scrollSnapAlign: 'start',
                      transition: 'border-color 0.2s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = GOLD)}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = BORDER)}
                  >
                    <div style={{
                      position: 'relative',
                      aspectRatio: '3 / 4',
                      overflow: 'hidden',
                    }}>
                      <img
                        src={sp.images[0]}
                        alt={sp.title}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          transition: 'transform 0.3s',
                        }}
                      />
                      {spDiscount > 0 && (
                        <span style={{
                          position: 'absolute',
                          top: 8,
                          left: 8,
                          background: RED_URGENCY,
                          color: '#fff',
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 20,
                        }}>
                          -{spDiscount}%
                        </span>
                      )}
                    </div>
                    <div style={{ padding: '12px 14px 14px' }}>
                      {sp.brand && (
                        <span style={{
                          fontSize: 10,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: 1,
                          color: GOLD,
                        }}>
                          {sp.brand}
                        </span>
                      )}
                      <h3 style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: TEXT_PRIMARY,
                        margin: '4px 0 8px',
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        lineHeight: 1.3,
                      }}>
                        {sp.title}
                      </h3>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                        <span style={{ fontSize: 16, fontWeight: 700, color: GOLD }}>
                          {sp.price.toFixed(2)} &euro;
                        </span>
                        {sp.original_price && sp.original_price > sp.price && (
                          <span style={{
                            fontSize: 12,
                            color: TEXT_SECONDARY,
                            textDecoration: 'line-through',
                          }}>
                            {sp.original_price.toFixed(2)} &euro;
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════
          RESPONSIVE GRID CSS (lg breakpoint)
      ═══════════════════════════════════════════════════════════ */}
      <style jsx global>{`
        @media (min-width: 1024px) {
          .lg\\:!grid-cols-2 {
            grid-template-columns: 1fr 1fr !important;
          }
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Hide scrollbar on horizontal scroll containers */
        div::-webkit-scrollbar {
          height: 4px;
        }
        div::-webkit-scrollbar-track {
          background: transparent;
        }
        div::-webkit-scrollbar-thumb {
          background: ${BORDER};
          border-radius: 4px;
        }
      `}</style>
    </div>
  )
}
