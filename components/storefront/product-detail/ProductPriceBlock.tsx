'use client'

/**
 * ProductPriceBlock
 *
 * Renders the price, compare-at price, discount %, and savings nudge.
 * Pure display — no state, no side-effects.
 */

import type { ProductDetailDTO } from './types'

interface ProductPriceBlockProps {
  price:          number
  currency:       string
  compareAtPrice: number | null
  discountPercent: number | null
  savings:        number | null
  isOutOfStock:   boolean
  className?:     string
}

function fmt(amount: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('de-DE', {
    style:    'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function ProductPriceBlock({
  price,
  currency,
  compareAtPrice,
  discountPercent,
  savings,
  isOutOfStock,
  className = '',
}: ProductPriceBlockProps) {
  const hasDiscount = compareAtPrice && compareAtPrice > price && discountPercent

  return (
    <div className={`space-y-1 ${className}`}>
      {/* Main price row */}
      <div className="flex items-baseline gap-3 flex-wrap">
        {/* Current price */}
        <span
          className={`text-[28px] sm:text-[32px] font-extrabold leading-none tracking-tight ${
            isOutOfStock ? 'text-[#9CA3AF]' : 'text-[#1A1A1A]'
          }`}
        >
          {fmt(price, currency)}
        </span>

        {/* Compare-at price */}
        {hasDiscount && (
          <span className="text-[18px] text-[#9CA3AF] line-through leading-none">
            {fmt(compareAtPrice!, currency)}
          </span>
        )}

        {/* Discount pill */}
        {hasDiscount && !isOutOfStock && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-bold bg-[#DC2626] text-white leading-none">
            -{discountPercent}%
          </span>
        )}
      </div>

      {/* Savings nudge */}
      {savings && savings > 1 && !isOutOfStock && (
        <p className="text-[13px] font-semibold text-[#DC2626]">
          Du sparst {fmt(savings, currency)}
        </p>
      )}
    </div>
  )
}
