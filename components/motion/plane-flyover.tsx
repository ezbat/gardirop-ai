'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { CargoPlane } from './cargo-plane'

/**
 * Homepage plane flyover — a subtle branded plane that flies across the top
 * of the homepage periodically. Non-intrusive, delightful brand identity.
 *
 * Fires once on mount (after 3s delay), then every 45s.
 */
export function PlaneFlyover() {
  const reduced = useReducedMotion()
  const [visible, setVisible] = useState(false)
  const [key, setKey] = useState(0)

  useEffect(() => {
    if (reduced) return

    // Initial flyover after 3s
    const initial = setTimeout(() => {
      setVisible(true)
      setKey((k) => k + 1)
    }, 3000)

    // Repeat every 45s
    const interval = setInterval(() => {
      setVisible(true)
      setKey((k) => k + 1)
    }, 45000)

    return () => {
      clearTimeout(initial)
      clearInterval(interval)
    }
  }, [reduced])

  if (reduced || !visible) return null

  return (
    <div
      className="fixed top-16 left-0 right-0 pointer-events-none overflow-hidden"
      style={{ height: 60, zIndex: 5 }}
    >
      <motion.div
        key={key}
        className="absolute flex items-center"
        style={{ top: 8 }}
        initial={{ x: '-10%', opacity: 0 }}
        animate={{
          x: ['0%', '110%'],
          y: [0, -8, 0, -4, 0],
          opacity: [0, 1, 1, 1, 0],
        }}
        transition={{
          x: { duration: 6, ease: 'linear' },
          y: { duration: 3, repeat: 1, ease: [0.16, 1, 0.3, 1] },
          opacity: { duration: 6, times: [0, 0.05, 0.5, 0.9, 1] },
        }}
        onAnimationComplete={() => setVisible(false)}
      >
        {/* Contrail */}
        <motion.div
          className="h-px mr-1"
          style={{
            width: 80,
            background: 'linear-gradient(90deg, transparent 0%, rgba(217,119,6,0.15) 100%)',
          }}
          animate={{ width: [40, 80, 60] }}
          transition={{ duration: 3, repeat: 1 }}
        />
        <CargoPlane size={32} color="rgba(217,119,6,0.35)" />
      </motion.div>
    </div>
  )
}
