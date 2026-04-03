/**
 * lib/cart-local.ts
 *
 * Lightweight localStorage cart.
 * Used as the primary store for guest users and as the staging area
 * for logged-in users before the server cart is synced.
 *
 * On login the cart page calls POST /api/cart with { merge: getLocalCart() }
 * then calls clearLocalCart() so everything lives on the server from then on.
 */

const KEY = 'cart'

export interface CartProduct {
  id: string
  title: string
  price: number
  images: string[]
  stock_quantity: number
  seller_id: string
  brand?: string | null
  category?: string | null
}

export interface LocalCartItem {
  id: string            // `${product.id}` or `${product.id}::${selectedSize}`
  product: CartProduct
  quantity: number
  selectedSize?: string
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function load(): LocalCartItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as LocalCartItem[]) : []
  } catch {
    return []
  }
}

function save(items: LocalCartItem[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY, JSON.stringify(items))
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Add or increase quantity of an item in the local cart. */
export function addToCartLocal(
  product: CartProduct,
  quantity: number,
  selectedSize?: string,
): void {
  const items = load()
  const id    = selectedSize ? `${product.id}::${selectedSize}` : product.id
  const idx   = items.findIndex(i => i.id === id)

  if (idx >= 0) {
    items[idx].quantity = Math.min(
      items[idx].quantity + quantity,
      product.stock_quantity,
    )
  } else {
    items.push({
      id,
      product,
      quantity: Math.min(quantity, product.stock_quantity),
      selectedSize: selectedSize ?? undefined,
    })
  }

  save(items)
}

/** Returns all items currently in the local cart. */
export function getLocalCart(): LocalCartItem[] {
  return load()
}

/** Returns the total item count (sum of quantities). */
export function getCartCount(): number {
  return load().reduce((sum, i) => sum + i.quantity, 0)
}

/** Replaces the entire local cart (used by cart page for qty edits in guest mode). */
export function setLocalCart(items: LocalCartItem[]): void {
  save(items)
}

/** Removes all items from the local cart. */
export function clearLocalCart(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(KEY)
}

/**
 * Returns the local cart as a merge payload suitable for POST /api/cart.
 * Strips the denormalized `product` envelope — server only needs IDs.
 */
export function getLocalCartForMerge(): Array<{
  product_id: string
  quantity: number
  selected_size?: string
}> {
  return load().map(item => ({
    product_id:    item.product.id,
    quantity:      item.quantity,
    selected_size: item.selectedSize,
  }))
}
