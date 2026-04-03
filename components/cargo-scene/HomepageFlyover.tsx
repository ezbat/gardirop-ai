'use client'

/**
 * HomepageFlyover — Light ambient cargo plane presence on the homepage.
 *
 * BEHAVIOR:
 * - At rest: subtle parallax silhouette behind product cards
 * - Occasionally: a stronger flyover animation passes through
 * - The plane "passes behind" the product card world
 *
 * MOBILE:
 * - Simplified to a 2D silhouette with CSS transforms
 * - No WebGL overhead on mobile homepage
 *
 * DESKTOP:
 * - Uses a lightweight Canvas with a single fly-through animation
 * - Triggered by scroll position or periodic timer
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import { useCargoMotionPreference } from './usePlatformOrders'

export default function HomepageFlyover() {
  const { reducedMotion, isMobile } = useCargoMotionPreference()
  const [flyoverActive, setFlyoverActive] = useState(false)
  const timerRef = useRef<NodeJS.Timeout>()

  // Trigger flyover every 30-60 seconds
  useEffect(() => {
    if (reducedMotion) return

    const triggerFlyover = () => {
      setFlyoverActive(true)
      setTimeout(() => setFlyoverActive(false), 4000)
    }

    // First flyover after 8 seconds
    const initial = setTimeout(triggerFlyover, 8000)

    // Recurring flyovers
    timerRef.current = setInterval(() => {
      triggerFlyover()
    }, 35000 + Math.random() * 25000)

    return () => {
      clearTimeout(initial)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [reducedMotion])

  if (reducedMotion) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-[1] overflow-hidden">
      <AnimatePresence>
        {flyoverActive && (
          <motion.div
            key="flyover"
            initial={{ x: '-20%', y: '60%', scale: isMobile ? 0.5 : 0.8, opacity: 0 }}
            animate={{
              x: '120%',
              y: '20%',
              scale: isMobile ? 0.6 : 1,
              opacity: [0, 0.15, 0.2, 0.15, 0],
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: isMobile ? 3 : 4, ease: 'easeInOut' }}
            className="absolute"
            style={{ filter: 'blur(0.5px)' }}
          >
            <PlaneSilhouette size={isMobile ? 100 : 180} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ambient trail effect during flyover */}
      <AnimatePresence>
        {flyoverActive && !isMobile && (
          <motion.div
            key="trail"
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: [0, 0.06, 0.04, 0], scaleX: [0, 1.5] }}
            transition={{ duration: 4, ease: 'easeOut' }}
            className="absolute top-1/3 left-0 right-0 h-[2px]"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, #D97706 30%, #D97706 70%, transparent 100%)',
              transformOrigin: 'left center',
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

/** SVG cargo plane silhouette */
function PlaneSilhouette({ size = 180 }: { size?: number }) {
  const aspect = 2.4
  const w = size * aspect
  const h = size

  return (
    <svg width={w} height={h} viewBox="0 0 240 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Fuselage */}
      <ellipse cx="120" cy="50" rx="95" ry="14" fill="#D97706" opacity="0.3" />
      {/* Nose */}
      <path d="M215 50 Q230 48 225 50 Q230 52 215 50" fill="#D97706" opacity="0.25" />
      {/* Wings */}
      <path d="M100 50 L80 15 L140 15 L130 50" fill="#D97706" opacity="0.2" />
      <path d="M100 50 L80 85 L140 85 L130 50" fill="#D97706" opacity="0.2" />
      {/* Tail fin */}
      <path d="M30 50 L15 20 L45 20 L40 50" fill="#D97706" opacity="0.25" />
      {/* Engine pods */}
      <ellipse cx="105" cy="25" rx="12" ry="5" fill="#D97706" opacity="0.2" />
      <ellipse cx="105" cy="75" rx="12" ry="5" fill="#D97706" opacity="0.2" />
      {/* Engine glow */}
      <circle cx="93" cy="25" r="3" fill="#F59E0B" opacity="0.4" />
      <circle cx="93" cy="75" r="3" fill="#F59E0B" opacity="0.4" />
    </svg>
  )
}
