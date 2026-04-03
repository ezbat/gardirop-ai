'use client'

/**
 * CategoryGrid — Editorial category discovery.
 *
 * Larger tiles with gradient backgrounds and prominent icons.
 * Not a tiny icon grid — each category gets breathing room.
 */

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

// Map category slugs to icons
const ICON_MAP: Record<string, any> = {
  technik: Laptop, elektronik: Laptop,
  haushalt: Home, küche: Home, haus: Home,
  mode: Shirt, oberbekleidung: Shirt, kleid: Shirt,
  beauty: Sparkles, kosmetik: Sparkles,
  sport: Dumbbell, sportbekleidung: Dumbbell,
  schuhe: Footprints,
  auto: Car, motorrad: Car,
  spielzeug: Gamepad2, gaming: Gamepad2,
  büro: Briefcase,
  accessoires: Watch, schmuck: Watch,
  bücher: BookOpen,
  baby: Baby,
}

// Gradient palette — warm, premium, varied
const GRADIENTS = [
  'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
  'linear-gradient(135deg, #2d1b33 0%, #1a1a2e 100%)',
  'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
  'linear-gradient(135deg, #27241d 0%, #1c1917 100%)',
  'linear-gradient(135deg, #1a2332 0%, #0c1017 100%)',
  'linear-gradient(135deg, #1f2937 0%, #111827 100%)',
  'linear-gradient(135deg, #292524 0%, #1c1917 100%)',
  'linear-gradient(135deg, #1e1b4b 0%, #0f0e26 100%)',
]

const ACCENTS = [
  '#D97706', '#EC4899', '#6366F1', '#10B981',
  '#F59E0B', '#8B5CF6', '#EF4444', '#3B82F6',
]

// Map Turkish/legacy category names to German
const NAME_MAP: Record<string, string> = {
  'Üst Giyim': 'Oberbekleidung', 'Alt Giyim': 'Unterbekleidung',
  'Dış Giyim': 'Jacken & Mäntel', 'Spor Giyim': 'Sportbekleidung',
  'Ayakkabı': 'Schuhe', 'Aksesuar': 'Accessoires',
  'Çanta': 'Taschen', 'Takı': 'Schmuck',
  'Gözlük': 'Brillen', 'Şapka': 'Hüte & Mützen',
  'Elbise': 'Kleider', 'Gömlek': 'Hemden',
  'Pantolon': 'Hosen', 'Etek': 'Röcke',
  'Tişört': 'T-Shirts', 'Kazak': 'Pullover',
  'Mont': 'Jacken', 'Ceket': 'Blazer',
  'Pijama': 'Schlafbekleidung', 'İç Giyim': 'Unterwäsche',
  'Mayo': 'Bademode',
}

function getCategoryIcon(slug: string) {
  const key = Object.keys(ICON_MAP).find((k) => slug.toLowerCase().includes(k))
  return key ? ICON_MAP[key] : ShoppingBag
}

function translateCategoryName(name: string): string {
  return NAME_MAP[name] || name
}

export function CategoryGrid({ categories }: CategoryGridProps) {
  const prefersReduced = useReducedMotion()

  if (!categories.length) return null

  return (
    <section className="py-10" style={{ background: '#080A10' }}>
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold" style={{ color: '#FFFFFF' }}>
              Nach Kategorie entdecken
            </h2>
            <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.6)' }}>
              Finde genau das, was du suchst
            </p>
          </div>
          <Link
            href="/categories"
            className="text-xs font-semibold transition-opacity hover:opacity-70"
            style={{ color: '#D97706' }}
          >
            Alle anzeigen →
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {categories.slice(0, 12).map((cat, i) => {
            const Icon = getCategoryIcon(cat.slug)
            const accent = ACCENTS[i % ACCENTS.length]
            const gradient = GRADIENTS[i % GRADIENTS.length]

            return (
              <motion.div
                key={cat.slug}
                initial={prefersReduced ? {} : { opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-20px' }}
                transition={{ duration: 0.25, delay: prefersReduced ? 0 : i * 0.04 }}
              >
                <Link
                  href={`/store?cat=${encodeURIComponent(cat.slug)}`}
                  className="group relative flex flex-col items-center justify-center gap-2.5
                    aspect-[4/3] rounded-xl overflow-hidden
                    transition-all duration-200 hover:scale-[1.03] hover:shadow-lg
                    active:scale-[0.98]"
                  style={{ background: gradient }}
                >
                  {/* Accent glow */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      background: `radial-gradient(circle at center, ${accent}18 0%, transparent 70%)`,
                    }}
                  />

                  <div className="relative z-10 flex flex-col items-center gap-2">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center
                        transition-transform duration-200 group-hover:scale-110"
                      style={{ background: `${accent}20` }}
                    >
                      <Icon className="w-5 h-5" style={{ color: accent }} />
                    </div>
                    <span
                      className="text-[11px] font-semibold text-center leading-tight"
                      style={{ color: 'rgba(255,255,255,0.75)' }}
                    >
                      {translateCategoryName(cat.name)}
                    </span>
                    {cat.count != null && cat.count > 0 && (
                      <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.55)' }}>
                        {cat.count} {cat.count === 1 ? 'Produkt' : 'Produkte'}
                      </span>
                    )}
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
