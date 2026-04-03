'use client'

/**
 * PromoStrip — Animated promotional banner strip.
 *
 * Used at the top of the homepage or PLP for time-limited offers,
 * flash sales, or trust messaging. Premium marketplace feel.
 *
 * Features:
 *   - Scrolling ticker animation
 *   - Respects prefers-reduced-motion
 *   - Customizable messages + accent color
 *   - Optional countdown timer
 */

import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Zap, Clock, Truck, ShieldCheck, Sparkles, Gift } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface PromoMessage {
  icon?: React.ElementType
  text: string
}

interface PromoStripProps {
  /** Override default messages */
  messages?: PromoMessage[]
  /** Background color */
  bg?: string
  /** Text color */
  color?: string
  /** Accent icon color */
  accent?: string
  /** Optional countdown target (ISO date string) */
  countdownTo?: string
  /** Speed in px/s for the ticker */
  speed?: number
}

// ─── Default messages ────────────────────────────────────────────────────────

const DEFAULT_MESSAGES: PromoMessage[] = [
  { icon: Truck,        text: 'Kostenloser Versand ab 50 \u20AC' },
  { icon: ShieldCheck,  text: 'Sichere Zahlung mit Stripe' },
  { icon: Gift,         text: '30 Tage Rückgaberecht' },
  { icon: Sparkles,     text: 'Neue Produkte täglich' },
  { icon: Zap,          text: 'Exklusive Angebote nur online' },
]

// ─── Countdown helper ────────────────────────────────────────────────────────

function useCountdown(target?: string) {
  const [remaining, setRemaining] = useState<string | null>(null)

  useEffect(() => {
    if (!target) return
    const end = new Date(target).getTime()

    const update = () => {
      const diff = Math.max(0, end - Date.now())
      if (diff === 0) { setRemaining(null); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setRemaining(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
    }

    update()
    const iv = setInterval(update, 1000)
    return () => clearInterval(iv)
  }, [target])

  return remaining
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PromoStrip({
  messages = DEFAULT_MESSAGES,
  bg = '#D97706',
  color = '#FFFFFF',
  accent = 'rgba(255,255,255,0.85)',
  countdownTo,
  speed = 40,
}: PromoStripProps) {
  const reducedMotion = useReducedMotion()
  const countdown = useCountdown(countdownTo)
  const containerRef = useRef<HTMLDivElement>(null)

  // Build the repeated ticker content
  const tickerItems = useMemo(() => {
    const items = countdown
      ? [{ icon: Clock, text: `Angebot endet in ${countdown}` }, ...messages]
      : messages
    // Repeat 4x for seamless loop
    return [...items, ...items, ...items, ...items]
  }, [messages, countdown])

  // Calculate animation duration based on content width
  const duration = useMemo(() => {
    const totalChars = messages.reduce((s, m) => s + m.text.length, 0) * 4
    return (totalChars * 8) / speed // Approximate char width = 8px
  }, [messages, speed])

  if (reducedMotion) {
    // Static fallback: show first 3 messages
    return (
      <div
        className="w-full overflow-hidden"
        style={{ background: bg, color }}
      >
        <div className="flex items-center justify-center gap-6 px-4 py-2">
          {messages.slice(0, 3).map((msg, i) => {
            const Icon = msg.icon
            return (
              <span key={i} className="flex items-center gap-1.5 text-xs font-medium whitespace-nowrap">
                {Icon && <Icon size={13} style={{ color: accent }} />}
                {msg.text}
              </span>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div
      className="w-full overflow-hidden"
      style={{ background: bg, color }}
      ref={containerRef}
    >
      <motion.div
        className="flex items-center gap-8 py-2 whitespace-nowrap"
        animate={{ x: ['0%', '-50%'] }}
        transition={{
          x: {
            repeat: Infinity,
            repeatType: 'loop',
            duration,
            ease: 'linear',
          },
        }}
      >
        {tickerItems.map((msg, i) => {
          const Icon = msg.icon
          return (
            <span
              key={i}
              className="flex items-center gap-1.5 text-xs font-medium shrink-0"
            >
              {Icon && <Icon size={13} style={{ color: accent }} />}
              {msg.text}
              <span className="mx-3 opacity-30">&bull;</span>
            </span>
          )
        })}
      </motion.div>
    </div>
  )
}

// ─── Flash Deal Banner ───────────────────────────────────────────────────────

interface FlashDealBannerProps {
  title?: string
  subtitle?: string
  countdownTo?: string
  bg?: string
}

export function FlashDealBanner({
  title = 'Flash Sale',
  subtitle = 'Nur für kurze Zeit — bis zu 50% Rabatt',
  countdownTo,
  bg,
}: FlashDealBannerProps) {
  const reducedMotion = useReducedMotion()
  const countdown = useCountdown(countdownTo)

  return (
    <motion.div
      initial={reducedMotion ? {} : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl p-5 sm:p-6"
      style={{
        background: bg ?? 'linear-gradient(135deg, #D97706 0%, #B45309 50%, #92400E 100%)',
      }}
    >
      {/* Shimmer effect */}
      {!reducedMotion && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)',
          }}
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 3, repeat: Infinity, repeatDelay: 2, ease: 'easeInOut' }}
        />
      )}

      <div className="relative z-10 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Zap size={18} className="text-white" fill="white" />
            <span className="text-white font-bold text-lg sm:text-xl">{title}</span>
          </div>
          <p className="text-white/80 text-sm">{subtitle}</p>
        </div>

        {countdown && (
          <div className="flex items-center gap-1.5">
            <Clock size={15} className="text-white/70" />
            <div className="flex gap-1">
              {countdown.split(':').map((unit, i) => (
                <span
                  key={i}
                  className="inline-flex items-center justify-center w-10 h-10 rounded-lg text-base font-bold"
                  style={{ background: 'rgba(0,0,0,0.3)', color: '#FFF' }}
                >
                  {unit}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ─── Urgency Chip ────────────────────────────────────────────────────────────

interface UrgencyChipProps {
  text: string
  variant?: 'hot' | 'ending' | 'new' | 'limited'
}

const URGENCY_STYLES: Record<string, { bg: string; color: string; icon: React.ElementType }> = {
  hot:     { bg: '#FEE2E2', color: '#DC2626', icon: Zap     },
  ending:  { bg: '#FEF3C7', color: '#D97706', icon: Clock   },
  new:     { bg: '#DBEAFE', color: '#2563EB', icon: Sparkles },
  limited: { bg: '#F3E8FF', color: '#7C3AED', icon: Gift    },
}

export function UrgencyChip({ text, variant = 'hot' }: UrgencyChipProps) {
  const reducedMotion = useReducedMotion()
  const style = URGENCY_STYLES[variant] ?? URGENCY_STYLES.hot
  const Icon = style.icon

  return (
    <motion.span
      initial={reducedMotion ? {} : { scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold"
      style={{ background: style.bg, color: style.color }}
    >
      <Icon size={12} />
      {text}
    </motion.span>
  )
}
