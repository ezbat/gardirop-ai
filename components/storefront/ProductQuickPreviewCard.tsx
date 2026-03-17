'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import type { ProductCardDTO } from './ProductCard'

function fmtPrice(amount: number, currency = 'EUR') {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(amount)
}

/**
 * ProductQuickPreviewCard — mini preview shown in search dropdown right column
 * or hover preview panel. Crossfades when `product` changes.
 */
interface ProductQuickPreviewCardProps {
  product: ProductCardDTO
  onClose?: () => void
}

export function ProductQuickPreviewCard({
  product,
  onClose,
}: ProductQuickPreviewCardProps) {
  const prefersReduced = useReducedMotion()

  const img = product.images?.[0] ?? null

  const discount =
    product.discountPercent ??
    (product.compareAtPrice != null && product.compareAtPrice > product.price
      ? Math.round((1 - product.price / product.compareAtPrice) * 100)
      : null)

  const outOfStock = product.isActive === false || product.inventory === 0

  const savings =
    product.compareAtPrice != null && product.compareAtPrice > product.price
      ? product.compareAtPrice - product.price
      : null

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={product.id}
        initial={prefersReduced ? {} : { opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -10 }}
        transition={{ duration: 0.12 }}
      >
        <Link
          href={`/products/${product.id}`}
          onClick={onClose}
          className="block group"
        >
          <div
            className="rounded-[10px] overflow-hidden border border-[#F0F0F0] bg-white
              hover:shadow-[0_4px_20px_rgba(0,0,0,0.10)] transition-shadow duration-200"
          >
            {/* Image */}
            <div className="relative aspect-[3/4] bg-[#F8F8F8] overflow-hidden">
              {img ? (
                <Image
                  src={img}
                  alt={product.title}
                  fill
                  sizes="200px"
                  className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-[40px] h-[40px] rounded-full bg-[#E5E5E5]" />
                </div>
              )}

              {/* Badges */}
              <div className="absolute top-[8px] left-[8px] flex flex-col gap-[3px] pointer-events-none">
                {discount != null && discount > 0 && !outOfStock && (
                  <div
                    className="px-[6px] py-[2px] rounded-[4px] text-[9px] font-bold leading-none"
                    style={{ background: '#DC2626', color: '#FFF' }}
                  >
                    -{discount}%
                  </div>
                )}
                {product.isNew && !outOfStock && (
                  <div
                    className="px-[6px] py-[2px] rounded-[4px] text-[9px] font-bold leading-none"
                    style={{ background: '#D97706', color: '#FFF' }}
                  >
                    Neu
                  </div>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="p-[10px] flex flex-col gap-[3px]">
              {product.brand && (
                <p
                  className="text-[8px] font-bold uppercase tracking-widest truncate"
                  style={{ color: '#CCCCCC' }}
                >
                  {product.brand}
                </p>
              )}

              <p className="text-[11px] font-medium text-[#1A1A1A] line-clamp-2 leading-snug">
                {product.title}
              </p>

              {product.rating != null && product.rating > 0 && (
                <div className="flex items-center gap-[2px] mt-[1px]">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg
                      key={i}
                      width="8"
                      height="8"
                      viewBox="0 0 24 24"
                      fill={i < Math.round(product.rating!) ? '#D97706' : '#E5E5E5'}
                    >
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  ))}
                </div>
              )}

              <div className="flex items-baseline gap-[4px] mt-[2px]">
                <span
                  className={`text-[13px] font-bold ${outOfStock ? 'text-[#CCCCCC]' : 'text-[#1A1A1A]'}`}
                >
                  {fmtPrice(product.price, product.currency)}
                </span>
                {product.compareAtPrice != null && product.compareAtPrice > product.price && (
                  <span className="text-[10px] line-through" style={{ color: '#CCCCCC' }}>
                    {fmtPrice(product.compareAtPrice, product.currency)}
                  </span>
                )}
              </div>

              {savings != null && savings > 1 && !outOfStock && (
                <p className="text-[9px] font-semibold" style={{ color: '#DC2626' }}>
                  Spare {fmtPrice(savings, product.currency)}
                </p>
              )}

              {/* CTA */}
              <div
                className="flex items-center justify-center gap-[4px] mt-[7px] py-[7px] rounded-[7px]
                  text-[11px] font-bold transition-opacity duration-150 group-hover:opacity-90"
                style={{
                  background: outOfStock ? '#E5E5E5' : '#D97706',
                  color: outOfStock ? '#999999' : '#FFFFFF',
                }}
              >
                {outOfStock ? (
                  'Ausverkauft'
                ) : (
                  <>
                    Zum Produkt
                    <ArrowRight className="w-[11px] h-[11px]" />
                  </>
                )}
              </div>
            </div>
          </div>
        </Link>
      </motion.div>
    </AnimatePresence>
  )
}
