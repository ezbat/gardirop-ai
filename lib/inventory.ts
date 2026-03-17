import { supabaseAdmin } from './supabase-admin'
import { logger } from './logger'

// ═══════════════════════════════════════════════════════════
// WEARO Inventory System
// Real stock tracking with movement history.
// All operations use PostgreSQL RPC for atomic execution
// with SELECT ... FOR UPDATE row-level locking.
// ═══════════════════════════════════════════════════════════

export type MovementType = 'sale' | 'restock' | 'return' | 'adjustment' | 'reservation' | 'cancellation' | 'damaged' | 'transfer'

export interface InventoryMovement {
  product_id: string
  quantity: number  // positive = add stock, negative = remove stock
  type: MovementType
  reference_id?: string  // order_id, return_id, etc.
  notes?: string
  performed_by?: string  // user_id who performed the action
}

export interface StockAlert {
  productId: string
  title: string
  sku: string | null
  currentStock: number
  threshold: number
  severity: 'critical' | 'warning' | 'info'
  image: string | null
}

// ─── CORE: Record Inventory Movement (Atomic via RPC) ───────
/**
 * Record a stock movement and update product stock_quantity atomically.
 * Uses PostgreSQL RPC with SELECT ... FOR UPDATE to prevent race conditions.
 */
export async function recordMovement(movement: InventoryMovement): Promise<{
  success: boolean
  newStock: number
  error?: string
}> {
  if (movement.quantity < 0) {
    // Deduction — use stock_deduct RPC
    const { data, error } = await supabaseAdmin.rpc('stock_deduct', {
      p_product_id: movement.product_id,
      p_quantity: Math.abs(movement.quantity),
      p_ref_type: movement.type,
      p_ref_id: movement.reference_id || null,
      p_performed_by: movement.performed_by || null,
    })

    if (error) {
      logger.error('stock_deduct RPC failed', {
        productId: movement.product_id,
        error: error.message,
      })
      return { success: false, newStock: 0, error: `RPC error: ${error.message}` }
    }

    const result = data as { success: boolean; error?: string; new_stock?: number; available?: number; requested?: number }

    if (!result.success) {
      return {
        success: false,
        newStock: result.available || 0,
        error: result.error === 'INSUFFICIENT_STOCK'
          ? `Insufficient stock. Available: ${result.available}, Requested: ${result.requested}`
          : result.error || 'Stock deduction failed',
      }
    }

    return { success: true, newStock: result.new_stock || 0 }
  } else if (movement.quantity > 0) {
    // Addition — use stock_restore RPC
    const { data, error } = await supabaseAdmin.rpc('stock_restore', {
      p_product_id: movement.product_id,
      p_quantity: movement.quantity,
      p_ref_type: movement.type,
      p_ref_id: movement.reference_id || null,
      p_performed_by: movement.performed_by || null,
    })

    if (error) {
      logger.error('stock_restore RPC failed', {
        productId: movement.product_id,
        error: error.message,
      })
      return { success: false, newStock: 0, error: `RPC error: ${error.message}` }
    }

    const result = data as { success: boolean; error?: string; new_stock?: number }

    if (!result.success) {
      return { success: false, newStock: 0, error: result.error || 'Stock restore failed' }
    }

    return { success: true, newStock: result.new_stock || 0 }
  } else {
    // Zero quantity — no-op
    return { success: true, newStock: 0 }
  }
}

// ─── SALE: Deduct stock on order placement ──────────────────
/**
 * Deduct stock for all items in an order.
 * Records individual movements for each product.
 * Returns list of failures if any item has insufficient stock.
 */
export async function deductStockForOrder(
  orderId: string,
  items: Array<{ productId: string; quantity: number }>,
  userId?: string
): Promise<{
  success: boolean
  results: Array<{ productId: string; success: boolean; newStock: number; error?: string }>
}> {
  const results = []
  let allSuccess = true

  for (const item of items) {
    const result = await recordMovement({
      product_id: item.productId,
      quantity: -item.quantity,
      type: 'sale',
      reference_id: orderId,
      notes: `Order ${orderId}`,
      performed_by: userId,
    })

    results.push({
      productId: item.productId,
      success: result.success,
      newStock: result.newStock,
      error: result.error,
    })

    if (!result.success) allSuccess = false
  }

  return { success: allSuccess, results }
}

// ─── RETURN: Restore stock on order return ──────────────────
/**
 * Restore stock when an order is returned/cancelled.
 */
