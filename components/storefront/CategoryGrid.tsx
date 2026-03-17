'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Laptop, Home, Shirt, Sparkles, Dumbbell, Footprints,
  Car, Gamepad2, Briefcase, Watch, BookOpen, Baby,
  ShoppingBag,
} from 'lucide-react'

export interface CategoryItem {
  name: string
  slug: string
  count?: number
}

interface CategoryGridProps {
  categories: CategoryItem[]
}

// Map German category names (or partial slugs) to icons
const ICON_MAP: Record<string, any> = {
  technik:         Laptop,
  elektronik:      Laptop,
  haushalt:        Home,
  küche:           Home,
  haus:            Home,
  mode:            Shirt,
  oberbekleidung:  Shirt,
  kleid:           Shirt,
  beauty:          Sparkles,
  kosmetik:        Sparkles,
  sport:           Dumbbell,
  sportbekleidung: Dumbbell,
  schuhe:          Footprints,
  auto:            Car,
  motorrad:        Car,
  spielzeug:       Gamepad2,
  gaming:          Gamepad2,
  büro:            Briefcase,
  accessoires:     Watch,
  schmuck:         Watch,
  bücher:          BookOpen,
  baby:            Baby,
}

const PALETTE = [
  '#1D4ED8', '#D97706', '#16A34A', '#DC2626',
  '#7C3AED', '#DB2777', '#0891B2', '#EA580C',
  '#65A30D', '#0284C7', '#9333EA', '#B45309',
]

function getCategoryIcon(slug: string) {
  const key = Object.keys(ICON_MAP).find((k) => slug.includes(k))
  return key ? ICON_MAP[key] : ShoppingBag
}

function getCategoryColor(index: number) {
  return PALETTE[index % PALETTE.length]
}

export function CategoryGrid({ categories }: CategoryGridProps) {
  const prefersReduced = useReducedMotion()

  if (!categories.length) return null

  return (
    <section className="py-[32px]" style={{ background: '#FAFAFA' }}>
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <h2
          className="text-[18px] font-bold mb-[20px]"
          style={{ color: '#1A1A1A' }}
        >
          Nach Kategorie stöbern
        </h2>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-[10px] md:gap-[14px]">
          {categories.slice(0, 12).map((cat, i) => {
            const Icon = getCategoryIcon(cat.slug)
            const color = getCategoryColor(i)

            return (
              <motion.div
                key={cat.slug}
                initial={prefersReduced ? {} : { opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: '-20px' }}
                transition={{ duration: 0.22, delay: prefersReduced ? 0 : i * 0.04 }}
              >
                <Link
                  href={`/store?cat=${encodeURIComponent(cat.slug)}`}
                  className="flex flex-col items-center gap-[8px] p-[10px] rounded-[10px]
                    transition-all duration-150 hover:scale-[1.04] hover:shadow-md
                    active:scale-[0.98]"
                  style={{ background: '#FFFFFF', border: '1px solid #F0F0F0' }}
                >
                  <div
                    className="w-[48px] h-[48px] rounded-[12px] flex items-center justify-center"
                    style={{ background: `${color}14` }}
                  >
                    <Icon className="w-[22px] h-[22px]" style={{ color }} />
                  </div>
                  <span
                    className="text-[10px] font-semibold text-center leading-tight line-clamp-2"
                    style={{ color: '#333' }}
                  >
                    {cat.name}
                  </span>
                </Link>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
