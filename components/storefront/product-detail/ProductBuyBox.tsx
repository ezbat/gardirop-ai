'use client'

/**
 * ProductBuyBox
 *
 * The full conversion engine of the PDP.
 * Contains: PriceBlock · StockSignal · VariantSelector · QuantityStepper ·
 *           Primary CTA · Secondary CTA · WishlistButton · TrustBar ·
 *           SellerCard
 *
 * TODO: wire wishlist to a persistent API when /api/wishlist endpoint exists.
 * TODO: wire addToCart to the /api/cart route once it is built; for now uses
 *       lib/cart.ts (direct Supabase client insert).
 */

import { useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  ShoppingCart, ShoppingBag, Heart, Shield,
  Truck, RotateCcw, Store, CheckCircle2, AlertTriangle, MessageCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'

import { useAuthModal } from '@/components/auth-modal'
import { addToCartLocal } from '@/lib/cart-local'
import { track } from '@/lib/tracking'
import { ProductPriceBlock } from './ProductPriceBlock'
import { ProductVariantSelector } from './ProductVariantSelector'
import type { ProductDetailDTO } from './types'

// ─── Props ────────────────────────────────────────────────────────────────────
interface ProductBuyBoxProps {
  dto: ProductDetailDTO
}

// ─── Component ────────────────────────────────────────────────────────────────
export function ProductBuyBox({ dto }: ProductBuyBoxProps) {
  const { data: session } = useSession()
  const router            = useRouter()
  const { requireAuth }   = useAuthModal()

  // ── Local state ─────────────────────────────────────────────────────────────
  const [quantity,  setQuantity]    = useState(1)
  const [selected,  setSelected]    = useState<Record<string, string>>({})
  const [isAdding,  setIsAdding]    = useState(false)
  const [isBuying,  setIsBuying]    = useState(false)
  const [wishlisted, setWishlisted] = useState(false)

  // ── Derived state ────────────────────────────────────────────────────────────
  const userId = session?.user?.id ?? null
  const maxQty = Math.min(dto.stockQuantity, 99)

  // All required variant groups must have a selection
  const variantsRequired = dto.variants && dto.variants.length > 0
  const allSelected = variantsRequired
    ? dto.variants!.every(g => !!selected[g.name])
    : true

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleVariantChange = useCallback((group: string, value: string) => {
    setSelected(prev => ({ ...prev, [group]: value }))
  }, [])

  const handleAddToCart = useCallback(() => {
    if (dto.isOutOfStock) return

    if (variantsRequired && !allSelected) {
      toast.error('Bitte wähle alle Optionen aus')
      return
    }

    const selectedSize = selected['Größe'] ?? selected['Size'] ?? selected['Größen'] ?? undefined

    setIsAdding(true)
    try {
      addToCartLocal(
        {
          id:            dto.id,
          title:         dto.title,
          price:         dto.price,
          images:        dto.images,
          stock_quantity: dto.stockQuantity,
          seller_id:     dto.seller.id,
          brand:         dto.brand ?? null,
        },
        quantity,
        selectedSize,
      )
      track('add_to_cart', {
        seller_id:  dto.seller.id,
        product_id: dto.id,
        value:      dto.price * quantity,
      })
      toast.success(`${quantity} × ${dto.title} wurde hinzugefügt`, {
        description: 'Artikel im Warenkorb',
        action: { label: 'Warenkorb öffnen', onClick: () => router.push('/cart') },
      })
    } catch {
      toast.error('Ein Fehler ist aufgetreten.')
    } finally {
      setIsAdding(false)
    }
  }, [dto, quantity, variantsRequired, allSelected, selected, router])

  const handleBuyNow = useCallback(() => {
    if (dto.isOutOfStock) return

    if (variantsRequired && !allSelected) {
      toast.error('Bitte wähle alle Optionen aus')
      return
    }

    if (!userId) {
      if (!requireAuth('Melde dich an, um dieses Produkt zu kaufen.')) return
    }

    setIsBuying(true)
    router.push(`/checkout?product=${dto.id}&quantity=${quantity}`)
  }, [dto.id, dto.isOutOfStock, userId, quantity, variantsRequired, allSelected, router])

  // ── CTA label logic ───────────────────────────────────────────────────────────
  const ctaLabel = dto.isOutOfStock
    ? 'Ausverkauft'
    : variantsRequired && !allSelected
    ? 'Optionen wählen'
    : 'In den Warenkorb'

  const ctaDisabled = dto.isOutOfStock || isAdding

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 mb-[120px] lg:mb-0">

      {/* ── Divider line ────────────────────────────────────────────────────── */}
      <div className="h-px bg-[#F0F0F0]" />

      {/* ── Price ───────────────────────────────────────────────────────────── */}
      <ProductPriceBlock
        price={dto.price}
        currency={dto.currency}
        compareAtPrice={dto.compareAtPrice}
        discountPercent={dto.discountPercent}
        savings={dto.savings}
        isOutOfStock={dto.isOutOfStock}
      />

      {/* ── Stock signal ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        {dto.isOutOfStock ? (
          <>
            <AlertTriangle className="w-4 h-4 text-[#DC2626] flex-shrink-0" />
            <span className="text-[13px] font-semibold text-[#DC2626]">Nicht verfügbar</span>
          </>
        ) : dto.isLowStock ? (
          <>
            <AlertTriangle className="w-4 h-4 text-[#D97706] flex-shrink-0" />
            <span className="text-[13px] font-semibold text-[#D97706]">
              Nur noch {dto.stockQuantity} auf Lager — jetzt sichern
            </span>
          </>
        ) : (
          <>
            <CheckCircle2 className="w-4 h-4 text-[#16A34A] flex-shrink-0" />
            <span className="text-[13px] font-semibold text-[#16A34A]">Auf Lager</span>
          </>
        )}
      </div>

      {/* ── Variant selector ────────────────────────────────────────────────── */}
      {dto.variants && dto.variants.length > 0 && (
        <ProductVariantSelector
          variants={dto.variants}
          selected={selected}
          onChange={handleVariantChange}
        />
      )}

      {/* ── Quantity stepper ────────────────────────────────────────────────── */}
      {!dto.isOutOfStock && (
        <div className="flex items-center gap-4">
          <span className="text-[13px] font-semibold text-[#6B7280] tracking-wide uppercase">
            Menge
          </span>
          <div className="flex items-center gap-3 border border-[#E5E7EB] rounded-xl overflow-hidden">
            <button
              onClick={() => setQuantity(q => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              className="w-10 h-10 flex items-center justify-center text-[18px] font-light
                text-[#1A1A1A] hover:bg-[#F9FAFB] disabled:opacity-30 disabled:cursor-not-allowed
                transition-colors"
              aria-label="Menge verringern"
            >
              −
            </button>
            <span className="w-8 text-center text-[15px] font-bold text-[#1A1A1A] select-none">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity(q => Math.min(maxQty, q + 1))}
              disabled={quantity >= maxQty}
              className="w-10 h-10 flex items-center justify-center text-[18px] font-light
                text-[#1A1A1A] hover:bg-[#F9FAFB] disabled:opacity-30 disabled:cursor-not-allowed
                transition-colors"
              aria-label="Menge erhöhen"
            >
              +
            </button>
          </div>
        </div>
      )}

      {/* ── CTA Buttons ─────────────────────────────────────────────────────── */}
      <div className="space-y-2.5">
        {/* Primary: Add to Cart */}
        <motion.button
          onClick={handleAddToCart}
          disabled={ctaDisabled}
          whileTap={ctaDisabled ? {} : { scale: 0.98 }}
          className={`
            w-full h-[52px] rounded-xl flex items-center justify-center gap-2.5
            text-[15px] font-bold tracking-wide transition-all duration-150
            ${dto.isOutOfStock
              ? 'bg-[#F3F4F6] text-[#9CA3AF] cursor-not-allowed'
              : isAdding
              ? 'bg-[#D97706] text-white cursor-wait opacity-80'
              : 'bg-[#D97706] text-white hover:bg-[#B45309] active:bg-[#92400E] shadow-sm hover:shadow-md'
            }
          `}
          aria-label={ctaLabel}
        >
          {isAdding ? (
            <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : (
            <ShoppingCart className="w-4 h-4" />
          )}
          {isAdding ? 'Wird hinzugefügt…' : ctaLabel}
        </motion.button>

        {/* Secondary: Buy Now */}
        {!dto.isOutOfStock && (
          <motion.button
            onClick={handleBuyNow}
            disabled={isBuying}
            whileTap={{ scale: 0.98 }}
            className="w-full h-[52px] rounded-xl border-2 border-[#1A1A1A] flex items-center justify-center gap-2.5
              text-[15px] font-bold text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white
              transition-all duration-150 disabled:opacity-50 disabled:cursor-wait"
          >
            {isBuying ? (
              <div className="w-4 h-4 border-2 border-current/40 border-t-current rounded-full animate-spin" />
            ) : (
              <ShoppingBag className="w-4 h-4" />
            )}
            {isBuying ? 'Weiterleitung…' : 'Jetzt kaufen'}
          </motion.button>
        )}

        {/* Wishlist */}
        <button
          onClick={() => {
            setWishlisted(v => !v)
            toast(wishlisted ? 'Von Wunschliste entfernt' : 'Zur Wunschliste hinzugefügt', {
              icon: wishlisted ? '♡' : '♥',
            })
            // TODO: persist to wishlist API
          }}
          className="w-full h-10 rounded-xl border border-[#E5E7EB] flex items-center justify-center gap-2
            text-[13px] font-medium text-[#6B7280] hover:border-[#DC2626] hover:text-[#DC2626]
            transition-all duration-150"
        >
          <Heart
            className="w-4 h-4 transition-colors"
            style={{ fill: wishlisted ? '#DC2626' : 'none', color: wishlisted ? '#DC2626' : undefined }}
          />
          {wishlisted ? 'Auf der Wunschliste' : 'Zur Wunschliste'}
        </button>
      </div>

      {/* ── Trust signals ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2 pt-1">
        <TrustPill icon={<Shield className="w-3.5 h-3.5" />} label="Sichere Zahlung" />
        <TrustPill icon={<Truck className="w-3.5 h-3.5" />} label="Schneller Versand" />
        <TrustPill icon={<RotateCcw className="w-3.5 h-3.5" />} label="Rückgabe möglich" />
      </div>

      {/* ── Divider ─────────────────────────────────────────────────────────── */}
      <div className="h-px bg-[#F0F0F0]" />

      {/* ── Seller card ──────────────────────────────────────────────────────── */}
      <SellerCard seller={dto.seller} productId={dto.id} />

      {/* ── Mobile sticky bottom bar ──────────────────────────────────────────── */}
      {/* Only rendered on mobile (hidden on lg+); always visible at bottom */}
      <MobileStickyBar
        label={ctaLabel}
        price={dto.price}
        currency={dto.currency}
        disabled={ctaDisabled}
        isAdding={isAdding}
        isOutOfStock={dto.isOutOfStock}
        onAddToCart={handleAddToCart}
      />
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TrustPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-[#F9FAFB] border border-[#F0F0F0]">
      <div className="text-[#6B7280]">{icon}</div>
      <span className="text-[10px] text-[#6B7280] text-center leading-tight font-medium">
        {label}
      </span>
    </div>
  )
}

function SellerCard({ seller, productId }: { seller: ProductDetailDTO['seller']; productId: string }) {
  const href = seller.shopSlug ? `/shop/${seller.shopSlug}` : `/seller/${seller.id}`

  return (
    <div>
      <div className="flex items-center gap-3 p-3.5 rounded-xl border border-[#F0F0F0] bg-[#F9FAFB]">
        {/* Logo / fallback */}
        <div className="w-10 h-10 rounded-lg overflow-hidden bg-[#E5E7EB] flex-shrink-0 flex items-center justify-center">
          {seller.logoUrl ? (
            <Image
              src={seller.logoUrl}
              alt={seller.shopName}
              width={40}
              height={40}
              className="object-cover w-full h-full"
            />
          ) : (
            <Store className="w-5 h-5 text-[#9CA3AF]" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-semibold text-[#1A1A1A] truncate">
              {seller.shopName}
            </span>
            {seller.isVerified && (
              <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A] flex-shrink-0" aria-label="Verifizierter Shop" />
            )}
          </div>
          <span className="text-[11px] text-[#9CA3AF]">Verkäufer auf WEARO</span>
        </div>

        <a
          href={href}
          className="flex-shrink-0 px-3 py-1.5 rounded-lg border border-[#E5E7EB] bg-white
            text-[12px] font-semibold text-[#1A1A1A] hover:bg-[#F9FAFB]
            transition-colors whitespace-nowrap"
        >
          Zum Shop
        </a>
      </div>

      <a
        href={`/messages?sellerId=${seller.id}&productId=${productId}`}
        className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
          border border-[#E5E7EB] bg-white text-[13px] font-semibold text-[#6B7280]
          hover:border-[#1A1A1A] hover:text-[#1A1A1A] transition-colors"
      >
        <MessageCircle className="w-4 h-4" />
        Nachricht senden
      </a>
    </div>
  )
}

function MobileStickyBar({
  label,
  price,
  currency,
  disabled,
  isAdding,
  isOutOfStock,
  onAddToCart,
}: {
  label: string
  price: number
  currency: string
  disabled: boolean
  isAdding: boolean
  isOutOfStock: boolean
  onAddToCart: () => void
}) {
  const priceStr = new Intl.NumberFormat('de-DE', {
    style: 'currency', currency,
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(price)

  return (
    <div className="fixed bottom-[60px] left-0 right-0 z-40 lg:hidden px-4 pb-4 pt-3
      bg-white/95 backdrop-blur border-t border-[#F0F0F0] shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
    >
      <div className="flex items-center gap-3 max-w-lg mx-auto">
        <span className="text-[16px] font-extrabold text-[#1A1A1A] whitespace-nowrap">
          {priceStr}
        </span>
        <button
          onClick={onAddToCart}
          disabled={disabled}
          className={`
            flex-1 h-[48px] rounded-xl flex items-center justify-center gap-2
            text-[14px] font-bold transition-all
            ${isOutOfStock
              ? 'bg-[#F3F4F6] text-[#9CA3AF] cursor-not-allowed'
              : isAdding
              ? 'bg-[#D97706] text-white opacity-80'
              : 'bg-[#D97706] text-white hover:bg-[#B45309]'
            }
          `}
        >
          {isAdding ? (
            <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : (
            <ShoppingCart className="w-4 h-4" />
          )}
          {isAdding ? 'Wird hinzugefügt…' : label}
        </button>
      </div>
    </div>
  )
}
