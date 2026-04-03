/**
 * lib/inventory-threshold.ts
 *
 * Hierarchical low-stock threshold resolver.
 *
 * Precedence (highest → lowest):
 *   1. products.low_stock_threshold  (per-product override, nullable)
 *   2. category_stock_configs row    (per-category override)
 *   3. global_config key             ('inventory.default_low_stock_threshold')
 *   4. FALLBACK_THRESHOLD = 5        (hard fallback if DB tables missing)
 *
 * Usage pattern (server-side, per-request):
 *   const config = await fetchThresholdConfig()
 *   const thr    = resolveThreshold(config, product)
 *   const low    = isLowStock(product.stock_quantity, thr)
 */

import { supabaseAdmin } from './supabase-admin'

// ── Constants ──────────────────────────────────────────────────────────────────

/** Hard fallback used only when DB tables are unavailable (pre-migration). */
export const FALLBACK_THRESHOLD = 5

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ThresholdConfig {
  /** Global default threshold (from global_config table). */
  globalDefault: number
  /** Map from category_slug → threshold for categories with overrides. */
  categoryThresholds: Map<string, number>
}

/** Minimal product shape required for resolution. */
export interface ThresholdProduct {
  low_stock_threshold?: number | null
  category?: string | null
}

// ── Fetch (one per request, call once then pass config around) ─────────────────

/**
 * Load threshold configuration from DB.
 * - Queries global_config + category_stock_configs in parallel.
 * - Gracefully returns fallback defaults if tables don't exist yet (42P01).
 * - Call once per API handler and reuse the returned config for all products.
 */
export async function fetchThresholdConfig(): Promise<ThresholdConfig> {
  const [globalRes, categoryRes] = await Promise.all([
    supabaseAdmin
      .from('global_config')
      .select('value')
      .eq('key', 'inventory.default_low_stock_threshold')
      .maybeSingle(),

    supabaseAdmin
      .from('category_stock_configs')
      .select('category_slug, low_stock_threshold'),
  ])

  // If tables don't exist yet, fall back gracefully
  const tablesExist =
    globalRes.error?.code !== '42P01' &&
    categoryRes.error?.code !== '42P01'

  if (!tablesExist) {
    return { globalDefault: FALLBACK_THRESHOLD, categoryThresholds: new Map() }
  }

  // Global default
  let globalDefault = FALLBACK_THRESHOLD
  if (!globalRes.error && globalRes.data) {
    const val = (globalRes.data.value as Record<string, unknown>)?.threshold
    if (typeof val === 'number' && val >= 0) globalDefault = val
  }

  // Category overrides
  const categoryThresholds = new Map<string, number>()
  if (!categoryRes.error && categoryRes.data) {
    for (const row of categoryRes.data) {
      if (row.category_slug && typeof row.low_stock_threshold === 'number') {
        categoryThresholds.set(row.category_slug, row.low_stock_threshold)
      }
    }
  }

  return { globalDefault, categoryThresholds }
}

// ── Resolution ────────────────────────────────────────────────────────────────

/**
 * Resolve the effective low-stock threshold for a single product.
 *
 * Priority:
 *   1) product.low_stock_threshold if not null
 *   2) category override from config.categoryThresholds
 *   3) config.globalDefault
 */
export function resolveThreshold(
  config: ThresholdConfig,
  product: ThresholdProduct,
): number {
  // 1) Product-level override
  if (product.low_stock_threshold != null && product.low_stock_threshold >= 0) {
    return product.low_stock_threshold
  }

  // 2) Category-level override
  if (product.category) {
    const catThr = config.categoryThresholds.get(product.category)
    if (catThr !== undefined) return catThr
  }

  // 3) Global default
  return config.globalDefault
}

// ── Stock status helpers ───────────────────────────────────────────────────────

/**
 * True if stock is low: stock > 0 and stock ≤ threshold.
 * (Out-of-stock = stock === 0, handled separately.)
 */
export function isLowStock(stock: number, threshold: number): boolean {
  return stock > 0 && stock <= threshold
}

/**
 * True if stock is very low (critical warning level):
 *   stock ≤ ceil(threshold × 0.6), minimum 1.
 * Example: threshold=5 → veryLow mark = 3 (ceil(3.0))
 *          threshold=10 → veryLow mark = 6 (ceil(6.0))
 */
export function isVeryLowStock(stock: number, threshold: number): boolean {
  if (stock <= 0) return false
  const mark = Math.max(1, Math.ceil(threshold * 0.6))
  return stock <= mark
}

/**
 * Severity label combining all stock states.
 * Returns null when stock is above threshold (healthy).
 */
export function getStockSeverity(
  stock: number,
  threshold: number,
): 'critical' | 'warning' | 'low' | null {
  if (stock === 0) return 'critical'
  if (isVeryLowStock(stock, threshold)) return 'warning'
  if (isLowStock(stock, threshold)) return 'low'
  return null
}
