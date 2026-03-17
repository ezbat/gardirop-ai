'use client'

import Image from 'next/image'
import Link from 'next/link'
import type { ProductCardDTO } from './ProductCard'

/**
 * ProductCardCompact — dense card for search dropdowns and small carousels.
 * Horizontal layout: thumbnail + info side by side.
 */
interface ProductCardCompactProps {
  product: ProductCardDTO
  onClick?: () => void
}

export function ProductCardCompact({ product, onClick }: ProductCardCompactProps) {
  const img = product.images?.[0] ?? null

  const discount =
    product.discountPercent ??
    (product.compareAtPrice != null && product.compareAtPrice > product.price
      ? Math.round((1 - product.price / product.compareAtPrice) * 100)
      : null)

  const outOfStock = product.isActive === false || product.inventory === 0

  const currencySymbol =
    !product.currency || product.currency === 'EUR' ? '€' : product.currency

  return (
    <Link
      href={`/products/${product.id}`}
      prefetch={false}
      onClick={onClick}
      className="flex items-center gap-[10px] px-[10px] py-[8px] rounded-[8px]
        hover:bg-[#F8F8F8] transition-colors duration-100 group"
    >
      {/* Thumbnail */}
      <div className="relative w-[44px] h-[56px] flex-shrink-0 rounded-[6px] overflow-hidden bg-[#F0F0F0]">
        {img ? (
          <Image src={img} alt={product.title} fill sizes="44px" className="object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-[18px] h-[18px] rounded-full bg-[#E0E0E0]" />
          </div>
        )}
        {discount != null && discount > 0 && !outOfStock && (
          <div
            className="absolute top-[2px] left-[2px] px-[3px] py-[1px] rounded-[3px]
              text-[7px] font-bold leading-none"
            style={{ background: '#DC2626', color: '#FFF' }}
          >
            -{discount}%
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        {product.brand && (
          <p
            className="text-[9px] font-semibold uppercase tracking-wider truncate"
            style={{ color: '#CCCCCC' }}
          >
            {product.brand}
          </p>
        )}
        <p className="text-[11px] font-medium text-[#1A1A1A] line-clamp-2 leading-snug">
          {product.title}
        </p>
        <div className="flex items-baseline gap-[4px] mt-[2px]">
          <span
            className={`text-[11px] font-bold ${outOfStock ? 'text-[#CCCCCC]' : 'text-[#1A1A1A]'}`}
          >
            {currencySymbol}
            {product.price.toFixed(2)}
          </span>
          {product.compareAtPrice != null && product.compareAtPrice > product.price && (
            <span className="text-[9px] line-through" style={{ color: '#CCCCCC' }}>
              {currencySymbol}
              {product.compareAtPrice.toFixed(2)}
            </span>
          )}
        </div>
        {outOfStock && (
          <p className="text-[9px] mt-[1px]" style={{ color: '#9CA3AF' }}>
            Ausverkauft
          </p>
        )}
      </div>
    </Link>
  )
}
