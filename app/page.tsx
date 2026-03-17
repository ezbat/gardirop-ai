'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { Package, Truck, Phone } from 'lucide-react'

// Storefront components
import { HeroSection } from '@/components/storefront/HeroSection'
import { ValueProps } from '@/components/storefront/ValueProps'
import { CategoryGrid, type CategoryItem } from '@/components/storefront/CategoryGrid'
import { ProductRow } from '@/components/storefront/ProductRow'
import { TrustBlock } from '@/components/storefront/TrustBlock'
import { SkeletonSection } from '@/components/storefront/SkeletonCard'
import type { ProductCardDTO } from '@/components/storefront/ProductCard'

// ─── Types ───────────────────────────────────────────────────────────────────

interface HomeData {
  success: boolean
  hasRealDeals: boolean
  categories: CategoryItem[]
  deals: ProductCardDTO[]
  newArrivals: ProductCardDTO[]
  popular: ProductCardDTO[]
}

// ─── Utility bar (desktop only) ──────────────────────────────────────────────

function UtilityBar() {
  return (
    <div
      className="hidden md:flex items-center justify-center gap-[24px] px-6 text-[11px]"
      style={{ height: '32px', background: '#0C1017', color: 'rgba(255,255,255,0.5)' }}
    >
      <Link href="/faq"
        className="flex items-center gap-[5px] hover:text-white transition-colors duration-150">
        <Truck className="w-[11px] h-[11px]" />
        Kostenloser Versand ab €50
      </Link>
      <span style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>
      <Link href="/returns"
        className="flex items-center gap-[5px] hover:text-white transition-colors duration-150">
        <Package className="w-[11px] h-[11px]" />
        30 Tage Rückgabe
      </Link>
      <span style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>
      <Link href="/support"
        className="flex items-center gap-[5px] hover:text-white transition-colors duration-150">
        <Phone className="w-[11px] h-[11px]" />
        Support Mo–Sa
      </Link>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const prefersReduced = useReducedMotion()
  const [data, setData] = useState<HomeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch('/api/storefront/home', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d: HomeData) => {
        if (d.success) setData(d)
        else setError(true)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen" style={{ background: '#FAFAFA' }}>
      {/* Utility bar — above the sticky NavHeader */}
      <UtilityBar />

      {/* ── Hero ──────────────────────────────────────────── */}
      <motion.div
        initial={prefersReduced ? {} : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <HeroSection />
      </motion.div>

      {/* ── Value props ───────────────────────────────────── */}
      <motion.div
        initial={prefersReduced ? {} : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: prefersReduced ? 0 : 0.25 }}
      >
        <ValueProps />
      </motion.div>

      {/* ── Category grid ─────────────────────────────────── */}
      {loading ? (
        <section className="py-[32px]" style={{ background: '#FAFAFA' }}>
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <div className="h-[22px] w-[220px] rounded bg-[#F0F0F0] animate-pulse mb-[20px]" />
            <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-[10px]">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-[1/1.2] rounded-[10px] bg-[#F0F0F0] animate-pulse" />
              ))}
            </div>
          </div>
        </section>
      ) : data?.categories?.length ? (
        <CategoryGrid categories={data.categories} />
      ) : null}

      {/* ── Deals / Featured strip ────────────────────────── */}
      {loading ? (
        <section className="py-[28px]" style={{ background: '#FFFFFF' }}>
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <SkeletonSection count={6} />
          </div>
        </section>
      ) : (
        <section style={{ background: '#FFFFFF' }}>
          <ProductRow
            title={data?.hasRealDeals ? 'Heutige Angebote' : 'Ausgewählte Produkte'}
            subtitle={
              data?.hasRealDeals
                ? 'Echte Preisreduzierungen von unseren Sellern'
                : 'Kuratierte Highlights aus dem Marketplace'
            }
            seeAllHref="/store"
            products={data?.deals ?? []}
            loading={loading}
            horizontal
          />
        </section>
      )}

      {/* ── New arrivals ──────────────────────────────────── */}
      {loading ? (
        <section className="py-[28px]" style={{ background: '#FAFAFA' }}>
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <SkeletonSection count={4} />
          </div>
        </section>
      ) : (
        <section style={{ background: '#FAFAFA' }}>
          <ProductRow
            title="Neuheiten"
            subtitle="Zuletzt hinzugefügt — frische Produkte von geprüften Sellern"
            seeAllHref="/store"
            products={data?.newArrivals ?? []}
            loading={loading}
          />
        </section>
      )}

      {/* ── Popular picks ─────────────────────────────────── */}
      {loading ? (
        <section className="py-[28px]" style={{ background: '#FFFFFF' }}>
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <SkeletonSection count={4} />
          </div>
        </section>
      ) : (
        <section style={{ background: '#FFFFFF' }}>
          <ProductRow
            title="Entdecke mehr"
            subtitle="Aktive Produkte aus unserem Marketplace (zufällige Auswahl)"
            seeAllHref="/store"
            products={data?.popular ?? []}
            loading={loading}
          />
        </section>
      )}

      {/* ── Error state ───────────────────────────────────── */}
      {error && !loading && (
        <div className="py-[60px] text-center">
          <p className="text-[14px]" style={{ color: '#CCC' }}>
            Produkte konnten nicht geladen werden.{' '}
            <button
              onClick={() => { setError(false); setLoading(true); fetch('/api/storefront/home').then(r => r.json()).then((d: HomeData) => { if (d.success) setData(d) }).finally(() => setLoading(false)) }}
              className="underline"
              style={{ color: '#D97706' }}
            >
              Erneut versuchen
            </button>
          </p>
        </div>
      )}

      {/* ── Trust block ───────────────────────────────────── */}
      <TrustBlock />
    </div>
  )
}
