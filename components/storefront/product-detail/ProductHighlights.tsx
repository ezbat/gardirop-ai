/**
 * ProductHighlights
 *
 * Renders up to 6 at-a-glance product highlights derived from the `attributes`
 * JSONB column plus optional brand / isNew meta.
 *
 * Design: 2-column grid of icon + label + value pills, clean white section with
 * a subtle left-accent line.  Pure display — no state, no client boundary.
 */

import {
  CheckCircle2,
  Shield,
  Ruler,
  Package,
  Palette,
  Weight,
  Truck,
  Droplets,
  BadgeCheck,
  Flame,
  Leaf,
  Cpu,
  Star,
} from 'lucide-react'
import type { ReactNode } from 'react'

// ─── Props ────────────────────────────────────────────────────────────────────

interface ProductHighlightsProps {
  attributes: Record<string, string | number | boolean>
  brand?: string | null
  isNew?: boolean
}

// ─── Icon resolver ────────────────────────────────────────────────────────────

function iconForKey(key: string): ReactNode {
  const k = key.toLowerCase()
  const cls = 'w-4 h-4 flex-shrink-0'

  if (/material|stoff|fabric|gewebe/.test(k))      return <Package  className={cls} />
  if (/color|colour|farbe|colour/.test(k))          return <Palette  className={cls} />
  if (/size|größe|dimension|abmessung|maß/.test(k)) return <Ruler    className={cls} />
  if (/weight|gewicht|gramm|kg/.test(k))            return <Weight   className={cls} />
  if (/water|wasser|proof|dicht/.test(k))           return <Droplets className={cls} />
  if (/garantie|warranty|guarantee/.test(k))        return <Shield   className={cls} />
  if (/versand|shipping|lieferung/.test(k))         return <Truck    className={cls} />
  if (/zertifiz|certif|öko|eco|bio/.test(k))        return <Leaf     className={cls} />
  if (/tech|prozessor|chip|cpu|ghz|ram/.test(k))    return <Cpu      className={cls} />
  if (/marke|brand/.test(k))                        return <Star     className={cls} />
  if (/neu|new|frisch|fresh/.test(k))               return <Flame    className={cls} />
  if (/geprüft|approved|verifiziert/.test(k))       return <BadgeCheck className={cls} />

  return <CheckCircle2 className={cls} />
}

// ─── Label formatter ──────────────────────────────────────────────────────────

/** Convert snake_case / camelCase / PascalCase → "Title Case With Spaces" */
function humaniseKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')       // camel → spaces
    .replace(/[_-]+/g, ' ')            // snake / kebab → spaces
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\w/, c => c.toUpperCase())
}

/** Format a boolean or generic value into readable German */
function humaniseValue(val: string | number | boolean): string {
  if (typeof val === 'boolean') return val ? 'Ja' : 'Nein'
  if (typeof val === 'number')  return String(val)
  return String(val)
}

// ─── Single Highlight Item ────────────────────────────────────────────────────

function HighlightItem({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3 py-3 px-4 rounded-xl bg-[#FAFAFA] border border-[#F0F0F0]">
      <span className="mt-0.5 text-[#D97706]">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF] leading-none mb-0.5">
          {label}
        </p>
        <p className="text-[13px] font-medium text-[#1A1A1A] leading-snug break-words">
          {value}
        </p>
      </div>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProductHighlights({
  attributes,
  brand,
  isNew,
}: ProductHighlightsProps) {
  // Build highlight items: attributes first, capped at 6 total
  const items: { key: string; label: string; value: string }[] = []

  // Inject brand as a highlight if provided and not already in attributes
  const attrKeys = Object.keys(attributes).map(k => k.toLowerCase())
  if (brand && !attrKeys.some(k => /marke|brand/.test(k))) {
    items.push({ key: '__brand__', label: 'Marke', value: brand })
  }

  // Inject "Neu" if flagged and not already in attributes
  if (isNew && !attrKeys.some(k => /neu|new/.test(k))) {
    items.push({ key: '__new__', label: 'Zustand', value: 'Neu eingetroffen' })
  }

  // Remaining slots from real attributes
  const remaining = 6 - items.length
  let filled = 0
  for (const [key, val] of Object.entries(attributes)) {
    if (filled >= remaining) break
    const label = humaniseKey(key)
    const value = humaniseValue(val)
    if (!label || !value) continue
    items.push({ key, label, value })
    filled++
  }

  if (items.length === 0) return null

  return (
    <section aria-label="Produkt-Highlights">
      {/* Section header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="h-5 w-1 rounded-full bg-[#D97706]" aria-hidden="true" />
        <h2 className="text-[18px] font-bold text-[#1A1A1A] tracking-tight">
          Highlights
        </h2>
      </div>

      {/* Grid: 1 col on xs, 2 col from sm+ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map(({ key, label, value }) => (
          <HighlightItem
            key={key}
            icon={iconForKey(key === '__brand__' ? 'brand' : key === '__new__' ? 'new' : key)}
            label={label}
            value={value}
          />
        ))}
      </div>
    </section>
  )
}
