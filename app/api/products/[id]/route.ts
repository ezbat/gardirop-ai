/**
 * GET /api/products/[id]
 *
 * Public endpoint that returns a normalized ProductDetailDTO for a single
 * approved, active product.  Used by the server-rendered PDP page and any
 * client that needs to refresh product data without a full navigation.
 *
 * Returns 404 when the product is not found OR not publicly visible
 * (moderation_status !== 'approved').
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type {
  ProductDetailDTO,
  ProductVariantGroup,
  RelatedProductDTO,
} from '@/components/storefront/product-detail/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeDiscount(price: number, compareAt: number | null): {
  discountPercent: number | null
  savings: number | null
} {
  if (!compareAt || compareAt <= price) return { discountPercent: null, savings: null }
  const pct = Math.round((1 - price / compareAt) * 100)
  return {
    discountPercent: pct > 0 ? pct : null,
    savings: Math.round((compareAt - price) * 100) / 100,
  }
}

/** Attempt to parse the raw variants JSONB into normalized ProductVariantGroup[] */
function parseVariants(raw: unknown): ProductVariantGroup[] | null {
  if (!raw || typeof raw !== 'object') return null

  // If it's already an array of groups: [{ name, options: [...] }]
  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === 'object' && raw[0] !== null) {
    try {
      return (raw as Array<Record<string, unknown>>).map(g => ({
        name: String(g.name ?? 'Optionen'),
        type: g.type as string | undefined,
        options: Array.isArray(g.options)
          ? g.options.map((o: unknown) => {
              if (typeof o === 'string') return { label: o }
              if (typeof o === 'object' && o !== null) {
                const op = o as Record<string, unknown>
                return {
                  label: String(op.label ?? op.value ?? ''),
                  colorHex: op.color ? String(op.color) : undefined,
                  available: op.available as boolean | undefined,
                }
              }
              return { label: String(o) }
            })
          : [],
      }))
    } catch {
      return null
    }
  }

  // Flat object pattern: { sizes: [...], colors: [...] }
  if (!Array.isArray(raw) && typeof raw === 'object') {
    const groups: ProductVariantGroup[] = []
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      if (!Array.isArray(value) || value.length === 0) continue
      const isColor = key.toLowerCase().includes('color') || key.toLowerCase().includes('farbe')
      groups.push({
        name: key.charAt(0).toUpperCase() + key.slice(1),
        type: isColor ? 'color' : undefined,
        options: value.map((v: unknown) => {
          if (typeof v === 'string') {
            return {
              label: v,
              colorHex: isColor && v.startsWith('#') ? v : undefined,
            }
          }
          return { label: String(v) }
        }),
      })
    }
    return groups.length > 0 ? groups : null
  }

  return null
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) {
  // Next.js 15+ async params — backwards-compatible resolve
  const { id } = (params instanceof Promise ? await params : params) as { id: string }

  if (!id) {
    return NextResponse.json({ error: 'Product ID required' }, { status: 400 })
  }

  // ── Fetch product + seller in parallel ──────────────────────────────────────
  // SAFE SELECT: brand, low_stock_threshold excluded — may not exist in all envs
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
    console.error('[api/products/[id]] DB error for id=%s:', id, productError.message, productError.code)
    return NextResponse.json({ error: 'Database error', detail: productError.message }, { status: 500 })
  }
  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  // ── Fetch seller + review stats in parallel ──────────────────────────────────
  const sellerId: string = (product as any).seller_id ?? ''

  const [sellerResult, reviewResult] = await Promise.all([
    sellerId
      ? supabaseAdmin
          .from('sellers')
          .select('id, shop_name, shop_slug, logo, avatar_url, status, verification_status')
          .eq('id', sellerId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),

    // product_reviews is the name used by the existing /api/reviews endpoint
    supabaseAdmin
      .from('product_reviews')
      .select('rating')
      .eq('product_id', id)
      .limit(500),
  ])

  const seller = sellerResult.data
  const reviewRows = reviewResult.data ?? []
  const reviewCount = reviewRows.length
  const avgRating =
    reviewCount > 0 ? reviewRows.reduce((s, r) => s + (r.rating ?? 0), 0) / reviewCount : 0

  // ── Normalize ────────────────────────────────────────────────────────────────
  const compareAt: number | null = (product.original_price as number | null) ?? null
  const { discountPercent, savings } = computeDiscount(Number(product.price), compareAt)

  const stockQty = Number((product as any).stock_quantity ?? 0)
  const lowThreshold = 5  // safe default; low_stock_threshold column may not exist

  // Safe image normalization
  const images: string[] = (() => {
    const raw = (product as any).images
    if (!Array.isArray(raw)) return []
    return raw.filter((x: unknown) => typeof x === 'string' && x.length > 0)
  })()

  const dto: ProductDetailDTO = {
    id: product.id,
    title: product.title,
    description: (product as any).description ?? null,
    price: Number(product.price),
    currency: 'EUR',
    compareAtPrice: compareAt,
    discountPercent,
    savings,
    images,
    stockQuantity: stockQty,
    lowStockThreshold: lowThreshold,
    isLowStock: stockQty > 0 && stockQty <= lowThreshold,
    isOutOfStock: stockQty === 0,
    sku: null,
    category: (product as any).category ?? null,
    brand: null,  // brand column excluded from SELECT
    isNew: false,
    isFeatured: false,
    createdAt: (product as any).created_at,
    attributes: null,
    variants: null,
    seller: {
      id: seller?.id ?? sellerId,
      shopName: seller?.shop_name ?? 'Shop',
      shopSlug: seller?.shop_slug ?? null,
      logoUrl: seller?.logo ?? seller?.avatar_url ?? null,
      isVerified:
        seller?.verification_status === 'verified' ||
        seller?.status === 'verified',
    },
    reviews: {
      average: Math.round(avgRating * 10) / 10,
      count: reviewCount,
    },
  }

  // ── Related products ─────────────────────────────────────────────────────────
  let relatedProducts: RelatedProductDTO[] = []

  const productCategory: string | null = (product as any).category ?? null
  if (productCategory) {
    const { data: related } = await supabaseAdmin
      .from('products')
      .select('id, title, price, original_price, images, stock_quantity, sellers(shop_name)')
      .eq('moderation_status', 'approved')
      .eq('category', productCategory)
      .neq('id', id)
      .limit(8)

    relatedProducts = (related ?? []).map((r: any) => {
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
        id: r.id,
        title: r.title,
        price: Number(r.price),
        currency: 'EUR',
        images: rImages,
        compareAtPrice: rCompareAt,
        discountPercent: rDisc,
        inventory: Number(r.stock_quantity ?? 0),
        brand: null,
        sellerName,
        isNew: false,
        isFeatured: false,
      }
    })
  }

  return NextResponse.json({ product: dto, relatedProducts })
}
