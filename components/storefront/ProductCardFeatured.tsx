'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { Heart, ArrowRight } from 'lucide-react'
import type { ProductCardDTO } from './ProductCard'

function fmtPrice(amount: number, currency = 'EUR') {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(amount)
}

/**
 * ProductCardFeatured — large premium card for homepage hero modules.
 * Taller aspect ratio, larger typography, always-visible CTA button.
 */
interface ProductCardFeaturedProps {
  product: ProductCardDTO
  /** Stretch to fill container height — useful for unequal hero grids */
  fillHeight?: boolean
  animate?: boolean
  index?: number
}

export function ProductCardFeatured({
  product,
  fillHeight = false,
  animate = true,
  index = 0,
}: ProductCardFeaturedProps) {
  const prefersReduced = useReducedMotion()
  const [wishlisted, setWishlisted] = useState(false)
  const [imgIdx, setImgIdx] = useState(0)

  const img0 = product.images?.[0] ?? null
  const img1 = product.images?.[1] ?? null

  const discount =
    product.discountPercent ??
    (product.compareAtPrice != null && product.compareAtPrice > product.price
      ? Math.round((1 - product.price / product.compareAtPrice) * 100)
      : null)

  const outOfStock = product.isActive === false || product.inventory === 0
  const lowStock =
    !outOfStock && product.inventory != null && product.inventory > 0 && product.inventory <= 3

  const card = (
    <div
      className={`group relative flex flex-col bg-white border border-[#F0F0F0] overflow-hidden
        rounded-[14px] hover:shadow-[0_8px_40px_rgba(0,0,0,0.14)] transition-all duration-300
        ${fillHeight ? 'h-full' : ''}`}
      onMouseEnter={() => img1 && setImgIdx(1)}
      onMouseLeave={() => setImgIdx(0)}
    >
      {/* ── Image ─────────────────────────────────────────────── */}
      <div className={`relative bg-[#F8F8F8] overflow-hidden ${fillHeight ? 'flex-1' : 'aspect-[4/5]'}`}>
        {img0 ? (
          <>
            <Image
              src={img0}
              alt={product.title}
              fill
              sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw"
              className={`object-cover absolute inset-0 transition-all duration-500
                group-hover:scale-[1.03] ${imgIdx === 0 ? 'opacity-100' : 'opacity-0'}`}
            />
            {img1 && (
              <Image
                src={img1}
                alt={`${product.title} — Ansicht 2`}
                fill
                sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw"
                className={`object-cover absolute inset-0 transition-opacity duration-500
                  ${imgIdx === 1 ? 'opacity-100' : 'opacity-0'}`}
              />
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-[72px] h-[72px] rounded-full bg-[#E5E5E5]" />
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-[12px] left-[12px] flex flex-col gap-[5px] pointer-events-none">
          {outOfStock ? (
            <div
              className="px-[8px] py-[3px] rounded-[5px] text-[11px] font-bold leading-none"
              style={{ background: '#6B7280', color: '#FFF' }}
            >
              Ausverkauft
            </div>
          ) : (
            <>
              {discount != null && discount > 0 && (
                <div
                  className="px-[8px] py-[3px] rounded-[5px] text-[11px] font-bold leading-none"
                  style={{ background: '#DC2626', color: '#FFF' }}
                >
                  -{discount}%
                </div>
              )}
              {product.isNew && (
                <div
                  className="px-[8px] py-[3px] rounded-[5px] text-[11px] font-bold leading-none"
                  style={{ background: '#D97706', color: '#FFF' }}
                >
                  Neu
                </div>
              )}
              {product.isFeatured && (
                <div
                  className="px-[8px] py-[3px] rounded-[5px] text-[11px] font-bold leading-none"
                  style={{ background: '#1A1A1A', color: '#FFF' }}
                >
                  Empfohlen
                </div>
              )}
              {lowStock && (
                <div
                  className="px-[8px] py-[3px] rounded-[5px] text-[11px] font-bold leading-none"
                  style={{ background: '#D97706', color: '#FFF' }}
                >
                  Nur {product.inventory} übrig
                </div>
              )}
            </>
          )}
        </div>

        {/* Wishlist */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            setWishlisted((v) => !v)
          }}
          aria-label={wishlisted ? 'Von Wunschliste entfernen' : 'Zur Wunschliste'}
          className="absolute top-[12px] right-[12px] w-[34px] h-[34px] rounded-full
            flex items-center justify-center transition-all duration-150
            opacity-0 group-hover:opacity-100 focus:opacity-100"
          style={{ background: 'rgba(255,255,255,0.92)' }}
        >
          <Heart
            className="w-[16px] h-[16px] transition-colors duration-150"
            style={{ color: wishlisted ? '#DC2626' : '#888', fill: wishlisted ? '#DC2626' : 'none' }}
          />
        </button>
      </div>

      {/* ── Info ──────────────────────────────────────────────── */}
      <div className="p-[14px] flex flex-col gap-[4px]">
        {product.brand && (
          <span
            className="text-[9px] font-bold uppercase tracking-widest truncate"
            style={{ color: '#777777' }}
          >
            {product.brand}
          </span>
        )}
        <p className="text-[14px] font-semibold text-[#1A1A1A] line-clamp-2 leading-snug">
          {product.title}
        </p>
        {product.sellerName && (
          <span className="text-[10px] truncate" style={{ color: '#777777' }}>
            von {product.sellerName}
          </span>
        )}

        {product.rating != null && product.rating > 0 && (
          <div className="flex items-center gap-[4px] mt-[2px]">
            {Array.from({ length: 5 }).map((_, i) => (
              <svg
                key={i}
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill={i < Math.round(product.rating!) ? '#D97706' : '#CCCCCC'}
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            ))}
            {product.reviewCount != null && (
              <span className="text-[10px]" style={{ color: '#777777' }}>
                ({product.reviewCount})
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mt-[8px] gap-[8px]">
          {/* Prices */}
          <div className="flex flex-col gap-[1px]">
            <div className="flex items-baseline gap-[6px]">
              <span
                className={`text-[15px] font-bold ${outOfStock ? 'text-[#999999]' : 'text-[#1A1A1A]'}`}
              >
                {fmtPrice(product.price, product.currency)}
              </span>
              {product.compareAtPrice != null && product.compareAtPrice > product.price && (
                <span className="text-[12px] line-through" style={{ color: '#777777' }}>
                  {fmtPrice(product.compareAtPrice, product.currency)}
                </span>
              )}
            </div>
            {product.compareAtPrice != null &&
              product.compareAtPrice > product.price &&
              !outOfStock && (
                <span className="text-[10px] font-semibold" style={{ color: '#DC2626' }}>
                  Spare{' '}
                  {fmtPrice(product.compareAtPrice - product.price, product.currency)}
                </span>
              )}
          </div>

          {/* CTA */}
          {!outOfStock && (
            <div
              className="flex items-center gap-[5px] px-[12px] py-[7px] rounded-[8px]
                text-[11px] font-bold flex-shrink-0 transition-all duration-150
                group-hover:gap-[7px]"
              style={{ background: '#D97706', color: '#FFF' }}
            >
              Ansehen
              <ArrowRight className="w-[12px] h-[12px] transition-transform duration-150 group-hover:translate-x-[2px]" />
            </div>
          )}
        </div>
      </div>
    </div>
  )

  const linked = (
    <Link
      href={`/products/${product.id}`}
      prefetch={false}
      className={fillHeight ? 'flex h-full' : 'block'}
    >
      {card}
    </Link>
  )

  if (!animate || prefersReduced) return linked

  return (
    <motion.div
      className={fillHeight ? 'h-full' : ''}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.32, delay: Math.min(index * 0.06, 0.3), ease: 'easeOut' }}
    >
      {linked}
    </motion.div>
  )
}
