'use client'

/**
 * OrderSuccessTransition — Branded moment when a user completes an order.
 *
 * FLOW:
 * 1. Full-screen overlay fades in (dark, cinematic)
 * 2. User's order becomes a glowing amber cargo box (center screen)
 * 3. Box shrinks and slides toward the cargo plane (lower area)
 * 4. Box joins the loading sequence into the hold
 * 5. Brief pause — branded "Deine Bestellung ist unterwegs" text
 * 6. Overlay fades out → order confirmation page shows
 *
 * MOBILE:
 * - Simplified: 2D box animation + branded text, no WebGL
 * - Still cinematic and emotional, just lighter on GPU
 */

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCargoMotionPreference } from './usePlatformOrders'
import dynamic from 'next/dynamic'

const CargoScene = dynamic(() => import('./CargoScene'), { ssr: false })

interface OrderSuccessTransitionProps {
  active: boolean
  onComplete: () => void
  orderId?: string
}

export default function OrderSuccessTransition({
  active,
  onComplete,
  orderId,
}: OrderSuccessTransitionProps) {
  const { reducedMotion, isMobile } = useCargoMotionPreference()
  const [phase, setPhase] = useState<'box' | 'scene' | 'text' | 'done'>('box')

  useEffect(() => {
    if (!active) {
      setPhase('box')
      return
    }

    if (reducedMotion) {
      // Skip animation, just show text briefly
      setPhase('text')
      const t = setTimeout(() => onComplete(), 2000)
      return () => clearTimeout(t)
    }

    // Phase 1: glowing box (1.5s)
    const t1 = setTimeout(() => setPhase('scene'), 1500)
    // Phase 2: cargo scene (4s for mobile 2D, 6s for desktop 3D)
    const sceneTime = isMobile ? 3500 : 5500
    const t2 = setTimeout(() => setPhase('text'), 1500 + sceneTime)
    // Phase 3: text (2s)
    const t3 = setTimeout(() => {
      setPhase('done')
      onComplete()
    }, 1500 + sceneTime + 2500)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [active, reducedMotion, isMobile, onComplete])

  if (!active) return null

  return (
    <AnimatePresence>
      <motion.div
        key="order-transition"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.6 }}
        className="fixed inset-0 z-[9998] flex items-center justify-center"
        style={{ background: '#0a0c12' }}
      >
        {/* Phase 1: Glowing order box */}
        <AnimatePresence mode="wait">
          {phase === 'box' && (
            <motion.div
              key="glow-box"
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{
                scale: 0.15,
                y: 120,
                opacity: 0.6,
                transition: { duration: 0.8, ease: 'easeIn' },
              }}
              className="flex flex-col items-center gap-4"
            >
              {/* The glowing box */}
              <motion.div
                animate={{
                  boxShadow: [
                    '0 0 20px rgba(217,119,6,0.3)',
                    '0 0 60px rgba(217,119,6,0.6)',
                    '0 0 20px rgba(217,119,6,0.3)',
                  ],
                }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-20 h-20 rounded-xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #D97706 0%, #F59E0B 50%, #D97706 100%)',
                  border: '2px solid rgba(245,158,11,0.5)',
                }}
              >
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
                  <path d="M20.5 7.27L12 12M12 12L3.5 7.27M12 12V21.5M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
                </svg>
              </motion.div>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-sm font-medium text-amber-500/80"
              >
                Dein Paket wird vorbereitet...
              </motion.p>
            </motion.div>
          )}

          {/* Phase 2: Cargo scene with box entering */}
          {phase === 'scene' && (
            <motion.div
              key="scene"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-full"
            >
              {isMobile ? (
                <MobileCargoAnimation />
              ) : (
                <CargoScene variant="orderSuccess" highlightNewOrder />
              )}
            </motion.div>
          )}

          {/* Phase 3: Branded confirmation text */}
          {phase === 'text' && (
            <motion.div
              key="text"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-5"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 15, stiffness: 200 }}
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(217,119,6,0.15)', border: '2px solid rgba(217,119,6,0.3)' }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </motion.div>
              <div className="text-center">
                <h2 className="text-xl font-bold text-white mb-1">
                  Deine Bestellung ist unterwegs
                </h2>
                <p className="text-sm text-amber-500/60">
                  WEARO Cargo kümmert sich darum
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Ambient particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 12 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-amber-500/20"
              initial={{
                x: `${Math.random() * 100}%`,
                y: `${Math.random() * 100}%`,
                opacity: 0,
              }}
              animate={{
                y: [null, `${Math.random() * 100}%`],
                opacity: [0, 0.3, 0],
              }}
              transition={{
                duration: 4 + Math.random() * 4,
                repeat: Infinity,
                delay: Math.random() * 3,
              }}
            />
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

/** Lightweight 2D cargo animation for mobile */
function MobileCargoAnimation() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-6 px-6">
      {/* Runway */}
      <div className="relative w-full max-w-xs h-32">
        {/* Ground line */}
        <div className="absolute bottom-8 left-0 right-0 h-[1px] bg-amber-500/20" />

        {/* Runway lights */}
        {[0, 25, 50, 75, 100].map(pct => (
          <motion.div
            key={pct}
            className="absolute bottom-7 w-1.5 h-1.5 rounded-full bg-amber-500"
            style={{ left: `${pct}%` }}
            animate={{ opacity: [0.2, 0.8, 0.2] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: pct / 100 }}
          />
        ))}

        {/* Plane silhouette moving along runway */}
        <motion.div
          initial={{ x: '-20%', y: 0 }}
          animate={{ x: '120%', y: -30 }}
          transition={{ duration: 3, ease: 'easeIn' }}
          className="absolute bottom-10 left-0"
        >
          <svg width="60" height="24" viewBox="0 0 60 24" fill="#D97706">
            <ellipse cx="30" cy="12" rx="24" ry="5" opacity="0.8" />
            <path d="M20 12 L15 3 L35 3 L32 12" opacity="0.6" />
            <path d="M20 12 L15 21 L35 21 L32 12" opacity="0.6" />
            <path d="M8 12 L3 5 L12 5 L10 12" opacity="0.7" />
          </svg>
        </motion.div>

        {/* Box entering plane */}
        <motion.div
          initial={{ x: -20, y: 20, opacity: 0 }}
          animate={{ x: 40, y: 0, opacity: [0, 1, 1, 0] }}
          transition={{ duration: 2, ease: 'easeInOut' }}
          className="absolute bottom-12 left-4 w-4 h-4 rounded-sm"
          style={{
            background: '#F59E0B',
            boxShadow: '0 0 12px rgba(245,158,11,0.5)',
          }}
        />
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="text-xs text-amber-500/50 font-medium tracking-wider uppercase"
      >
        Paket wird verladen...
      </motion.p>
    </div>
  )
}
