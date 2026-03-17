'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { Lock, Truck, RotateCcw, Headphones } from 'lucide-react'

const PROPS = [
  {
    icon: Lock,
    title: 'Sichere Zahlung',
    desc: 'Verschlüsselt mit Stripe',
    color: '#16A34A',
  },
  {
    icon: Truck,
    title: 'Schneller Versand',
    desc: 'Kostenlos ab €50 Bestellwert',
    color: '#2563EB',
  },
  {
    icon: RotateCcw,
    title: '30 Tage Rückgabe',
    desc: 'Einfach & kostenlos zurücksenden',
    color: '#D97706',
  },
  {
    icon: Headphones,
    title: 'Kundensupport',
    desc: 'Mo–Sa, 9–18 Uhr erreichbar',
    color: '#7C3AED',
  },
]

export function ValueProps() {
  const prefersReduced = useReducedMotion()

  return (
    <section className="py-[18px]" style={{ background: '#FFFFFF', borderBottom: '1px solid #F0F0F0' }}>
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-[12px]">
          {PROPS.map((p, i) => {
            const Icon = p.icon
            return (
              <motion.div
                key={p.title}
                initial={prefersReduced ? {} : { opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.28, delay: prefersReduced ? 0 : i * 0.06 }}
                className="flex items-center gap-[10px] px-[12px] py-[10px] rounded-[8px]"
                style={{ background: '#FAFAFA', border: '1px solid #F0F0F0' }}
              >
                <div
                  className="w-[36px] h-[36px] rounded-[8px] flex items-center justify-center flex-shrink-0"
                  style={{ background: `${p.color}14` }}
                >
                  <Icon className="w-[17px] h-[17px]" style={{ color: p.color }} />
                </div>
                <div>
                  <p className="text-[12px] font-bold leading-none mb-[2px]" style={{ color: '#1A1A1A' }}>
                    {p.title}
                  </p>
                  <p className="text-[10px]" style={{ color: '#888' }}>
                    {p.desc}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
