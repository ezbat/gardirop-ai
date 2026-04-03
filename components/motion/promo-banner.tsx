'use client'

import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useState, useEffect, useCallback } from 'react'
import { Clock, Flame, Tag, ChevronRight, X } from 'lucide-react'

interface PromoDeal {
  id: string
  label: string
  description: string
  href: string
  endsAt?: string // ISO date
  type: 'flash' | 'promo' | 'new'
}

const ICON_MAP = {
  flash: Flame,
  promo: Tag,
  new: Clock,
}

const COLOR_MAP = {
  flash: { bg: '#FEF2F2', border: '#FECACA', accent: '#DC2626', text: '#991B1B' },
  promo: { bg: '#FFFBEB', border: '#FDE68A', accent: '#D97706', text: '#92400E' },
  new: { bg: '#EFF6FF', border: '#BFDBFE', accent: '#2563EB', text: '#1E40AF' },
}

function CountdownTimer({ endsAt }: { endsAt: string }) {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    function update() {
      const diff = new Date(endsAt).getTime() - Date.now()
      if (diff <= 0) {
        setTimeLeft('Abgelaufen')
        return
      }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`)
    }
    update()
    const iv = setInterval(update, 1000)
    return () => clearInterval(iv)
  }, [endsAt])

  return (
    <motion.span
      className="font-mono text-xs font-bold tabular-nums px-2 py-0.5 rounded"
      style={{ background: 'rgba(0,0,0,0.08)' }}
      key={timeLeft}
      initial={{ scale: 1.05 }}
      animate={{ scale: 1 }}
      transition={{ duration: 0.15 }}
    >
      {timeLeft}
    </motion.span>
  )
}

/**
 * Animated promo banner — shows rotating deals with timed countdowns.
 * Dismissible. Auto-rotates every 5s. Slide + fade transitions.
 */
export function PromoBanner({ deals }: { deals: PromoDeal[] }) {
  const reduced = useReducedMotion()
  const [current, setCurrent] = useState(0)
  const [dismissed, setDismissed] = useState(false)

  const advance = useCallback(() => {
    setCurrent((c) => (c + 1) % deals.length)
  }, [deals.length])

  useEffect(() => {
    if (deals.length <= 1) return
    const iv = setInterval(advance, 5000)
    return () => clearInterval(iv)
  }, [advance, deals.length])

  if (dismissed || deals.length === 0) return null

  const deal = deals[current]
  const Icon = ICON_MAP[deal.type]
  const colors = COLOR_MAP[deal.type]

  return (
    <div
      className="relative overflow-hidden"
      style={{
        background: colors.bg,
        borderBottom: `1px solid ${colors.border}`,
      }}
    >
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-center gap-3 min-h-[40px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={deal.id}
            className="flex items-center gap-2.5 text-sm"
            initial={reduced ? {} : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? {} : { opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <Icon className="w-4 h-4 flex-shrink-0" style={{ color: colors.accent }} />
            <span className="font-semibold" style={{ color: colors.text }}>{deal.label}</span>
            <span className="hidden sm:inline" style={{ color: colors.text, opacity: 0.7 }}>
              {deal.description}
            </span>
            {deal.endsAt && <CountdownTimer endsAt={deal.endsAt} />}
            <a
              href={deal.href}
              className="flex items-center gap-0.5 font-semibold text-xs underline underline-offset-2"
              style={{ color: colors.accent }}
            >
              Ansehen <ChevronRight className="w-3 h-3" />
            </a>
          </motion.div>
        </AnimatePresence>

        {/* Dismiss */}
        <button
          onClick={() => setDismissed(true)}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-black/5 transition-colors"
          aria-label="Schließen"
        >
          <X className="w-3.5 h-3.5" style={{ color: colors.text, opacity: 0.5 }} />
        </button>
      </div>

      {/* Progress dots */}
      {deals.length > 1 && (
        <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-1">
          {deals.map((_, i) => (
            <div
              key={i}
              className="w-1 h-1 rounded-full transition-colors duration-200"
              style={{
                background: i === current ? colors.accent : `${colors.accent}33`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
