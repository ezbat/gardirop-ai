'use client'

/**
 * FeaturedSellers — Social-commerce identity block.
 *
 * Horizontal scroll of seller cards with avatar, shop name, follower count,
 * and a "Folgen" button. This section makes the homepage feel like a
 * social platform, not a product shelf.
 */

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, useReducedMotion } from 'framer-motion'
import { BadgeCheck, Users, ChevronRight, ChevronLeft, Package } from 'lucide-react'

interface FeaturedSeller {
  id: string
  shop_name: string
  logo_url: string | null
  is_verified: boolean
  follower_count: number
  post_count: number
  product_count: number
}

// Accent ring colors per seller card
const RING_COLORS = [
  '#D97706', '#EC4899', '#6366F1', '#10B981',
  '#F59E0B', '#8B5CF6', '#EF4444', '#3B82F6',
]

export function FeaturedSellers() {
  const prefersReduced = useReducedMotion()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [sellers, setSellers] = useState<FeaturedSeller[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/storefront/featured-sellers')
      .then(r => r.json())
      .then(d => { if (d.success) setSellers(d.sellers || []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const scroll = (dir: number) => {
    scrollRef.current?.scrollBy({ left: dir * 260, behavior: 'smooth' })
  }

  if (!loading && sellers.length === 0) return null

  return (
    <section className="py-10 relative" style={{ background: '#0B0D14' }}>
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* Header */}
        <div className="flex items-end justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 rounded-md flex items-center justify-center"
                style={{ background: 'rgba(217,119,6,0.15)' }}>
                <Users className="w-3 h-3" style={{ color: '#D97706' }} />
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.15em]"
                style={{ color: 'rgba(255,255,255,0.55)' }}>
                Seller im Spotlight
              </span>
            </div>
            <h2 className="text-lg font-bold" style={{ color: '#FFFFFF' }}>
              Entdecke unsere Seller
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => scroll(-1)}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors
                hover:bg-white/10"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <ChevronLeft className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.65)' }} />
            </button>
            <button
              onClick={() => scroll(1)}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors
                hover:bg-white/10"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <ChevronRight className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.65)' }} />
            </button>
          </div>
        </div>

        {/* Scroll container */}
        {loading ? (
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 w-[220px] h-[200px] rounded-2xl animate-pulse"
                style={{ background: 'rgba(255,255,255,0.04)' }} />
            ))}
          </div>
        ) : (
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory
              scrollbar-hide"
            style={{ scrollbarWidth: 'none' }}
          >
            {sellers.map((seller, i) => {
              const ring = RING_COLORS[i % RING_COLORS.length]
              return (
                <motion.div
                  key={seller.id}
                  initial={prefersReduced ? {} : { opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className="flex-shrink-0 snap-start"
                >
                  <Link
                    href={`/seller/${seller.id}`}
                    className="group flex flex-col items-center w-[200px] py-6 px-4 rounded-2xl
                      transition-all duration-200 hover:scale-[1.03]
                      hover:shadow-[0_0_30px_rgba(217,119,6,0.08)]"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    {/* Avatar with ring */}
                    <div
                      className="relative w-16 h-16 rounded-full mb-3
                        transition-transform duration-300 group-hover:scale-110"
                      style={{
                        background: `conic-gradient(${ring}, ${ring}66, ${ring})`,
                        padding: '2.5px',
                      }}
                    >
                      <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center"
                        style={{ background: '#0E1320' }}>
                        {seller.logo_url ? (
                          <Image
                            src={seller.logo_url}
                            alt={seller.shop_name}
                            width={60}
                            height={60}
                            className="w-full h-full object-cover rounded-full"
                          />
                        ) : (
                          <span className="text-lg font-bold" style={{ color: ring }}>
                            {seller.shop_name?.charAt(0)?.toUpperCase() || 'S'}
                          </span>
                        )}
                      </div>
                      {seller.is_verified && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center"
                          style={{ background: '#0E1320' }}>
                          <BadgeCheck className="w-4 h-4" style={{ color: '#3B82F6' }} />
                        </div>
                      )}
                    </div>

                    {/* Name */}
                    <span className="text-sm font-semibold text-center mb-2 line-clamp-1"
                      style={{ color: 'rgba(255,255,255,0.85)' }}>
                      {seller.shop_name || 'Shop'}
                    </span>

                    {/* Stats */}
                    <div className="flex items-center gap-3 text-[10px]" style={{ color: 'rgba(255,255,255,0.55)' }}>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {seller.follower_count || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <Package className="w-3 h-3" />
                        {seller.product_count || 0}
                      </span>
                    </div>

                    {/* Hover CTA */}
                    <span
                      className="mt-3 text-[11px] font-semibold px-4 py-1 rounded-full
                        transition-all duration-200 opacity-60 group-hover:opacity-100"
                      style={{
                        background: `${ring}18`,
                        color: ring,
                        border: `1px solid ${ring}25`,
                      }}
                    >
                      Shop ansehen
                    </span>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
