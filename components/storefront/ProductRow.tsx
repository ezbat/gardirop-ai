'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { ChevronRight, ChevronLeft } from 'lucide-react'
import { ProductCard, type ProductCardDTO } from './ProductCard'
import { ProductCardHorizontal } from './ProductCardHorizontal'
import { SkeletonCard } from './SkeletonCard'
import { ProductCardHorizontalSkeleton } from './ProductCardSkeleton'

interface ProductRowProps {
  /** Section title */
  title: string
  /** Subtitle / label (e.g., "Echte Deals" or "Popular picks") */
  subtitle?: string
  /** "See all" href */
  seeAllHref?: string
  products: ProductCardDTO[]
  loading?: boolean
  /** If true, renders a scrollable horizontal strip instead of a grid */
  horizontal?: boolean
  /**
   * Card variant for the horizontal strip.
   * - 'default'     → standard vertical ProductCard (default)
   * - 'horizontal'  → ProductCardHorizontal (image-left row card, good for recommendation lists)
   */
  horizontalVariant?: 'default' | 'horizontal'
}

export function ProductRow({
  title,
  subtitle,
  seeAllHref,
  products,
  loading = false,
  horizontal = false,
  horizontalVariant = 'default',
}: ProductRowProps) {
  const prefersReduced = useReducedMotion()
  const scrollRef = useRef<HTMLDivElement>(null)

  const scrollBy = (dir: number) => {
    scrollRef.current?.scrollBy({ left: dir * 220, behavior: 'smooth' })
  }

  return (
    <motion.section
      initial={prefersReduced ? {} : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="py-[28px]"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* Section header */}
        <div className="flex items-end justify-between mb-[18px]">
          <div>
            <h2 className="text-[18px] font-bold leading-none" style={{ color: '#1A1A1A' }}>
              {title}
            </h2>
            {subtitle && (
              <p className="text-[11px] mt-[4px]" style={{ color: '#999' }}>
                {subtitle}
              </p>
            )}
          </div>
          <div className="flex items-center gap-[8px]">
            {horizontal && (
              <>
                <button
                  onClick={() => scrollBy(-1)}
                  className="w-[28px] h-[28px] rounded-full flex items-center justify-center
                    transition-colors duration-150"
                  style={{ background: '#F0F0F0', color: '#555' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#E5E5E5')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#F0F0F0')}
                  aria-label="Zurück scrollen"
                >
                  <ChevronLeft className="w-[14px] h-[14px]" />
                </button>
                <button
                  onClick={() => scrollBy(1)}
                  className="w-[28px] h-[28px] rounded-full flex items-center justify-center
                    transition-colors duration-150"
                  style={{ background: '#F0F0F0', color: '#555' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#E5E5E5')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#F0F0F0')}
                  aria-label="Weiter scrollen"
                >
                  <ChevronRight className="w-[14px] h-[14px]" />
                </button>
              </>
            )}
            {seeAllHref && (
              <Link
                href={seeAllHref}
                className="flex items-center gap-[4px] text-[12px] font-semibold
                  transition-opacity hover:opacity-70"
                style={{ color: '#D97706' }}
              >
                Alle anzeigen <ChevronRight className="w-[13px] h-[13px]" />
              </Link>
            )}
          </div>
        </div>

        {/* Products */}
        {loading ? (
          <div
            className={
              horizontal
                ? 'flex gap-[12px] overflow-hidden'
                : 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-[12px]'
            }
          >
            {Array.from({ length: horizontal ? 6 : 4 }).map((_, i) =>
              horizontal && horizontalVariant === 'horizontal' ? (
                <div key={i} className="w-[280px] flex-shrink-0">
                  <ProductCardHorizontalSkeleton />
                </div>
              ) : (
                <div key={i} className={horizontal ? 'w-[160px] flex-shrink-0' : ''}>
                  <SkeletonCard />
                </div>
              )
            )}
          </div>
        ) : horizontal ? (
          /* Horizontal scrollable strip */
          <div
            ref={scrollRef}
            className="flex gap-[12px] overflow-x-auto pb-[4px]"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {products.map((product, i) =>
              horizontalVariant === 'horizontal' ? (
                <div key={product.id} className="w-[280px] flex-shrink-0">
                  <ProductCardHorizontal product={product} animate={!prefersReduced} index={i} />
                </div>
              ) : (
                <div key={product.id} className="w-[160px] flex-shrink-0">
                  <ProductCard product={product} animate={!prefersReduced} index={i} />
                </div>
              )
            )}
            {/* "See all" tile at the end */}
            {seeAllHref && (
              <Link
                href={seeAllHref}
                className="w-[120px] flex-shrink-0 flex flex-col items-center justify-center
                  rounded-[10px] border border-dashed transition-colors duration-150"
                style={{ borderColor: '#D97706', color: '#D97706', minHeight: '200px' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#FFFBEB')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <ChevronRight className="w-[20px] h-[20px] mb-[6px]" />
                <span className="text-[11px] font-semibold text-center px-2">Alle anzeigen</span>
              </Link>
            )}
          </div>
        ) : (
          /* Standard grid */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-[12px]">
            {products.map((product, i) => (
              <ProductCard
                key={product.id}
                product={product}
                animate={!prefersReduced}
                index={i}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !products.length && (
          <div className="py-[40px] text-center">
            <p className="text-[13px]" style={{ color: '#CCC' }}>
              Noch keine Produkte in dieser Kategorie
            </p>
          </div>
        )}
      </div>
    </motion.section>
  )
}
