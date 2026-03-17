'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface HeroSlide {
  id: string
  headline: string
  subline: string
  cta: string
  href: string
  gradient: string
}

// Tasteful static slides — no fake product data, just brand/navigation CTAs
const SLIDES: HeroSlide[] = [
  {
    id: 'arrivals',
    headline: 'Neue Saison,\nneue Entdeckungen',
    subline: 'Die neuesten Styles und Trends — direkt von geprüften Sellern.',
    cta: 'Neuheiten entdecken',
    href: '/store',
    gradient: 'linear-gradient(135deg, #0C1017 0%, #1a2744 50%, #0C1017 100%)',
  },
  {
    id: 'deals',
    headline: 'Top-Angebote\njetzt entdecken',
    subline: 'Echte Preisreduzierungen — keine Tricks, nur Qualität.',
    cta: 'Angebote ansehen',
    href: '/store?cat=sale',
    gradient: 'linear-gradient(135deg, #1a0800 0%, #7c2d12 50%, #1a0800 100%)',
  },
]

export function HeroSection() {
  const prefersReduced = useReducedMotion()
  const [current, setCurrent] = useState(0)
  const [direction, setDirection] = useState(1)

  const next = useCallback(() => {
    setDirection(1)
    setCurrent((c) => (c + 1) % SLIDES.length)
  }, [])

  const prev = useCallback(() => {
    setDirection(-1)
    setCurrent((c) => (c - 1 + SLIDES.length) % SLIDES.length)
  }, [])

  // Auto-advance every 6 s
  useEffect(() => {
    if (prefersReduced) return
    const id = setInterval(next, 6000)
    return () => clearInterval(id)
  }, [next, prefersReduced])

  const slide = SLIDES[current]

  const slideVariants = {
    enter: (dir: number) => ({ opacity: 0, x: prefersReduced ? 0 : dir * 60 }),
    center: { opacity: 1, x: 0 },
    exit: (dir: number) => ({ opacity: 0, x: prefersReduced ? 0 : dir * -60 }),
  }

  return (
    <section
      className="relative overflow-hidden"
      style={{ height: 'clamp(280px, 42vw, 520px)' }}
      aria-label="Hero Banner"
    >
      <AnimatePresence initial={false} custom={direction} mode="sync">
        <motion.div
          key={slide.id}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: prefersReduced ? 0 : 0.5, ease: 'easeInOut' }}
          className="absolute inset-0 flex items-center"
          style={{ background: slide.gradient }}
        >
          {/* Subtle geometric accent */}
          <div
            className="absolute right-0 top-0 h-full opacity-10"
            style={{
              width: '50%',
              background:
                'radial-gradient(ellipse at 80% 50%, rgba(217,119,6,0.6) 0%, transparent 70%)',
            }}
          />
          <div
            className="absolute bottom-0 left-0 right-0 h-[120px] opacity-30"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.5), transparent)' }}
          />

          {/* Content */}
          <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 w-full">
            <motion.div
              initial={prefersReduced ? {} : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.15, ease: 'easeOut' }}
            >
              <p
                className="text-[11px] uppercase font-bold mb-[12px] tracking-[0.12em]"
                style={{ color: '#D97706' }}
              >
                WEARO Marketplace
              </p>
              <h1
                className="font-black leading-tight mb-[16px] whitespace-pre-line"
                style={{
                  color: '#FFFFFF',
                  fontSize: 'clamp(28px, 4vw, 56px)',
                  textShadow: '0 2px 12px rgba(0,0,0,0.4)',
                }}
              >
                {slide.headline}
              </h1>
              <p
                className="mb-[28px] max-w-[480px]"
                style={{
                  color: 'rgba(255,255,255,0.75)',
                  fontSize: 'clamp(13px, 1.5vw, 16px)',
                }}
              >
                {slide.subline}
              </p>

              <Link
                href={slide.href}
                className="inline-flex items-center gap-[8px] px-[24px] py-[12px]
                  rounded-[8px] font-bold transition-all duration-150
                  hover:brightness-110 active:scale-[0.98]"
                style={{
                  background: '#D97706',
                  color: '#FFFFFF',
                  fontSize: 'clamp(13px, 1.2vw, 15px)',
                  boxShadow: '0 4px 16px rgba(217,119,6,0.4)',
                }}
              >
                {slide.cta}
                <ChevronRight className="w-[14px] h-[14px]" />
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation arrows */}
      {SLIDES.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-[16px] top-1/2 -translate-y-1/2 z-20
              w-[36px] h-[36px] rounded-full flex items-center justify-center
              transition-all duration-150 hover:scale-110"
            style={{ background: 'rgba(255,255,255,0.15)', color: '#FFF' }}
            aria-label="Vorheriger Slide"
          >
            <ChevronLeft className="w-[18px] h-[18px]" />
          </button>
          <button
            onClick={next}
            className="absolute right-[16px] top-1/2 -translate-y-1/2 z-20
              w-[36px] h-[36px] rounded-full flex items-center justify-center
              transition-all duration-150 hover:scale-110"
            style={{ background: 'rgba(255,255,255,0.15)', color: '#FFF' }}
            aria-label="Nächster Slide"
          >
            <ChevronRight className="w-[18px] h-[18px]" />
          </button>
        </>
      )}

      {/* Dot indicators */}
      <div className="absolute bottom-[16px] left-1/2 -translate-x-1/2 z-20 flex gap-[6px]">
        {SLIDES.map((s, i) => (
          <button
            key={s.id}
            onClick={() => { setDirection(i > current ? 1 : -1); setCurrent(i) }}
            className="rounded-full transition-all duration-200"
            style={{
              width: current === i ? '20px' : '6px',
              height: '6px',
              background: current === i ? '#D97706' : 'rgba(255,255,255,0.4)',
            }}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </section>
  )
}