export async function restoreStockForOrder(
  orderId: string,
  items: Array<{ productId: string; quantity: number }>,
  type: 'return' | 'cancellation' = 'return',
  userId?: string
): Promise<{
  success: boolean
  results: Array<{ productId: string; success: boolean; newStock: number }>
}> {
  const results = []
  let allSuccess = true

  for (const item of items) {
    const result = await recordMovement({
      product_id: item.productId,
      quantity: item.quantity, // positive = add back
      type,
      reference_id: orderId,
      notes: `${type === 'return' ? 'Return' : 'Cancellation'} for order ${orderId}`,
      performed_by: userId,
    })

    results.push({
      productId: item.productId,
      success: result.success,
      newStock: result.newStock,
    })

    if (!result.success) allSuccess = false
  }

  return { success: allSuccess, results }
}

// ─── RESTOCK: Add stock (manual or bulk) ────────────────────
/**
 * Add stock to a product. Used for restocking/receiving inventory.
 */
export async function restockProduct(
  productId: string,
  quantity: number,
  notes?: string,
  userId?: string
): Promise<{ success: boolean; newStock: number; error?: string }> {
  if (quantity <= 0) {
    return { success: false, newStock: 0, error: 'Quantity must be positive' }
  }

  return recordMovement({
    product_id: productId,
    quantity,
    type: 'restock',
    notes: notes || 'Manual restock',
    performed_by: userId,
  })
}

// ─── ADJUSTMENT: Manual stock correction ────────────────────
/**
 * Manually adjust stock (inventory count correction).
 * Can set stock to exact value or adjust by delta.
 */
export async function adjustStock(
  productId: string,
  targetQuantity: number,
  reason: string,
  userId?: string
): Promise<{ success: boolean; newStock: number; error?: string }> {
  // Get current stock to calculate delta
  const { data: product } = await supabaseAdmin
    .from('products')
    .select('stock_quantity')
    .eq('id', productId)
    .single()

  if (!product) {
    return { success: false, newStock: 0, error: 'Product not found' }
  }

  const currentStock = product.stock_quantity || 0
  const delta = targetQuantity - currentStock

  if (delta === 0) {
    return { success: true, newStock: currentStock }
  }

  return recordMovement({
    product_id: productId,
    quantity: delta,
    type: 'adjustment',
    notes: reason,
    performed_by: userId,
  })
}

// ─── LOW STOCK ALERTS ───────────────────────────────────────
/**
 * Get all products below their stock threshold for a seller.
 * Uses product.low_stock_threshold (default 5).
 */
export async function getLowStockAlerts(sellerId: string): Promise<StockAlert[]> {
  const { data: products, error } = await supabaseAdmin
    .from('products')
    .select('id, title, stock_quantity, low_stock_threshold, sku, images')
    .eq('seller_id', sellerId)

  if (error || !products) return []

  const alerts: StockAlert[] = []

  for (const product of products) {
    const threshold = product.low_stock_threshold || 5
    const stock = product.stock_quantity || 0

    if (stock <= threshold) {
      let severity: 'critical' | 'warning' | 'info' = 'info'
      if (stock === 0) severity = 'critical'
      else if (stock <= Math.floor(threshold / 2)) severity = 'warning'

      alerts.push({
        productId: product.id,
        title: product.title,
        sku: product.sku || null,
        currentStock: stock,
        threshold,
        severity,
        image: product.images?.[0] || null,
      })
    }
  }

  return alerts.sort((a, b) => a.currentStock - b.currentStock)
}

// ─── MOVEMENT HISTORY ───────────────────────────────────────
/**
 * Get inventory movement history for a seller or specific product.
 */
export async function getMovementHistory(
  sellerId: string,
  options?: {
    productId?: string
    type?: MovementType
    limit?: number
    offset?: number
    startDate?: string
    endDate?: string
  }
): Promise<{
  movements: any[]
  total: number
}> {
  const limit = options?.limit || 50
  const offset = options?.offset || 0

  // Get all product IDs for this seller
  const { data: sellerProducts } = await supabaseAdmin
    .from('products')
    .select('id')
    .eq('seller_id', sellerId)

  if (!sellerProducts || sellerProducts.length === 0) {
    return { movements: [], total: 0 }
  }

  const productIds = sellerProducts.map(p => p.id)

  let query = supabaseAdmin
    .from('inventory_movements')
    .select('*, products(title, sku, images)', { count: 'exact' })
    .in('product_id', productIds)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (options?.productId) {
    query = query.eq('product_id', options.productId)
  }
  if (options?.type) {
    query = query.eq('type', options.type)
  }
  if (options?.startDate) {
    query = query.gte('created_at', options.startDate)
  }
  if (options?.endDate) {
    query = query.lte('created_at', options.endDate)
  }

  const { data: movements, count, error } = await query

  if (error) {
    console.error('Get movement history error:', error)
    return { movements: [], total: 0 }
  }

  return {
    movements: (movements || []).map((m: any) => ({
      id: m.id,
      productId: m.product_id,
      productTitle: m.products?.title || 'Unbekannt',
      productSku: m.products?.sku || null,
      productImage: m.products?.images?.[0] || null,
      quantity: m.quantity,
      type: m.type,
      referenceId: m.reference_id,
      notes: m.notes,
      previousStock: m.previous_stock,
      newStock: m.new_stock,
      performedBy: m.performed_by,
      createdAt: m.created_at,
    })),
    total: count || 0,
  }
}

