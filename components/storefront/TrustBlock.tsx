'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { ShieldCheck, CreditCard } from 'lucide-react'

const PAYMENT_METHODS = [
  { name: 'Visa', abbr: 'VISA' },
  { name: 'Mastercard', abbr: 'MC' },
  { name: 'PayPal', abbr: 'PP' },
  { name: 'Klarna', abbr: 'KL' },
  { name: 'Apple Pay', abbr: 'AP' },
  { name: 'Google Pay', abbr: 'GP' },
]

const TRUST_BADGES = [
  { icon: ShieldCheck, label: 'SSL-verschlüsselt' },
  { icon: CreditCard, label: 'Stripe Secure' },
]

export function TrustBlock() {
  const prefersReduced = useReducedMotion()

  return (
    <motion.section
      initial={prefersReduced ? {} : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35 }}
      className="py-[40px]"
      style={{ background: '#131921' }}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* Trust badges */}
        <div className="flex flex-wrap items-center justify-center gap-[20px] mb-[28px]">
          {TRUST_BADGES.map((b) => {
            const Icon = b.icon
            return (
              <div key={b.label} className="flex items-center gap-[6px]">
                <Icon className="w-[16px] h-[16px]" style={{ color: '#D97706' }} />
                <span className="text-[12px] font-medium" style={{ color: 'rgba(255,255,255,0.65)' }}>
                  {b.label}
                </span>
              </div>
            )
          })}
        </div>

        {/* Payment methods */}
        <div className="flex flex-wrap items-center justify-center gap-[8px] mb-[28px]">
          {PAYMENT_METHODS.map((pm) => (
            <div
              key={pm.abbr}
              className="px-[12px] py-[6px] rounded-[5px] text-[10px] font-bold"
              style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}
            >
              {pm.name}
            </div>
          ))}
        </div>

        {/* Policy links */}
        <div className="flex flex-wrap items-center justify-center gap-[16px]">
          {[
            { label: 'Datenschutz', href: '/datenschutz' },
            { label: 'AGB', href: '/agb' },
            { label: 'Impressum', href: '/impressum' },
            { label: 'Widerrufsrecht', href: '/widerruf' },
            { label: 'Cookies', href: '/cookies' },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-[11px] transition-colors"
              style={{ color: 'rgba(255,255,255,0.35)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <p className="text-center mt-[20px] text-[10px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
          © {new Date().getFullYear()} WEARO. Alle Rechte vorbehalten.
        </p>
      </div>
    </motion.section>
  )
}
