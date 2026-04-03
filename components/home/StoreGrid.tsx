'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, useReducedMotion } from 'framer-motion'
import { BadgeCheck, Users, ShoppingBag, ArrowRight } from 'lucide-react'

interface StoreCard {
  id: string
  shop_name: string
  shop_slug: string | null
  logo_url: string | null
  banner_url: string | null
  description: string | null
  category: string | null
  follower_count: number
  product_count: number
  is_verified: boolean
  accent_color: string
}

export function StoreGrid() {
  const prefersReduced = useReducedMotion()
  const [stores, setStores] = useState<StoreCard[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/stores?limit=12')
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.stores?.length) setStores(d.stores)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <section className="py-16 relative" style={{ background: '#0B0D14' }}>
      {/* Ambient glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse, rgba(217,119,6,0.03) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />

      <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-10">
        {/* Header */}
        <div className="flex items-end justify-between mb-10">
          <div>
            <span
              className="text-[10px] font-semibold uppercase tracking-[0.2em] block mb-1.5"
              style={{ color: '#D97706' }}
            >
              Entdecke Stores
            </span>
            <h2 className="text-xl md:text-2xl font-bold text-white">
              Kreative Shops auf WEARO
            </h2>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Entdecke einzigartige Stores von verifizierten Creatorn
            </p>
          </div>
          <Link
            href="/explore"
            className="hidden md:flex items-center gap-1.5 text-xs font-semibold transition-opacity hover:opacity-70"
            style={{ color: '#D97706' }}
          >
            Alle Stores <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Loading skeleton */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl animate-pulse"
                style={{ background: 'rgba(255,255,255,0.04)', height: 280 }}
              />
            ))}
          </div>
        ) : stores.length === 0 ? (
          /* Empty state */
          <div className="text-center py-20">
            <ShoppingBag className="w-10 h-10 mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.15)' }} />
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Noch keine Stores verfügbar
            </p>
          </div>
        ) : (
          /* Store cards grid */
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {stores.map((store, i) => {
              const storeUrl = store.shop_slug ? `/${store.shop_slug}` : `/seller/${store.id}`
              return (
                <motion.div
                  key={store.id}
                  initial={prefersReduced ? {} : { opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-30px' }}
                  transition={{ duration: 0.35, delay: i * 0.04 }}
                >
                  <Link
                    href={storeUrl}
                    className="group block rounded-2xl overflow-hidden transition-all duration-300
                      hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(217,119,6,0.08)]"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    {/* Banner */}
                    <div className="relative h-24 overflow-hidden" style={{ background: '#14161E' }}>
                      {store.banner_url ? (
                        <Image
                          src={store.banner_url}
                          alt=""
                          fill
                          sizes="(max-width: 768px) 50vw, 25vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                        />
                      ) : (
                        <div
                          className="absolute inset-0"
                          style={{
                            background: `linear-gradient(135deg, ${store.accent_color}15 0%, transparent 60%)`,
                          }}
                        />
                      )}
                      {/* Category pill */}
                      {store.category && (
                        <div
                          className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-[9px] font-semibold"
                          style={{
                            background: 'rgba(0,0,0,0.55)',
                            backdropFilter: 'blur(8px)',
                            color: 'rgba(255,255,255,0.75)',
                          }}
                        >
                          {store.category}
                        </div>
                      )}
                    </div>

                    {/* Store info */}
                    <div className="p-4 pt-3">
                      {/* Logo + name row */}
                      <div className="flex items-center gap-2.5 mb-2.5">
                        <div
                          className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0"
                          style={{
                            background: 'rgba(255,255,255,0.08)',
                            border: '2px solid rgba(255,255,255,0.08)',
                          }}
                        >
                          {store.logo_url ? (
                            <Image
                              src={store.logo_url}
                              alt={store.shop_name}
                              width={36}
                              height={36}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white/60">
                              {store.shop_name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-semibold text-white truncate">
                              {store.shop_name}
                            </span>
                            {store.is_verified && (
                              <BadgeCheck className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#3B82F6' }} />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Stats row */}
                      <div
                        className="flex items-center gap-4 text-[11px] mb-3"
                        style={{ color: 'rgba(255,255,255,0.4)' }}
                      >
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {store.follower_count} Follower
                        </span>
                        <span className="flex items-center gap-1">
                          <ShoppingBag className="w-3 h-3" />
                          {store.product_count} Produkte
                        </span>
                      </div>

                      {/* CTA */}
                      <div
                        className="text-center py-2 rounded-xl text-xs font-semibold transition-colors duration-200
                          group-hover:brightness-110"
                        style={{
                          background: 'rgba(217,119,6,0.1)',
                          color: '#D97706',
                          border: '1px solid rgba(217,119,6,0.15)',
                        }}
                      >
                        Shop ansehen
                      </div>
                    </div>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        )}

        {/* Mobile "see all" */}
        <div className="mt-6 text-center md:hidden">
          <Link
            href="/explore"
            className="inline-flex items-center gap-1.5 text-xs font-semibold"
            style={{ color: '#D97706' }}
          >
            Alle Stores ansehen <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </section>
  )
}
