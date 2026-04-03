'use client'

/**
 * HeroSection — Premium editorial hero.
 *
 * Not a generic product carousel. A single branded atmospheric moment
 * with subtle ambient animation, editorial typography, and a social-commerce identity.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, Sparkles } from 'lucide-react'

// ─── Ambient gradient orbs (purely decorative, lightly animated) ─────────────

function AmbientOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Primary warm orb */}
      <motion.div
        animate={{ x: [0, 30, -10, 0], y: [0, -20, 10, 0], scale: [1, 1.1, 0.95, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        className="absolute"
        style={{
          width: '60%', height: '120%',
          right: '-10%', top: '-20%',
          background: 'radial-gradient(ellipse, rgba(217,119,6,0.12) 0%, transparent 65%)',
          filter: 'blur(40px)',
        }}
      />
      {/* Secondary cool orb */}
      <motion.div
        animate={{ x: [0, -20, 15, 0], y: [0, 15, -10, 0] }}
        transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
        className="absolute"
        style={{
          width: '50%', height: '100%',
          left: '-5%', bottom: '-10%',
          background: 'radial-gradient(ellipse, rgba(99,102,241,0.07) 0%, transparent 65%)',
          filter: 'blur(50px)',
        }}
      />
      {/* Subtle grain overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: '128px 128px',
        }}
      />
    </div>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────

export function HeroSection() {
  const prefersReduced = useReducedMotion()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  return (
    <section
      className="relative overflow-hidden"
      style={{
        background: 'linear-gradient(165deg, #080A10 0%, #0E1320 45%, #12162A 100%)',
        minHeight: 'clamp(340px, 48vw, 520px)',
      }}
      aria-label="Hero"
    >
      {/* Ambient background */}
      {mounted && !prefersReduced && <AmbientOrbs />}

      {/* Bottom fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-24 z-10"
        style={{ background: 'linear-gradient(to top, #0B0D14, transparent)' }}
      />

      {/* Content */}
      <div className="relative z-20 max-w-6xl mx-auto px-6 md:px-12 flex items-center"
        style={{ minHeight: 'clamp(340px, 48vw, 520px)' }}>

        <div className="w-full py-16 md:py-0">
          {/* Brand tag */}
          <motion.div
            initial={prefersReduced ? {} : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex items-center gap-2 mb-6"
          >
            <div
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide"
              style={{
                background: 'rgba(217,119,6,0.12)',
                border: '1px solid rgba(217,119,6,0.2)',
                color: '#D97706',
              }}
            >
              <Sparkles className="w-3 h-3" />
              Dein Store entdecken
            </div>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={prefersReduced ? {} : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.2, ease: 'easeOut' }}
            className="font-black leading-[1.05] mb-5"
            style={{
              color: '#FFFFFF',
              fontSize: 'clamp(32px, 5vw, 64px)',
              letterSpacing: '-0.02em',
            }}
          >
            Entdecke Stil,{' '}
            <span style={{ color: '#D97706' }}>
              kuratiert
            </span>
            <br className="hidden sm:block" />
            {' '}für dich.
          </motion.h1>

          {/* Subline */}
          <motion.p
            initial={prefersReduced ? {} : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="mb-8 max-w-md"
            style={{
              color: 'rgba(255,255,255,0.65)',
              fontSize: 'clamp(14px, 1.6vw, 17px)',
              lineHeight: 1.6,
            }}
          >
            Einzigartige Produkte von geprüften Sellern —
            Mode, Accessoires und mehr. Keine Massenware, nur Qualität.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={prefersReduced ? {} : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.5 }}
            className="flex flex-wrap items-center gap-3"
          >
            <Link
              href="/store"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm
                transition-all duration-200 hover:brightness-110 hover:shadow-lg active:scale-[0.98]"
              style={{
                background: '#D97706',
                color: '#FFFFFF',
                boxShadow: '0 4px 24px rgba(217,119,6,0.3)',
              }}
            >
              Jetzt entdecken
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/categories"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm
                transition-all duration-200 hover:bg-white/10 active:scale-[0.98]"
              style={{
                background: 'rgba(255,255,255,0.06)',
                color: 'rgba(255,255,255,0.7)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              Kategorien
            </Link>
          </motion.div>

          {/* Social proof line */}
          <motion.div
            initial={prefersReduced ? {} : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.7 }}
            className="flex items-center gap-4 mt-10"
          >
            {/* Avatars */}
            <div className="flex -space-x-2">
              {['#D97706', '#6366F1', '#EC4899', '#10B981'].map((c, i) => (
                <div
                  key={i}
                  className="w-7 h-7 rounded-full border-2 flex items-center justify-center text-[9px] font-bold text-white"
                  style={{ background: c, borderColor: '#0E1320' }}
                >
                  {['S', 'M', 'L', 'A'][i]}
                </div>
              ))}
            </div>
            <div>
              <p className="text-[12px] font-medium" style={{ color: 'rgba(255,255,255,0.65)' }}>
                <span style={{ color: 'rgba(255,255,255,0.8)' }}>500+</span> aktive Seller
              </p>
              <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
                Geprüft & verifiziert
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
