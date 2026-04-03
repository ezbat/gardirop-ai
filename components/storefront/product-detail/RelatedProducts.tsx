'use client'

/**
 * RelatedProducts
 *
 * Renders a "Ähnliche Produkte" section using the existing ProductCard component.
 *
 * Layout:
 *  • Mobile  → horizontal scroll rail with scroll-snap (shows ~2.2 cards)
 *  • Tablet  → 3-column grid
 *  • Desktop → 4-column grid
 *
 * Maps RelatedProductDTO → ProductCardDTO so the existing ProductCard receives
 * exactly the shape it expects.
 */

import { useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ProductCard, type ProductCardDTO } from '@/components/storefront/ProductCard'
import type { RelatedProductDTO } from './types'

// ─── Props ────────────────────────────────────────────────────────────────────

interface RelatedProductsProps {
  products: RelatedProductDTO[]
}

// ─── DTO mapper ───────────────────────────────────────────────────────────────

function toCardDTO(p: RelatedProductDTO): ProductCardDTO {
  return {
    id:             p.id,
    title:          p.title,
    price:          p.price,
    currency:       p.currency,
    images:         p.images,
    compareAtPrice: p.compareAtPrice ?? undefined,
    discountPercent: p.discountPercent ?? undefined,
    inventory:      p.inventory,
    brand:          p.brand ?? undefined,
    sellerName:     p.sellerName ?? undefined,
    isNew:          p.isNew,
    isFeatured:     p.isFeatured,
    // No rating data available in related products query
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RelatedProducts({ products }: RelatedProductsProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  if (products.length === 0) return null

  const cards = products.map(toCardDTO)

  // Manual scroll helpers for the scroll rail (mobile)
  function scrollBy(direction: 'left' | 'right') {
    const el = scrollRef.current
    if (!el) return
    const cardWidth = el.scrollWidth / products.length
    el.scrollBy({ left: direction === 'right' ? cardWidth * 2 : -cardWidth * 2, behavior: 'smooth' })
  }

  return (
    <section aria-label="Ähnliche Produkte">
      {/* Header row */}
      <div className="flex items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="h-5 w-1 rounded-full bg-[#D97706]" aria-hidden="true" />
          <h2 className="text-[18px] font-bold text-[#1A1A1A] tracking-tight">
            Ähnliche Produkte
          </h2>
        </div>

        {/* Scroll arrows — only visible on small screens (rail layout) */}
        <div className="flex items-center gap-1 sm:hidden" aria-hidden="true">
          <button
            type="button"
            onClick={() => scrollBy('left')}
            className="w-8 h-8 rounded-full border border-[#E5E7EB] flex items-center justify-center
              hover:bg-[#F9FAFB] transition-colors"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-4 h-4 text-[#6B7280]" />
          </button>
          <button
            type="button"
            onClick={() => scrollBy('right')}
            className="w-8 h-8 rounded-full border border-[#E5E7EB] flex items-center justify-center
              hover:bg-[#F9FAFB] transition-colors"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-4 h-4 text-[#6B7280]" />
          </button>
        </div>
      </div>

      {/* ── Mobile: horizontal scroll rail ──────────────────────────────────── */}
      <div
        ref={scrollRef}
        className="flex sm:hidden gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory
          pb-3 -mx-4 px-4"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {cards.map((card, i) => (
          <div
            key={card.id}
            className="snap-start flex-shrink-0"
            style={{ width: 'calc(45vw + 10px)', maxWidth: '200px' }}
          >
            <ProductCard product={card} index={i} animate />
          </div>
        ))}
      </div>

      {/* ── Tablet+: responsive grid ─────────────────────────────────────────── */}
      <div className="hidden sm:grid grid-cols-3 md:grid-cols-4 gap-4 lg:gap-5">
        {cards.map((card, i) => (
          <ProductCard key={card.id} product={card} index={i} animate />
        ))}
      </div>
    </section>
  )
}
