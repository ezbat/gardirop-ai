/**
 * Normalized Product Detail DTO
 *
 * All components on the PDP consume this single interface.
 * Computed fields (discountPercent, isLowStock, etc.) are resolved
 * once at the server layer so client components stay stateless/dumb.
 */

export interface ProductDetailDTO {
  id: string
  title: string
  description: string | null

  // Pricing
  price: number
  currency: string            // default 'EUR'
  compareAtPrice: number | null
  discountPercent: number | null   // null = no real discount
  savings: number | null           // absolute € savings

  // Media
  images: string[]

  // Inventory
  stockQuantity: number
  lowStockThreshold: number
  isLowStock: boolean
  isOutOfStock: boolean

  // Metadata
  sku: string | null
  category: string | null
  brand: string | null
  isNew: boolean
  isFeatured: boolean
  createdAt: string

  // Structured data
  attributes: Record<string, string | number | boolean> | null
  variants: ProductVariantGroup[] | null   // null = no variants

  // Related entities
  seller: SellerMiniDTO

  // Review summary (from server — count + average, not full list)
  reviews: {
    average: number          // 0 if no reviews
    count: number
  }
}

// ─── Variants ─────────────────────────────────────────────────────────────────

export interface ProductVariantGroup {
  /** e.g. "Größe", "Farbe", "Material" */
  name: string
  /** "size" | "color" | "material" | "style" — used for rendering decisions */
  type?: string
  options: ProductVariantOption[]
}

export interface ProductVariantOption {
  label: string           // "M", "Schwarz", "Baumwolle" …
  /** hex or named CSS color — only relevant when type === 'color' */
  colorHex?: string | null
  available?: boolean     // undefined → assume available
}

// ─── Seller ──────────────────────────────────────────────────────────────────

export interface SellerMiniDTO {
  id: string
  shopName: string
  shopSlug: string | null
  logoUrl: string | null
  isVerified: boolean
}

// ─── Related product (minimal card shape) ────────────────────────────────────

export interface RelatedProductDTO {
  id: string
  title: string
  price: number
  currency: string
  images: string[]
  compareAtPrice: number | null
  discountPercent: number | null
  inventory: number | null
  brand: string | null
  sellerName: string | null
  isNew: boolean
  isFeatured: boolean
}
