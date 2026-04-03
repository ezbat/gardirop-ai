/**
 * /products/[id] — Product Detail Page (PDP)
 *
 * Server Component: all above-the-fold data fetched server-side for fast
 * first paint and proper SEO.  Interactive shells (gallery, buy box, etc.)
 * are "use client" sub-components that receive the pre-fetched DTO as props.
 */

import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { supabaseAdmin } from '@/lib/supabase-admin'

// PDP sub-components
import { ProductGallery }          from '@/components/storefront/product-detail/ProductGallery'
import { ProductBuyBox }           from '@/components/storefront/product-detail/ProductBuyBox'
import { ProductHighlights }       from '@/components/storefront/product-detail/ProductHighlights'
import { ProductDescription }      from '@/components/storefront/product-detail/ProductDescription'
import { ProductTechnicalDetails } from '@/components/storefront/product-detail/ProductTechnicalDetails'
import { RelatedProducts }         from '@/components/storefront/product-detail/RelatedProducts'
import { ProductDetailSkeleton }   from '@/components/storefront/product-detail/ProductDetailSkeleton'

import type {
  ProductDetailDTO,
  ProductVariantGroup,
  RelatedProductDTO,
} from '@/components/storefront/product-detail/types'

// Reviews component (existing, works with /api/reviews)
import ProductReviews from '@/components/product-reviews'
import TrackEvent from '@/components/TrackEvent'

// ─── Params type ──────────────────────────────────────────────────────────────
type PageParams = { params: Promise<{ id: string }> | { id: string } }

// ─── SEO Metadata ─────────────────────────────────────────────────────────────
export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { id } = (
    params instanceof Promise ? await params : params
  ) as { id: string }

  const { data: p } = await supabaseAdmin
    .from('products')
    .select('title, description, images, category')
    .eq('id', id)
    .eq('moderation_status', 'approved')
    .maybeSingle()

  if (!p) return { title: 'Produkt nicht gefunden' }

  const title = p.title
  const desc  = (p.description as string | null)?.slice(0, 160) ?? `${p.title} kaufen auf WEARO.`
  const img   = Array.isArray(p.images) ? (p.images as string[])[0] : undefined

  return {
    title: `${title} | WEARO`,
    description: desc,
    openGraph: {
      title,
      description: desc,
      images: img ? [{ url: img, width: 1200, height: 1200 }] : [],
      type: 'website',
    },
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .trim()
    .replace(/\s+/g, '-')
}

// ─── Data helpers ─────────────────────────────────────────────────────────────

function computeDiscount(price: number, compareAt: number | null) {
  if (!compareAt || compareAt <= price) return { discountPercent: null, savings: null }
  const pct = Math.round((1 - price / compareAt) * 100)
  return {
    discountPercent: pct > 0 ? pct : null,
    savings: Math.round((compareAt - price) * 100) / 100,
  }
}

