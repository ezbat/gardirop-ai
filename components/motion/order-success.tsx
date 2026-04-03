'use client'

import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useState, useEffect } from 'react'
import { CargoPlane } from './cargo-plane'
import { CheckCircle2, Package, Sparkles } from 'lucide-react'

/**
 * Branded order success animation sequence:
 * 1. Plane flies in from left → centers
 * 2. Package drops from plane
 * 3. Confetti burst + checkmark reveal
 * 4. "Bestellung erfolgreich!" text fades in
 */
export function OrderSuccessAnimation({
  onComplete,
}: {
  onComplete?: () => void
}) {
  const reduced = useReducedMotion()
  const [phase, setPhase] = useState<'plane' | 'drop' | 'celebrate' | 'done'>('plane')

  useEffect(() => {
    if (reduced) {
      setPhase('done')
      return
    }
    const t1 = setTimeout(() => setPhase('drop'), 1200)
    const t2 = setTimeout(() => setPhase('celebrate'), 2000)
    const t3 = setTimeout(() => {
      setPhase('done')
      onComplete?.()
    }, 3600)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [reduced, onComplete])

  if (reduced) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle2 className="w-12 h-12 text-green-600" />
        </div>
        <p className="text-lg font-bold">Bestellung erfolgreich!</p>
      </div>
    )
  }

  return (
    <div className="relative flex flex-col items-center justify-center h-64 overflow-hidden">
      <AnimatePresence mode="wait">
        {/* Phase 1: Plane flies in */}
        {(phase === 'plane' || phase === 'drop') && (
          <motion.div
            key="plane"
            initial={{ x: -200, opacity: 0 }}
            animate={{
              x: phase === 'drop' ? 200 : 0,
              y: phase === 'drop' ? -60 : 0,
              opacity: phase === 'drop' ? 0 : 1,
            }}
            transition={{
              duration: phase === 'drop' ? 0.8 : 1,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="absolute"
          >
            <CargoPlane size={80} />
          </motion.div>
        )}

        {/* Phase 2: Package drops */}
        {phase === 'drop' && (
          <motion.div
            key="package"
            initial={{ y: -40, opacity: 0, scale: 0.5 }}
            animate={{ y: 20, opacity: 1, scale: 1 }}
            transition={{
              duration: 0.6,
              ease: [0.34, 1.56, 0.64, 1], // overshoot bounce
            }}
            className="absolute"
          >
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: '#FEF3C7' }}>
              <Package className="w-8 h-8" style={{ color: '#D97706' }} />
            </div>
          </motion.div>
        )}

        {/* Phase 3: Celebration */}
        {(phase === 'celebrate' || phase === 'done') && (
          <motion.div
            key="celebrate"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              type: 'spring',
              stiffness: 200,
              damping: 15,
            }}
            className="flex flex-col items-center gap-4"
          >
            {/* Confetti ring */}
            <div className="relative">
              {/* Expanding ring */}
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{ border: '2px solid rgba(217, 119, 6, 0.3)' }}
                initial={{ scale: 0.5, opacity: 1 }}
                animate={{ scale: 2.5, opacity: 0 }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />

              {/* Sparkle particles */}
              {[...Array(8)].map((_, i) => {
                const angle = (i / 8) * Math.PI * 2
                const dist = 50
                return (
                  <motion.div
                    key={i}
                    className="absolute w-2 h-2 rounded-full"
                    style={{
                      background: i % 2 === 0 ? '#D97706' : '#F59E0B',
                      top: '50%',
                      left: '50%',
                    }}
                    initial={{ x: 0, y: 0, scale: 0 }}
                    animate={{
                      x: Math.cos(angle) * dist,
                      y: Math.sin(angle) * dist,
                      scale: [0, 1.2, 0],
                      opacity: [0, 1, 0],
                    }}
                    transition={{
                      duration: 0.8,
                      delay: i * 0.04,
                      ease: 'easeOut',
                    }}
                  />
                )
              })}

              {/* Success checkmark */}
              <motion.div
                className="w-20 h-20 rounded-full flex items-center justify-center relative z-10"
                style={{ background: '#ECFDF5' }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 20,
                  delay: 0.1,
                }}
              >
                <motion.div
                  initial={{ scale: 0, rotate: -45 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.3, type: 'spring', stiffness: 250 }}
                >
                  <CheckCircle2 className="w-12 h-12 text-green-600" />
                </motion.div>
              </motion.div>
            </div>

            {/* Text */}
            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.4 }}
            >
              <div className="flex items-center gap-1.5 justify-center mb-1">
                <Sparkles className="w-4 h-4" style={{ color: '#D97706' }} />
                <span className="text-lg font-bold">Bestellung erfolgreich!</span>
                <Sparkles className="w-4 h-4" style={{ color: '#D97706' }} />
              </div>
              <p className="text-sm" style={{ color: '#8B8680' }}>
                Dein Paket ist auf dem Weg
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
