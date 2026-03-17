'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import type { ProductCardDTO } from './ProductCard'

function fmtPrice(amount: number, currency = 'EUR') {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(amount)
}

/**
 * ProductCardHorizontal — horizontal row card for recommendation strips.
 * Image on the left, info on the right.
 */
interface ProductCardHorizontalProps {
  product: ProductCardDTO
  animate?: boolean
  index?: number
  onClick?: () => void
}

export function ProductCardHorizontal({
  product,
  animate = true,
  index = 0,
  onClick,
}: ProductCardHorizontalProps) {
  const prefersReduced = useReducedMotion()

  const img = product.images?.[0] ?? null

  const discount =
    product.discountPercent ??
    (product.compareAtPrice != null && product.compareAtPrice > product.price
      ? Math.round((1 - product.price / product.compareAtPrice) * 100)
      : null)

  const outOfStock = product.isActive === false || product.inventory === 0
  const lowStock =
    !outOfStock && product.inventory != null && product.inventory > 0 && product.inventory <= 5

  const card = (
    <Link
      href={`/products/${product.id}`}
      prefetch={false}
      onClick={onClick}
      className="group flex items-stretch gap-[12px] p-[10px] rounded-[10px] bg-white
        border border-[#F0F0F0] hover:shadow-[0_2px_16px_rgba(0,0,0,0.10)]
        transition-all duration-200"
    >
      {/* Thumbnail */}
      <div className="relative w-[72px] h-[92px] flex-shrink-0 rounded-[7px] overflow-hidden bg-[#F8F8F8]">
        {img ? (
          <Image
            src={img}
            alt={product.title}
            fill
            sizes="72px"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-[24px] h-[24px] rounded-full bg-[#E0E0E0]" />
          </div>
        )}
        {discount != null && discount > 0 && !outOfStock && (
          <div
            className="absolute top-[4px] left-[4px] px-[4px] py-[1px] rounded-[3px]
              text-[8px] font-bold leading-none"
            style={{ background: '#DC2626', color: '#FFF' }}
          >
            -{discount}%
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-[2px]">
        <div>
          {product.brand && (
            <p
              className="text-[9px] font-bold uppercase tracking-wider truncate mb-[1px]"
              style={{ color: '#CCCCCC' }}
            >
              {product.brand}
            </p>
          )}
          <p className="text-[12px] font-medium text-[#1A1A1A] line-clamp-2 leading-snug">
            {product.title}
          </p>
          {product.sellerName && (
            <p className="text-[9px] mt-[1px] truncate" style={{ color: '#AAAAAA' }}>
              von {product.sellerName}
            </p>
          )}
        </div>

        <div>
          {product.rating != null && product.rating > 0 && (
            <div className="flex items-center gap-[3px] mb-[4px]">
              {Array.from({ length: 5 }).map((_, i) => (
                <svg
                  key={i}
                  width="9"
                  height="9"
                  viewBox="0 0 24 24"
                  fill={i < Math.round(product.rating!) ? '#D97706' : '#E5E5E5'}
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              ))}
              {product.reviewCount != null && (
                <span className="text-[8px]" style={{ color: '#CCCCCC' }}>
                  ({product.reviewCount})
                </span>
              )}
            </div>
          )}

          <div className="flex items-baseline gap-[4px]">
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

          {lowStock && (
            <p className="text-[9px] font-semibold mt-[2px]" style={{ color: '#D97706' }}>
              Nur {product.inventory} verfügbar
            </p>
          )}
          {outOfStock && (
            <p className="text-[9px] mt-[2px]" style={{ color: '#9CA3AF' }}>
              Ausverkauft
            </p>
          )}
        </div>
      </div>
    </Link>
  )

  if (!animate || prefersReduced) return card

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ duration: 0.24, delay: Math.min(index * 0.05, 0.25), ease: 'easeOut' }}
    >
      {card}
    </motion.div>
  )
}
