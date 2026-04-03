/**
 * ProductDetailSkeleton
 *
 * Loading skeleton that mirrors the PDP layout.
 * Used inside a React Suspense boundary or during data-loading states.
 *
 * Structure:
 *  • Breadcrumb bar
 *  • 5-column grid: gallery (3 cols) + context + buy box (2 cols)
 *  • Below-fold: 3 content section placeholders
 *
 * No client boundary needed — all divs with Tailwind pulse animation.
 */

// ─── Primitive ────────────────────────────────────────────────────────────────

function Bone({
  className = '',
  style,
}: {
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-[#F0F0F0] ${className}`}
      style={style}
      aria-hidden="true"
    />
  )
}

// ─── Gallery Skeleton ─────────────────────────────────────────────────────────

function GallerySkeleton() {
  return (
    <div className="flex gap-3">
      {/* Thumbnail rail (desktop only) */}
      <div className="hidden sm:flex flex-col gap-2 flex-shrink-0" style={{ width: 72 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Bone key={i} className="rounded-lg aspect-square w-full" />
        ))}
      </div>

      {/* Main image */}
      <Bone className="flex-1 rounded-xl aspect-square" />
    </div>
  )
}

// ─── Buy Box Skeleton ─────────────────────────────────────────────────────────

function BuyBoxSkeleton() {
  return (
    <div className="space-y-4">
      {/* Brand + category */}
      <Bone className="h-3 w-1/3" />

      {/* Title */}
      <div className="space-y-2">
        <Bone className="h-6 w-full" />
        <Bone className="h-6 w-3/4" />
      </div>

      {/* Badges */}
      <div className="flex gap-2">
        <Bone className="h-5 w-12 rounded-full" />
        <Bone className="h-5 w-16 rounded-full" />
      </div>

      {/* Rating */}
      <Bone className="h-4 w-32" />

      {/* Price block */}
      <div className="mt-2 space-y-1.5">
        <Bone className="h-8 w-36" />
        <Bone className="h-4 w-24" />
      </div>

      {/* Divider */}
      <Bone className="h-px w-full rounded-none" style={{ background: '#F0F0F0' }} />

      {/* Variant selector */}
      <div className="space-y-2">
        <Bone className="h-3.5 w-20" />
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Bone key={i} className="h-9 w-16 rounded-lg" />
          ))}
        </div>
      </div>

      {/* Quantity + CTA */}
      <div className="flex gap-2 mt-4">
        <Bone className="h-11 w-28 rounded-xl" />
        <Bone className="h-11 flex-1 rounded-xl" />
      </div>
      <Bone className="h-11 w-full rounded-xl" />

      {/* Trust pills */}
      <div className="flex gap-2 mt-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Bone key={i} className="h-8 flex-1 rounded-lg" />
        ))}
      </div>

      {/* Seller card */}
      <div className="mt-4 flex items-center gap-3 p-3 border border-[#F0F0F0] rounded-xl">
        <Bone className="h-10 w-10 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Bone className="h-3.5 w-24" />
          <Bone className="h-3 w-16" />
        </div>
        <Bone className="h-8 w-20 rounded-lg" />
      </div>
    </div>
  )
}

// ─── Below-fold section skeleton ──────────────────────────────────────────────

function SectionSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center gap-3">
        <Bone className="h-5 w-1 rounded-full" style={{ width: 4 }} />
        <Bone className="h-5 w-40" />
      </div>
      {/* Rows */}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Bone key={i} className="h-4" style={{ width: `${75 + (i % 3) * 10}%` }} />
        ))}
      </div>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProductDetailSkeleton() {
  return (
    <div className="min-h-screen bg-white">
      {/* Breadcrumb */}
      <div className="border-b border-[#F0F0F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-2">
          <Bone className="h-3 w-16" />
          <Bone className="h-3 w-3 rounded-full" />
          <Bone className="h-3 w-24" />
          <Bone className="h-3 w-3 rounded-full" />
          <Bone className="h-3 w-40" />
        </div>
      </div>

      {/* Main product zone */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 lg:py-10">

        {/* 5-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 xl:gap-12">

          {/* Gallery */}
          <div className="lg:col-span-3">
            <GallerySkeleton />

            {/* Mobile thumbnail strip */}
            <div className="flex sm:hidden gap-2 mt-3 justify-center">
              {Array.from({ length: 5 }).map((_, i) => (
                <Bone key={i} className="h-14 w-14 rounded-lg flex-shrink-0" />
              ))}
            </div>
          </div>

          {/* Context + buy box */}
          <div className="lg:col-span-2">
            <BuyBoxSkeleton />
          </div>
        </div>

        {/* Below-fold sections */}
        <div className="mt-14 lg:mt-20 space-y-12">
          <SectionSkeleton rows={6} />
          <SectionSkeleton rows={8} />
          <SectionSkeleton rows={4} />
        </div>
      </div>
    </div>
  )
}