function parseVariants(raw: unknown): ProductVariantGroup[] | null {
  if (!raw || typeof raw !== 'object') return null

  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === 'object' && raw[0] !== null) {
    try {
      return (raw as Array<Record<string, unknown>>).map(g => ({
        name:    String(g.name ?? 'Optionen'),
        type:    g.type as string | undefined,
        options: Array.isArray(g.options)
          ? g.options.map((o: unknown) => {
              if (typeof o === 'string') return { label: o }
              if (typeof o === 'object' && o !== null) {
                const op = o as Record<string, unknown>
                return {
                  label:    String(op.label ?? op.value ?? ''),
                  colorHex: op.color ? String(op.color) : undefined,
                  available: op.available as boolean | undefined,
                }
              }
              return { label: String(o) }
            })
          : [],
      }))
    } catch { return null }
  }

  if (!Array.isArray(raw)) {
    const groups: ProductVariantGroup[] = []
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      if (!Array.isArray(value) || value.length === 0) continue
      const isColor = /color|farbe/i.test(key)
      groups.push({
        name: key.charAt(0).toUpperCase() + key.slice(1),
        type: isColor ? 'color' : undefined,
        options: value.map((v: unknown) => ({
          label:    typeof v === 'string' ? v : String(v),
          colorHex: isColor && typeof v === 'string' && v.startsWith('#') ? v : undefined,
        })),
      })
    }
    return groups.length > 0 ? groups : null
  }

  return null
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ProductDetailPage({ params }: PageParams) {
  const { id } = (
    params instanceof Promise ? await params : params
  ) as { id: string }

  // ── Fetch product ──────────────────────────────────────────────────────────
  // SAFE SELECT: only columns confirmed to exist in all environments.
  // brand, low_stock_threshold, sku, attributes, variants are excluded
  // because they may not exist yet and would silently cause a 404.
  const { data: product, error: productError } = await supabaseAdmin
    .from('products')
    .select(`
      id, title, description, price,
      original_price,
      images, stock_quantity,
      seller_id, category,
      moderation_status,
      created_at
    `)
    .eq('id', id)
    .eq('moderation_status', 'approved')
    .maybeSingle()

  if (productError) {
    console.error('[PDP] DB error for id=%s:', id, productError.message, productError.code)
    notFound()
  }
  if (!product) {
    console.error('[PDP] Product not found or not approved, id=%s', id)
    notFound()
  }

  // ── Fetch seller + review stats in parallel ────────────────────────────────
  const sellerId: string = (product as any).seller_id ?? ''

  const [sellerRes, reviewsRes, relatedRes] = await Promise.all([
    sellerId
      ? supabaseAdmin
          .from('sellers')
          .select('id, shop_name, shop_slug, logo, avatar_url, status, verification_status')
          .eq('id', sellerId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),

    supabaseAdmin
      .from('product_reviews')
      .select('rating')
      .eq('product_id', id)
      .limit(500),

    (product as any).category
      ? supabaseAdmin
          .from('products')
          .select('id, title, price, original_price, images, stock_quantity, sellers(shop_name)')
          .eq('moderation_status', 'approved')
          .eq('status', 'active')
          .eq('category', (product as any).category)
          .neq('id', id)
          .limit(8)
      : Promise.resolve({ data: [], error: null }),
  ])

  // Fallback: if category has too few products, fill with other visible products
  let relatedData = relatedRes.data ?? []
  if (relatedData.length < 4) {
    const existingIds = new Set([id, ...relatedData.map((r: any) => r.id)])
    const { data: fallbackData } = await supabaseAdmin
      .from('products')
      .select('id, title, price, original_price, images, stock_quantity, sellers(shop_name)')
      .eq('moderation_status', 'approved')
      .eq('status', 'active')
      .not('id', 'in', `(${Array.from(existingIds).join(',')})`)
      .order('created_at', { ascending: false })
      .limit(8 - relatedData.length)
    if (fallbackData) {
      relatedData = [...relatedData, ...fallbackData]
    }
  }

  const seller     = sellerRes.data
  const reviewRows = reviewsRes.data ?? []
  const revCount   = reviewRows.length
  const revAvg     = revCount > 0
    ? reviewRows.reduce((s, r) => s + (r.rating ?? 0), 0) / revCount
    : 0

  // ── Normalize to DTO ────────────────────────────────────────────────────────
  const compareAt: number | null =
    (product.original_price as number | null) ?? null
  const { discountPercent, savings } = computeDiscount(Number(product.price), compareAt)

  const stockQty     = Number((product as any).stock_quantity ?? 0)
  const lowThreshold = 5   // safe default; low_stock_threshold column may not exist

  // Safe image normalization — never crash on null/malformed images field
  const images: string[] = (() => {
    const raw = (product as any).images
    if (!Array.isArray(raw)) return []
    return raw.filter((x: unknown) => typeof x === 'string' && x.length > 0)
  })()

  const dto: ProductDetailDTO = {
    id:              product.id,
    title:           product.title,
    description:     (product as any).description ?? null,
    price:           Number(product.price),
    currency:        'EUR',
    compareAtPrice:  compareAt,
    discountPercent,
    savings,
    images,
    stockQuantity:   stockQty,
    lowStockThreshold: lowThreshold,
    isLowStock:      stockQty > 0 && stockQty <= lowThreshold,
    isOutOfStock:    stockQty === 0,
    sku:             null,
    category:        (product as any).category ?? null,
    brand:           null,  // brand column excluded from SELECT (may not exist)
    isNew:           false,
    isFeatured:      false,
    createdAt:       (product as any).created_at,
    attributes:      null,
    variants:        null,
    seller: {
      id:         seller?.id ?? (product as any).seller_id ?? '',
      shopName:   seller?.shop_name ?? 'Shop',
      shopSlug:   seller?.shop_slug ?? null,
      logoUrl:    seller?.logo ?? seller?.avatar_url ?? null,
      isVerified: seller?.verification_status === 'verified' || seller?.status === 'verified',
    },
    reviews: {
      average: Math.round(revAvg * 10) / 10,
      count:   revCount,
    },
  }

  // ── Related products ────────────────────────────────────────────────────────
  const relatedProducts: RelatedProductDTO[] = relatedData.map((r: any) => {
    const rCompareAt: number | null = (r.original_price as number | null) ?? null
    const { discountPercent: rDisc } = computeDiscount(Number(r.price), rCompareAt)
    const sellerArr = r.sellers
    const sellerName = Array.isArray(sellerArr)
      ? (sellerArr[0] as { shop_name?: string })?.shop_name ?? null
      : (sellerArr as { shop_name?: string } | null)?.shop_name ?? null

    const rImages: string[] = Array.isArray(r.images)
      ? (r.images as unknown[]).filter((x): x is string => typeof x === 'string')
      : []

    return {
      id:            r.id,
      title:         r.title,
      price:         Number(r.price),
      currency:      'EUR',
      images:        rImages,
      compareAtPrice: rCompareAt,
      discountPercent: rDisc,
      inventory:     Number(r.stock_quantity ?? 0),
      brand:         null,
      sellerName,
      isNew:         false,
      isFeatured:    false,
    }
  })

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white">
      <TrackEvent type="product_view" sellerId={dto.seller.id} productId={dto.id} />

      {/* ── Breadcrumb ─────────────────────────────────────────────────────── */}
      <div className="border-b border-[#F0F0F0]">
        <nav
          aria-label="Breadcrumb"
          className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-1.5 text-[12px] text-[#555555] overflow-x-auto whitespace-nowrap"
        >
          <Link href="/" className="hover:text-[#1A1A1A] transition-colors">
            Startseite
          </Link>
          <ChevronRight className="w-3 h-3 flex-shrink-0 text-[#D1D5DB]" />
          {dto.category && (
            <>
              <Link
                href={`/category/${slugify(dto.category)}`}
                className="hover:text-[#1A1A1A] transition-colors"
              >
                {dto.category}
              </Link>
              <ChevronRight className="w-3 h-3 flex-shrink-0 text-[#D1D5DB]" />
            </>
          )}
          <span className="text-[#1A1A1A] font-medium truncate max-w-[200px]">
            {dto.title}
          </span>
        </nav>
      </div>

      {/* ── Main product zone ──────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 lg:py-10">

        {/* Above the fold: gallery (left) + context + buy box (right) */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 xl:gap-12">

          {/* ── Left column: Image Gallery ──────────────────────────────────── */}
          <div className="lg:col-span-3">
            <ProductGallery
              images={dto.images}
              title={dto.title}
              discountPercent={dto.discountPercent}
              isNew={dto.isNew}
              isOutOfStock={dto.isOutOfStock}
            />
          </div>

          {/* ── Right column: Context + Buy Box ─────────────────────────────── */}
          <div className="lg:col-span-2">

            {/* Product context (title, brand, badges, rating) */}
            <div className="mb-5">
              {/* Brand + Category */}
              <div className="flex items-center gap-2 mb-2 text-[12px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
                {dto.brand && <span>{dto.brand}</span>}
                {dto.brand && dto.category && <span>·</span>}
                {dto.category && <span>{dto.category}</span>}
              </div>

              {/* Title */}
              <h1 className="text-[22px] sm:text-[26px] font-bold text-[#1A1A1A] leading-tight tracking-tight mb-3">
                {dto.title}
              </h1>

              {/* Badges row */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {dto.isNew && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide bg-[#D97706]/15 text-[#D97706]">
                    Neu
                  </span>
                )}
                {dto.isFeatured && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide bg-[#1A1A1A]/20 text-[#1A1A1A]"
                    style={{ background: 'rgba(26,26,26,0.07)' }}
                  >
                    Top
                  </span>
                )}
                {dto.discountPercent && !dto.isOutOfStock && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide bg-[#DC2626] text-white">
                    -{dto.discountPercent}%
                  </span>
                )}
                {dto.isOutOfStock && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide bg-[#6B7280]/20 text-[#555555]">
                    Ausverkauft
                  </span>
                )}
                {dto.isLowStock && !dto.isOutOfStock && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide bg-[#D97706]/15 text-[#D97706]">
                    Nur noch {dto.stockQuantity} verfügbar
                  </span>
                )}
              </div>

              {/* Review summary (only when real reviews exist) */}
              {dto.reviews.count > 0 && (
                <a
                  href="#bewertungen"
                  className="inline-flex items-center gap-1.5 group"
                >
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <svg
                        key={i}
                        width="14" height="14" viewBox="0 0 24 24"
                        fill={i < Math.round(dto.reviews.average) ? '#D97706' : '#E5E7EB'}
                        className="flex-shrink-0"
                      >
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    ))}
                  </div>
                  <span className="text-[13px] font-semibold text-[#1A1A1A]">
                    {dto.reviews.average.toFixed(1)}
                  </span>
                  <span className="text-[12px] text-[#9CA3AF] group-hover:text-[#6B7280] transition-colors">
                    ({dto.reviews.count} {dto.reviews.count === 1 ? 'Bewertung' : 'Bewertungen'})
                  </span>
                </a>
              )}
            </div>

            {/* Sticky Buy Box */}
            <div className="lg:sticky lg:top-20">
              <ProductBuyBox dto={dto} />
            </div>
          </div>
        </div>

        {/* ── Below fold: content sections ─────────────────────────────────── */}
        <div className="mt-14 lg:mt-20 space-y-12">

          {/* Highlights (from attributes, only if data exists) */}
          {dto.attributes && Object.keys(dto.attributes).length > 0 && (
            <ProductHighlights attributes={dto.attributes} brand={dto.brand} isNew={dto.isNew} />
          )}

          {/* Description */}
          {dto.description && (
            <ProductDescription description={dto.description} />
          )}

          {/* Technical details */}
          {(dto.attributes || dto.sku || dto.brand || dto.category) && (
            <ProductTechnicalDetails
              attributes={dto.attributes}
              sku={dto.sku}
              brand={dto.brand}
              category={dto.category}
              createdAt={dto.createdAt}
            />
          )}

          {/* Reviews (existing component, fetches its own paginated data) */}
          {dto.reviews.count > 0 && (
            <section id="bewertungen">
              <h2 className="text-[20px] font-bold text-[#1A1A1A] mb-6">
                Kundenbewertungen
              </h2>
              <ProductReviews
                productId={dto.id}
                averageRating={dto.reviews.average}
                reviewCount={dto.reviews.count}
              />
            </section>
          )}

          {/* Related products */}
          {relatedProducts.length > 0 && (
            <RelatedProducts products={relatedProducts} />
          )}
        </div>
      </div>
    </div>
  )
}
