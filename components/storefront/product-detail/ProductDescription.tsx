'use client'

/**
 * ProductDescription
 *
 * Renders the freeform product description with a "Mehr anzeigen" collapse
 * when the text is long.  Preserves paragraph breaks (double-newline → <p>)
 * and single newlines (→ <br>).
 *
 * Cutoff: 300 characters (configurable via CUTOFF const).
 */

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'

// ─── Constants ────────────────────────────────────────────────────────────────

const CUTOFF = 300 // characters before "Mehr anzeigen" kicks in

// ─── Props ────────────────────────────────────────────────────────────────────

interface ProductDescriptionProps {
  description: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Split text by double-newlines → paragraphs.
 * Within each paragraph replace single newlines with <br>.
 */
function renderParagraphs(text: string) {
  const paras = text.split(/\n{2,}/).filter(Boolean)
  return paras.map((para, i) => (
    <p key={i} className="text-[15px] leading-relaxed text-[#374151]">
      {para.split('\n').map((line, j) => (
        <span key={j}>
          {line}
          {j < para.split('\n').length - 1 && <br />}
        </span>
      ))}
    </p>
  ))
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProductDescription({ description }: ProductDescriptionProps) {
  const prefersReduced = useReducedMotion()
  const isLong = description.length > CUTOFF
  const [expanded, setExpanded] = useState(false)

  // Truncated preview text (plain, cut at word boundary)
  const previewText = isLong && !expanded
    ? (() => {
        const slice = description.slice(0, CUTOFF)
        const lastSpace = slice.lastIndexOf(' ')
        return (lastSpace > CUTOFF * 0.7 ? slice.slice(0, lastSpace) : slice) + '…'
      })()
    : description

  return (
    <section aria-label="Produktbeschreibung">
      {/* Section header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="h-5 w-1 rounded-full bg-[#D97706]" aria-hidden="true" />
        <h2 className="text-[18px] font-bold text-[#1A1A1A] tracking-tight">
          Produktbeschreibung
        </h2>
      </div>

      {/* Description body */}
      <div className="relative">
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={expanded ? 'full' : 'preview'}
            initial={prefersReduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={prefersReduced ? undefined : { opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="space-y-3"
          >
            {renderParagraphs(previewText)}
          </motion.div>
        </AnimatePresence>

        {/* Fade-out overlay when collapsed */}
        {isLong && !expanded && (
          <div
            className="absolute bottom-0 left-0 right-0 h-12 pointer-events-none"
            style={{
              background: 'linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.95) 100%)',
            }}
            aria-hidden="true"
          />
        )}
      </div>

      {/* Toggle button */}
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold
            text-[#D97706] hover:text-[#B45309] transition-colors focus-visible:outline-none
            focus-visible:ring-2 focus-visible:ring-[#D97706] focus-visible:ring-offset-2 rounded"
          aria-expanded={expanded}
        >
          {expanded ? (
            <>
              Weniger anzeigen
              <ChevronUp className="w-4 h-4" />
            </>
          ) : (
            <>
              Mehr anzeigen
              <ChevronDown className="w-4 h-4" />
            </>
          )}
        </button>
      )}
    </section>
  )
}
