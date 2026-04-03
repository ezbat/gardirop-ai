'use client'

/**
 * ProductVariantSelector
 *
 * Renders one selector row per variant group:
 *  - type === 'color' → color swatch circles
 *  - else            → pill button
 *
 * Emits `onChange` with the group name and selected option label.
 * Gracefully skips groups with no options.
 */

import type { ProductVariantGroup, ProductVariantOption } from './types'

interface ProductVariantSelectorProps {
  variants:   ProductVariantGroup[]
  selected:   Record<string, string>       // { "Größe": "M", "Farbe": "Schwarz" }
  onChange:   (groupName: string, value: string) => void
  className?: string
}

function isColorHex(str?: string | null): str is string {
  return typeof str === 'string' && (str.startsWith('#') || str.startsWith('rgb'))
}

export function ProductVariantSelector({
  variants,
  selected,
  onChange,
  className = '',
}: ProductVariantSelectorProps) {
  if (!variants || variants.length === 0) return null

  return (
    <div className={`space-y-4 ${className}`}>
      {variants.map(group => {
        if (!group.options || group.options.length === 0) return null
        const isColor = group.type === 'color' ||
          group.options.some(o => isColorHex(o.colorHex))

        return (
          <div key={group.name}>
            {/* Group label + selected value */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[13px] font-semibold text-[#1A1A1A]">
                {group.name}:
              </span>
              {selected[group.name] && (
                <span className="text-[13px] text-[#6B7280]">
                  {selected[group.name]}
                </span>
              )}
            </div>

            {/* Options */}
            <div className="flex flex-wrap gap-2">
              {group.options.map(opt => {
                const isSelected = selected[group.name] === opt.label
                const unavailable = opt.available === false

                if (isColor && isColorHex(opt.colorHex)) {
                  // ── Color swatch ──────────────────────────────────────
                  return (
                    <button
                      key={opt.label}
                      title={opt.label}
                      disabled={unavailable}
                      onClick={() => !unavailable && onChange(group.name, opt.label)}
                      className={`
                        relative w-8 h-8 rounded-full border-2 transition-all duration-150 flex-shrink-0
                        ${isSelected
                          ? 'border-[#1A1A1A] scale-110 shadow-sm'
                          : 'border-transparent hover:scale-105'}
                        ${unavailable ? 'opacity-35 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                      style={{ backgroundColor: opt.colorHex! }}
                      aria-pressed={isSelected}
                      aria-label={opt.label}
                    >
                      {/* Ring on selected */}
                      {isSelected && (
                        <span className="absolute inset-[-4px] rounded-full border-2 border-[#1A1A1A] pointer-events-none" />
                      )}
                      {/* Strikethrough on unavailable */}
                      {unavailable && (
                        <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <span className="w-[110%] h-[2px] bg-white/80 rotate-45 block" />
                        </span>
                      )}
                    </button>
                  )
                }

                // ── Text pill ─────────────────────────────────────────
                return (
                  <button
                    key={opt.label}
                    disabled={unavailable}
                    onClick={() => !unavailable && onChange(group.name, opt.label)}
                    className={`
                      relative px-3.5 py-1.5 rounded-lg border text-[13px] font-medium
                      transition-all duration-150 select-none
                      ${isSelected
                        ? 'border-[#1A1A1A] bg-[#1A1A1A] text-white'
                        : 'border-[#E5E7EB] bg-white text-[#1A1A1A] hover:border-[#9CA3AF]'}
                      ${unavailable ? 'opacity-35 cursor-not-allowed line-through' : 'cursor-pointer'}
                    `}
                    aria-pressed={isSelected}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
