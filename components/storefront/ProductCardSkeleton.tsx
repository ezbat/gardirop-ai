'use client'

/** Pulse skeleton matching ProductCard proportions. */
export function ProductCardSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`flex flex-col bg-white border border-[#F0F0F0] overflow-hidden
        ${compact ? 'rounded-[8px]' : 'rounded-[10px]'}`}
    >
      <div className="aspect-[3/4] bg-[#F0F0F0] animate-pulse" />
      <div className={`flex flex-col gap-[6px] ${compact ? 'p-[8px]' : 'p-[10px]'}`}>
        <div className="h-[9px] w-1/3 rounded bg-[#F4F4F4] animate-pulse" />
        <div className="h-[12px] w-full rounded bg-[#F0F0F0] animate-pulse" />
        <div className="h-[12px] w-3/4 rounded bg-[#F0F0F0] animate-pulse" />
        <div className="h-[9px] w-1/4 rounded bg-[#EAEAEA] animate-pulse mt-[2px]" />
        <div className="h-[13px] w-1/3 rounded bg-[#EAEAEA] animate-pulse mt-[2px]" />
      </div>
    </div>
  )
}

/** Skeleton for ProductCardFeatured — taller aspect ratio. */
export function ProductCardFeaturedSkeleton() {
  return (
    <div className="flex flex-col bg-white border border-[#F0F0F0] overflow-hidden rounded-[14px]">
      <div className="aspect-[4/5] bg-[#F0F0F0] animate-pulse" />
      <div className="flex flex-col gap-[7px] p-[14px]">
        <div className="h-[9px] w-1/3 rounded bg-[#F4F4F4] animate-pulse" />
        <div className="h-[14px] w-full rounded bg-[#F0F0F0] animate-pulse" />
        <div className="h-[14px] w-2/3 rounded bg-[#F0F0F0] animate-pulse" />
        <div className="h-[11px] w-1/4 rounded bg-[#EAEAEA] animate-pulse mt-[2px]" />
        <div className="h-[15px] w-1/3 rounded bg-[#EAEAEA] animate-pulse mt-[4px]" />
      </div>
    </div>
  )
}

/** Skeleton for ProductCardHorizontal. */
export function ProductCardHorizontalSkeleton() {
  return (
    <div className="flex items-stretch gap-[12px] p-[10px] rounded-[10px] bg-white border border-[#F0F0F0]">
      <div className="w-[72px] h-[92px] flex-shrink-0 rounded-[7px] bg-[#F0F0F0] animate-pulse" />
      <div className="flex-1 flex flex-col justify-between py-[2px]">
        <div className="flex flex-col gap-[6px]">
          <div className="h-[9px] w-1/3 rounded bg-[#F4F4F4] animate-pulse" />
          <div className="h-[12px] w-full rounded bg-[#F0F0F0] animate-pulse" />
          <div className="h-[12px] w-2/3 rounded bg-[#F0F0F0] animate-pulse" />
        </div>
        <div className="h-[13px] w-1/3 rounded bg-[#EAEAEA] animate-pulse" />
      </div>
    </div>
  )
}

/** Grid of N default skeletons. */
export function ProductCardSkeletonRow({
  count = 4,
  compact = false,
}: {
  count?: number
  compact?: boolean
}) {
  return (
    <div
      className={`grid gap-[12px] ${
        compact
          ? 'grid-cols-[repeat(auto-fill,minmax(120px,1fr))]'
          : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
      }`}
    >
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} compact={compact} />
      ))}
    </div>
  )
}

/** Section title + skeleton row. */
export function ProductCardSkeletonSection({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-[16px]">
      <div className="h-[22px] w-[180px] rounded bg-[#F0F0F0] animate-pulse" />
      <ProductCardSkeletonRow count={count} />
    </div>
  )
}
