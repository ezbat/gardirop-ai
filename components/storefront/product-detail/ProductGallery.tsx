'use client'

/**
 * ProductGallery
 *
 * Desktop: vertical thumbnail rail (left) + large main image (right).
 * Mobile:  full-width main image with swipe + horizontal thumbnail strip.
 * Fullscreen: modal overlay with keyboard ← → and touch-swipe support.
 * Zoom: CSS scale on hover for desktop.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { X, ChevronLeft, ChevronRight, ZoomIn, Expand } from 'lucide-react'

interface ProductGalleryProps {
  images: string[]
  title: string
  discountPercent?: number | null
  isNew?: boolean
  isOutOfStock?: boolean
}

const PLACEHOLDER = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"%3E%3Crect width="400" height="400" fill="%23F3F4F6"/%3E%3Ctext x="50%25" y="50%25" font-family="sans-serif" font-size="18" fill="%23D1D5DB" text-anchor="middle" dy=".3em"%3EKein Bild%3C/text%3E%3C/svg%3E'

export function ProductGallery({
  images,
  title,
  discountPercent,
  isNew,
  isOutOfStock,
}: ProductGalleryProps) {
  const prefersReduced = useReducedMotion()
  const [active, setActive]       = useState(0)
  const [fullscreen, setFullscreen] = useState(false)
  const [isZoomed, setIsZoomed]   = useState(false)
  const [zoomPos, setZoomPos]     = useState({ x: 50, y: 50 })
  const mainRef = useRef<HTMLDivElement>(null)

  // Touch swipe state
  const touchStartX = useRef<number | null>(null)

  const imgs = images.length > 0 ? images : [PLACEHOLDER]
  const count = imgs.length

  // ── Navigation ──────────────────────────────────────────────────────────────
  const prev = useCallback(() => setActive(i => (i - 1 + count) % count), [count])
  const next = useCallback(() => setActive(i => (i + 1) % count), [count])

  // Keyboard navigation (fullscreen)
  useEffect(() => {
    if (!fullscreen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft')  prev()
      if (e.key === 'ArrowRight') next()
      if (e.key === 'Escape')     setFullscreen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [fullscreen, prev, next])

  // Lock body scroll when fullscreen
  useEffect(() => {
    document.body.style.overflow = fullscreen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [fullscreen])

  // ── Touch swipe ─────────────────────────────────────────────────────────────
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(dx) > 50) dx < 0 ? next() : prev()
    touchStartX.current = null
  }

  // ── Zoom position tracking ───────────────────────────────────────────────────
  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setZoomPos({ x, y })
  }

  const hasReal = images.length > 0

  return (
    <>
      {/* ── Main gallery layout ──────────────────────────────────────────── */}
      <div className="flex gap-3">

        {/* ── Vertical thumbnail rail (desktop only) ── */}
        {count > 1 && (
          <div className="hidden lg:flex flex-col gap-2 w-[72px] flex-shrink-0">
            {imgs.map((src, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                className={`
                  relative aspect-square w-full rounded-lg overflow-hidden border-2 transition-all duration-150 flex-shrink-0
                  ${active === i
                    ? 'border-[#1A1A1A] shadow-sm'
                    : 'border-[#E5E7EB] hover:border-[#9CA3AF]'}
                `}
                aria-label={`Bild ${i + 1} anzeigen`}
              >
                <Image
                  src={src}
                  alt={`${title} — Vorschau ${i + 1}`}
                  fill
                  sizes="72px"
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        )}

        {/* ── Main image ─────────────────────────────────────────────────── */}
        <div className="flex-1 relative">
          {/* Image container */}
          <div
            ref={mainRef}
            className={`
              relative w-full overflow-hidden rounded-2xl bg-[#F8F8F8]
              ${isZoomed && hasReal ? 'cursor-zoom-out' : hasReal ? 'cursor-zoom-in' : 'cursor-default'}
            `}
            style={{ aspectRatio: '4/5' }}
            onMouseEnter={() => hasReal && setIsZoomed(true)}
            onMouseLeave={() => setIsZoomed(false)}
            onMouseMove={onMouseMove}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            onClick={() => setFullscreen(true)}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={active}
                initial={prefersReduced ? { opacity: 1 } : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={prefersReduced ? { opacity: 1 } : { opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="absolute inset-0"
              >
                <Image
                  src={imgs[active]}
                  alt={`${title} — Bild ${active + 1}`}
                  fill
                  priority={active === 0}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 60vw, 50vw"
                  className={`
                    object-cover transition-transform duration-200 ease-out will-change-transform
                    ${isZoomed ? 'scale-150' : 'scale-100'}
                  `}
                  style={isZoomed
                    ? { transformOrigin: `${zoomPos.x}% ${zoomPos.y}%` }
                    : undefined
                  }
                  draggable={false}
                />
              </motion.div>
            </AnimatePresence>

            {/* ── Overlay badges ────────────────────────────────────────── */}
            <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none z-10">
              {isOutOfStock && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#6B7280] text-white">
                  Ausverkauft
                </span>
              )}
              {!isOutOfStock && discountPercent && discountPercent > 0 && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#DC2626] text-white">
                  -{discountPercent}%
                </span>
              )}
              {isNew && !isOutOfStock && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#D97706] text-white">
                  Neu
                </span>
              )}
            </div>

            {/* ── Navigation arrows (visible when multiple images) ──────── */}
            {count > 1 && (
              <>
                <button
                  onClick={e => { e.stopPropagation(); prev() }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full
                    bg-white/90 shadow flex items-center justify-center
                    hover:bg-white transition-all hover:scale-105 active:scale-95"
                  aria-label="Vorheriges Bild"
                >
                  <ChevronLeft className="w-4 h-4 text-[#1A1A1A]" />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); next() }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full
                    bg-white/90 shadow flex items-center justify-center
                    hover:bg-white transition-all hover:scale-105 active:scale-95"
                  aria-label="Nächstes Bild"
                >
                  <ChevronRight className="w-4 h-4 text-[#1A1A1A]" />
                </button>
              </>
            )}

            {/* ── Expand / Fullscreen button ────────────────────────────── */}
            {hasReal && (
              <button
                onClick={e => { e.stopPropagation(); setFullscreen(true) }}
                className="absolute bottom-3 right-3 z-10 w-8 h-8 rounded-lg
                  bg-white/90 shadow flex items-center justify-center
                  hover:bg-white transition-all hover:scale-105 active:scale-95"
                aria-label="Vollbild öffnen"
              >
                <Expand className="w-3.5 h-3.5 text-[#1A1A1A]" />
              </button>
            )}

            {/* ── Image counter ─────────────────────────────────────────── */}
            {count > 1 && (
              <div className="absolute bottom-3 left-3 z-10 px-2 py-0.5 rounded-full
                bg-black/40 text-white text-[11px] font-medium"
              >
                {active + 1} / {count}
              </div>
            )}

            {/* ── Zoom hint (desktop, when hoverable) ──────────────────── */}
            {hasReal && !isZoomed && (
              <div className="hidden lg:flex absolute top-3 right-3 z-10 items-center gap-1
                px-2 py-1 rounded-md bg-white/90 text-[11px] text-[#6B7280] pointer-events-none"
              >
                <ZoomIn className="w-3 h-3" />
                Zoom
              </div>
            )}
          </div>

          {/* ── Mobile thumbnail strip ────────────────────────────────────── */}
          {count > 1 && (
            <div className="flex lg:hidden gap-2 mt-3 overflow-x-auto pb-1 scrollbar-none">
              {imgs.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  className={`
                    relative flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all
                    ${active === i
                      ? 'border-[#1A1A1A]'
                      : 'border-[#E5E7EB] opacity-60 hover:opacity-100'}
                  `}
                >
                  <Image
                    src={src}
                    alt={`${title} ${i + 1}`}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          {/* ── Mobile dot indicators (max 8 dots) ───────────────────────── */}
          {count > 1 && count <= 8 && (
            <div className="flex lg:hidden items-center justify-center gap-1.5 mt-2">
              {imgs.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  className={`transition-all duration-150 rounded-full ${
                    i === active
                      ? 'w-4 h-1.5 bg-[#1A1A1A]'
                      : 'w-1.5 h-1.5 bg-[#D1D5DB]'
                  }`}
                  aria-label={`Bild ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Fullscreen Modal ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {fullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center"
            onClick={() => setFullscreen(false)}
          >
            {/* Close */}
            <button
              onClick={() => setFullscreen(false)}
              className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20
                flex items-center justify-center transition-colors"
              aria-label="Schließen"
            >
              <X className="w-5 h-5 text-white" />
            </button>

            {/* Counter */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/60 text-sm font-medium">
              {active + 1} / {count}
            </div>

            {/* Main fullscreen image */}
            <div
              className="relative w-full max-w-3xl max-h-[80vh] mx-4"
              onClick={e => e.stopPropagation()}
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={`fs-${active}`}
                  initial={prefersReduced ? { opacity: 1 } : { opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={prefersReduced ? { opacity: 1 } : { opacity: 0, scale: 1.02 }}
                  transition={{ duration: 0.15 }}
                  className="relative w-full"
                  style={{ aspectRatio: '4/5' }}
                >
                  <Image
                    src={imgs[active]}
                    alt={`${title} — Bild ${active + 1}`}
                    fill
                    sizes="(max-width: 768px) 100vw, 80vw"
                    className="object-contain"
                    priority
                  />
                </motion.div>
              </AnimatePresence>

              {/* Fullscreen nav arrows */}
              {count > 1 && (
                <>
                  <button
                    onClick={e => { e.stopPropagation(); prev() }}
                    className="absolute left-[-52px] top-1/2 -translate-y-1/2 w-11 h-11 rounded-full
                      bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors
                      hidden sm:flex"
                  >
                    <ChevronLeft className="w-6 h-6 text-white" />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); next() }}
                    className="absolute right-[-52px] top-1/2 -translate-y-1/2 w-11 h-11 rounded-full
                      bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors
                      hidden sm:flex"
                  >
                    <ChevronRight className="w-6 h-6 text-white" />
                  </button>
                </>
              )}
            </div>

            {/* Fullscreen thumbnail strip */}
            {count > 1 && (
              <div
                className="flex gap-2 mt-4 px-4 overflow-x-auto max-w-full pb-1"
                onClick={e => e.stopPropagation()}
              >
                {imgs.map((src, i) => (
                  <button
                    key={i}
                    onClick={() => setActive(i)}
                    className={`
                      relative flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all
                      ${i === active
                        ? 'border-white opacity-100'
                        : 'border-white/20 opacity-50 hover:opacity-80'}
                    `}
                  >
                    <Image
                      src={src}
                      alt={`Thumbnail ${i + 1}`}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
