'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { Heart, ShoppingBag } from 'lucide-react'

// ─── DTO ─────────────────────────────────────────────────────────────────────

export interface ProductCardDTO {
  id: string
  title: string
  price: number
  currency?: string
  images?: string[]
  compareAtPrice?: number | null
  discountPercent?: number | null
  inventory?: number | null
  isActive?: boolean
  categorySlug?: string | null
  categoryName?: string | null
  /** Optional legacy alias for categoryName */
  category?: string | null
  brand?: string | null
  sellerName?: string | null
  rating?: number | null
  reviewCount?: number | null
  variantCount?: number | null
  colorCount?: number | null
  isNew?: boolean
  isFeatured?: boolean
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtPrice(amount: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

function StarRow({ rating, count }: { rating: number; count?: number | null }) {
  return (
    <div className="flex items-center gap-[3px]">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          width="9"
          height="9"
          viewBox="0 0 24 24"
          fill={i < Math.round(rating) ? '#D97706' : '#CCCCCC'}
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
      {count != null && (
        <span className="text-[9px] leading-none" style={{ color: '#777' }}>
          ({count})
        </span>
      )}
    </div>
  )
}

// ─── ProductCard ─────────────────────────────────────────────────────────────

interface ProductCardProps {
  product: ProductCardDTO
  animate?: boolean
  index?: number
  className?: string
  /** @deprecated use default card instead */
  compact?: boolean
}

export function ProductCard({
  product,
  animate = true,
  index = 0,
  className = '',
}: ProductCardProps) {
  const prefersReduced = useReducedMotion()
  const [wishlisted, setWishlisted] = useState(false)
  const [imgIdx, setImgIdx] = useState(0)

  const img0 = product.images?.[0] ?? null
  const img1 = product.images?.[1] ?? null

  const discount =
    product.discountPercent ??
    (product.compareAtPrice && product.compareAtPrice > product.price
      ? Math.round((1 - product.price / product.compareAtPrice) * 100)
      : null)

  const outOfStock = product.isActive === false || product.inventory === 0
  const lowStock =
    !outOfStock && product.inventory != null && product.inventory > 0 && product.inventory <= 5
  const savings =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? product.compareAtPrice - product.price
      : null

  const cardContent = (
    <div
      className={`group relative flex flex-col bg-white border border-[#F0F0F0] overflow-hidden
        rounded-[10px] hover:shadow-[0_4px_28px_rgba(0,0,0,0.12)] transition-all duration-200 ${className}`}
      onMouseEnter={() => img1 && setImgIdx(1)}
      onMouseLeave={() => setImgIdx(0)}
    >
      {/* ── Image zone ───────────────────────────────────────── */}
      <div className="relative aspect-[3/4] bg-[#F8F8F8] overflow-hidden">
        {img0 ? (
          <>
            <Image
              src={img0}
              alt={product.title}
              fill
              sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 25vw"
              className={`object-cover absolute inset-0 transition-all duration-300
                group-hover:scale-[1.03] ${imgIdx === 0 ? 'opacity-100' : 'opacity-0'}`}
            />
            {img1 && (
              <Image
                src={img1}
                alt={`${product.title} — Ansicht 2`}
                fill
                sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 25vw"
                className={`object-cover absolute inset-0 transition-opacity duration-300
                  ${imgIdx === 1 ? 'opacity-100' : 'opacity-0'}`}
              />
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-[48px] h-[48px] rounded-full bg-[#E5E5E5]" />
          </div>
        )}

        {/* Top-left badges */}
        <div className="absolute top-[8px] left-[8px] flex flex-col gap-[4px] pointer-events-none">
          {outOfStock ? (
            <div
              className="px-[6px] py-[2px] rounded-[4px] text-[9px] font-bold leading-none uppercase"
              style={{ background: '#6B7280', color: '#FFF' }}
            >
              Ausverkauft
            </div>
          ) : (
            <>
              {discount != null && discount > 0 && (
                <div
                  className="px-[6px] py-[2px] rounded-[4px] text-[9px] font-bold leading-none"
                  style={{ background: '#DC2626', color: '#FFF' }}
                >
                  -{discount}%
                </div>
              )}
              {product.isNew && (
                <div
                  className="px-[6px] py-[2px] rounded-[4px] text-[9px] font-bold leading-none"
                  style={{ background: '#D97706', color: '#FFF' }}
                >
                  Neu
                </div>
              )}
              {product.isFeatured && (
                <div
                  className="px-[6px] py-[2px] rounded-[4px] text-[9px] font-bold leading-none"
                  style={{ background: '#1A1A1A', color: '#FFF' }}
                >
                  Top
                </div>
              )}
              {lowStock && (
                <div
                  className="px-[6px] py-[2px] rounded-[4px] text-[9px] font-bold leading-none"
                  style={{ background: '#D97706', color: '#FFF' }}
                >
                  Nur {product.inventory} übrig
                </div>
              )}
            </>
          )}
        </div>

        {/* Wishlist toggle — visible on hover/focus */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            setWishlisted((v) => !v)
          }}
          aria-label={wishlisted ? 'Von Wunschliste entfernen' : 'Zur Wunschliste'}
          className="absolute top-[8px] right-[8px] w-[28px] h-[28px] rounded-full
            flex items-center justify-center transition-all duration-150
            opacity-0 group-hover:opacity-100 focus:opacity-100"
          style={{ background: 'rgba(255,255,255,0.92)' }}
        >
          <Heart
            className="w-[14px] h-[14px] transition-colors duration-150"
            style={{ color: wishlisted ? '#DC2626' : '#999', fill: wishlisted ? '#DC2626' : 'none' }}
          />
        </button>

        {/* Bottom CTA overlay — desktop hover */}
        {!outOfStock && (
          <div
            className="absolute inset-x-0 bottom-0 flex items-center justify-center pb-[10px] pt-[24px]
              opacity-0 group-hover:opacity-100 transition-opacity duration-150
              pointer-events-none group-hover:pointer-events-auto"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.28) 0%, transparent 100%)' }}
          >
            <div
              className="flex items-center gap-[5px] px-[14px] py-[7px] rounded-[6px] text-[11px] font-bold"
              style={{ background: '#D97706', color: '#FFF' }}
            >
              <ShoppingBag className="w-[12px] h-[12px]" />
              Ansehen
            </div>
          </div>
        )}
      </div>

      {/* ── Info zone ────────────────────────────────────────── */}
      <div className="flex flex-col gap-[2px] p-[10px]">
        {/* Brand */}
        {product.brand && (
          <span
            className="text-[9px] font-semibold uppercase tracking-wider truncate"
            style={{ color: '#777777' }}
          >
            {product.brand}
          </span>
        )}

        {/* Title */}
        <p className="text-[12px] font-medium text-[#1A1A1A] line-clamp-2 leading-snug">
          {product.title}
        </p>

        {/* Seller */}
        {product.sellerName && (
          <span className="text-[9px] truncate" style={{ color: '#777777' }}>
            von {product.sellerName}
          </span>
        )}

        {/* Color/variant count */}
        {product.colorCount != null && product.colorCount > 1 && (
          <span className="text-[9px]" style={{ color: '#777777' }}>
            {product.colorCount} Farben
          </span>
        )}

        {/* Rating — only shown with real data */}
        {product.rating != null && product.rating > 0 && (
          <div className="mt-[2px]">
            <StarRow rating={product.rating} count={product.reviewCount} />
          </div>
        )}

        {/* Price */}
        <div className="flex items-baseline gap-[5px] mt-[3px]">
          <span className={`text-[13px] font-bold ${outOfStock ? 'text-[#999999]' : 'text-[#1A1A1A]'}`}>
            {fmtPrice(product.price, product.currency)}
          </span>
          {product.compareAtPrice != null && product.compareAtPrice > product.price && (
            <span className="text-[11px] line-through" style={{ color: '#999999' }}>
              {fmtPrice(product.compareAtPrice, product.currency)}
            </span>
          )}
        </div>

        {/* Savings nudge */}
        {savings != null && savings > 2 && !outOfStock && (
          <span className="text-[9px] font-semibold" style={{ color: '#DC2626' }}>
            Du sparst {fmtPrice(savings, product.currency)}
          </span>
        )}
      </div>
    </div>
  )

  const linked = (
    <Link href={`/products/${product.id}`} prefetch={false}>
      {cardContent}
    </Link>
  )

  if (!animate || prefersReduced) return linked

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.28, delay: Math.min(index * 0.04, 0.32), ease: 'easeOut' }}
    >
      {linked}
    </motion.div>
  )
}