// ─── INVENTORY SUMMARY ──────────────────────────────────────
/**
 * Get overall inventory summary for a seller.
 */
export async function getInventorySummary(sellerId: string): Promise<{
  totalProducts: number
  totalStock: number
  lowStockCount: number
  outOfStockCount: number
  totalValue: number
  averageStock: number
  categories: Array<{ category: string; productCount: number; totalStock: number }>
}> {
  const { data: products, error } = await supabaseAdmin
    .from('products')
    .select('id, stock_quantity, price, low_stock_threshold, category')
    .eq('seller_id', sellerId)

  if (error || !products || products.length === 0) {
    return {
      totalProducts: 0,
      totalStock: 0,
      lowStockCount: 0,
      outOfStockCount: 0,
      totalValue: 0,
      averageStock: 0,
      categories: [],
    }
  }

  const totalStock = products.reduce((sum, p) => sum + (p.stock_quantity || 0), 0)
  const totalValue = products.reduce(
    (sum, p) => sum + (p.stock_quantity || 0) * parseFloat(p.price || '0'),
    0
  )

  let lowStockCount = 0
  let outOfStockCount = 0

  for (const p of products) {
    const stock = p.stock_quantity || 0
    const threshold = p.low_stock_threshold || 5
    if (stock === 0) outOfStockCount++
    else if (stock <= threshold) lowStockCount++
  }

  // Category breakdown
  const categoryMap = new Map<string, { productCount: number; totalStock: number }>()
  for (const p of products) {
    const cat = p.category || 'Sonstige'
    const existing = categoryMap.get(cat) || { productCount: 0, totalStock: 0 }
    existing.productCount += 1
    existing.totalStock += p.stock_quantity || 0
    categoryMap.set(cat, existing)
  }

  return {
    totalProducts: products.length,
    totalStock,
    lowStockCount,
    outOfStockCount,
    totalValue: Math.round(totalValue * 100) / 100,
    averageStock: products.length > 0 ? Math.round(totalStock / products.length) : 0,
    categories: Array.from(categoryMap.entries())
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.totalStock - a.totalStock),
  }
}

// ─── BULK STOCK UPDATE ──────────────────────────────────────
/**
 * Update stock for multiple products at once (e.g., from CSV import).
 */
export async function bulkStockUpdate(
  updates: Array<{ productId: string; newQuantity: number; reason?: string }>,
  userId?: string
): Promise<{
  success: number
  failed: number
  results: Array<{ productId: string; success: boolean; error?: string }>
}> {
  let successCount = 0
  let failedCount = 0
  const results = []

  for (const update of updates) {
    const result = await adjustStock(
      update.productId,
      update.newQuantity,
      update.reason || 'Bulk update',
      userId
    )

    results.push({
      productId: update.productId,
      success: result.success,
      error: result.error,
    })

    if (result.success) successCount++
    else failedCount++
  }

  return { success: successCount, failed: failedCount, results }
}

// ─── SKU MANAGEMENT ─────────────────────────────────────────
/**
 * Update SKU for a product. Validates uniqueness within seller.
 */
export async function updateSKU(
  productId: string,
  sellerId: string,
  sku: string
): Promise<{ success: boolean; error?: string }> {
  // Check SKU uniqueness within seller
  const { data: existing } = await supabaseAdmin
    .from('products')
    .select('id')
    .eq('seller_id', sellerId)
    .eq('sku', sku)
    .neq('id', productId)
    .single()

  if (existing) {
    return { success: false, error: 'SKU already exists for another product' }
  }

  const { error } = await supabaseAdmin
    .from('products')
    .update({ sku })
    .eq('id', productId)
    .eq('seller_id', sellerId)

  if (error) {
    return { success: false, error: 'Failed to update SKU' }
  }

  return { success: true }
}

/**
 * Update low stock threshold for a product.
 */
export async function updateStockThreshold(
  productId: string,
  sellerId: string,
  threshold: number
): Promise<{ success: boolean; error?: string }> {
  if (threshold < 0) {
    return { success: false, error: 'Threshold must be non-negative' }
  }

  const { error } = await supabaseAdmin
    .from('products')
    .update({ low_stock_threshold: threshold })
    .eq('id', productId)
    .eq('seller_id', sellerId)

  if (error) {
    return { success: false, error: 'Failed to update threshold' }
  }

  return { success: true }
}
