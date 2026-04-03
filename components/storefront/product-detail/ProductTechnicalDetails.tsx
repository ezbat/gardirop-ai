/**
 * ProductTechnicalDetails
 *
 * Renders a clean definition-list table of all product technical data:
 *   • All key-value pairs from the `attributes` JSONB column
 *   • Fixed meta rows: Brand, Category, SKU, Hinzugefügt am
 *
 * Pure display component — no client boundary required.
 * Design: striped rows, full-bleed on mobile, card on desktop.
 */

// ─── Props ────────────────────────────────────────────────────────────────────

interface ProductTechnicalDetailsProps {
  attributes: Record<string, string | number | boolean> | null
  sku:       string | null
  brand:     string | null
  category:  string | null
  createdAt: string         // ISO timestamp
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convert snake_case / camelCase / PascalCase → "Sentence case" */
function humaniseKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\w/, c => c.toUpperCase())
}

function humaniseValue(val: string | number | boolean): string {
  if (typeof val === 'boolean') return val ? 'Ja' : 'Nein'
  return String(val)
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('de-DE', {
      day:   '2-digit',
      month: 'long',
      year:  'numeric',
    }).format(new Date(iso))
  } catch {
    return iso.slice(0, 10)
  }
}

// ─── Row component ────────────────────────────────────────────────────────────

function Row({
  label,
  value,
  even,
}: {
  label: string
  value: string
  even: boolean
}) {
  return (
    <div
      className={`grid grid-cols-[140px_1fr] sm:grid-cols-[180px_1fr] gap-x-4 gap-y-0
        px-4 py-3 ${even ? 'bg-[#FAFAFA]' : 'bg-white'}`}
    >
      <dt className="text-[12px] font-semibold text-[#9CA3AF] uppercase tracking-wide self-start pt-px">
        {label}
      </dt>
      <dd className="text-[13px] font-medium text-[#1A1A1A] break-words">
        {value}
      </dd>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProductTechnicalDetails({
  attributes,
  sku,
  brand,
  category,
  createdAt,
}: ProductTechnicalDetailsProps) {

  // Build ordered rows: attribute entries first, then fixed meta
  const rows: { label: string; value: string }[] = []

  // 1. Dynamic attributes
  if (attributes) {
    for (const [key, val] of Object.entries(attributes)) {
      const label = humaniseKey(key)
      const value = humaniseValue(val)
      if (label && value) rows.push({ label, value })
    }
  }

  // 2. Fixed meta rows (only when not already present in attributes)
  const attrLabels = rows.map(r => r.label.toLowerCase())

  if (brand && !attrLabels.some(l => /marke|brand/.test(l))) {
    rows.push({ label: 'Marke', value: brand })
  }
  if (category && !attrLabels.some(l => /kategorie|category/.test(l))) {
    rows.push({ label: 'Kategorie', value: category })
  }
  if (sku) {
    rows.push({ label: 'Artikelnummer', value: sku })
  }
  rows.push({ label: 'Hinzugefügt am', value: formatDate(createdAt) })

  if (rows.length === 0) return null

  return (
    <section aria-label="Technische Details">
      {/* Section header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="h-5 w-1 rounded-full bg-[#D97706]" aria-hidden="true" />
        <h2 className="text-[18px] font-bold text-[#1A1A1A] tracking-tight">
          Technische Details
        </h2>
      </div>

      {/* Table card */}
      <div className="overflow-hidden rounded-xl border border-[#F0F0F0]">
        <dl>
          {rows.map(({ label, value }, i) => (
            <Row key={label + i} label={label} value={value} even={i % 2 === 0} />
          ))}
        </dl>
      </div>
    </section>
  )
}
