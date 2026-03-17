/**
 * TAX ENGINE — Global Tax Compliance
 *
 * EU:
 *   B2C → destination country VAT
 *   B2B + valid VAT ID → reverse charge (0% tax)
 *
 * US:
 *   State-based sales tax (lookup from tax_rates)
 *
 * TR:
 *   Flat 20% KDV, marketplace reporting required
 *
 * Tax is snapshot at checkout — never retroactively changed.
 */

import { supabaseAdmin } from '@/lib/supabase-admin'

// ─── Types ──────────────────────────────────────────────────────────

interface TaxCalculation {
  taxCountry: string
  taxType: string          // 'VAT' | 'sales_tax' | 'KDV' | 'GST'
  taxRate: number          // percentage (e.g. 19.00)
  taxAmount: number        // absolute amount
  netAmount: number        // pre-tax
  grossAmount: number      // post-tax (= net + tax)
  reverseCharge: boolean
  marketplaceLiable: boolean
}

interface OrderTaxResult {
  items: TaxCalculation[]
  totalTax: number
  totalNet: number
  totalGross: number
}

// EU member states (ISO 2-letter codes)
const EU_COUNTRIES = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
  'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
  'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
])

// ─── Tax Rate Lookup ────────────────────────────────────────────────

/**
 * Get tax rate for a country (and optional region/category)
 */
export async function getTaxRate(
  country: string,
  region?: string,
  category?: string
): Promise<{ rate: number; reducedRate: number | null; taxType: string } | null> {
  let query = supabaseAdmin
    .from('tax_rates')
    .select('rate, reduced_rate, tax_type')
    .eq('country', country.toUpperCase())

  if (region) {
    query = query.eq('region', region.toUpperCase())
  } else {
    query = query.is('region', null)
  }

  if (category) {
    query = query.eq('category', category)
  } else {
    query = query.is('category', null)
  }

  // Only active rates
  query = query
    .lte('effective_from', new Date().toISOString())
    .or(`effective_until.is.null,effective_until.gte.${new Date().toISOString()}`)

  const { data } = await query.maybeSingle()

  if (!data) {
    // Fallback: try without region/category
    if (region || category) {
      return getTaxRate(country)
    }
    return null
  }

  return {
    rate: parseFloat(String(data.rate)),
    reducedRate: data.reduced_rate ? parseFloat(String(data.reduced_rate)) : null,
    taxType: data.tax_type,
  }
}

// ─── Tax Calculation ────────────────────────────────────────────────

/**
 * Calculate tax for an order.
 *
 * @param items       - Array of { amount, category? } representing line items
 * @param sellerCountry - ISO code of seller's country
 * @param buyerCountry  - ISO code of buyer's country
 * @param buyerRegion   - US state code (for US sales tax)
 * @param buyerVatId    - Buyer's VAT ID (for B2B reverse charge)
 */
export async function calculateOrderTax(
  items: Array<{ amount: number; category?: string }>,
  sellerCountry: string,
  buyerCountry: string,
  buyerRegion?: string,
  buyerVatId?: string
): Promise<OrderTaxResult> {
  const results: TaxCalculation[] = []
  let totalTax = 0
  let totalNet = 0
  let totalGross = 0

  const seller = sellerCountry.toUpperCase()
  const buyer = buyerCountry.toUpperCase()
  const isEUSeller = EU_COUNTRIES.has(seller)
  const isEUBuyer = EU_COUNTRIES.has(buyer)

  for (const item of items) {
    let calc: TaxCalculation

    // ── EU Seller ──
    if (isEUSeller) {
      if (isEUBuyer && buyerVatId && buyer !== seller) {
        // EU B2B cross-border → Reverse Charge
        calc = {
          taxCountry: buyer,
          taxType: 'VAT',
          taxRate: 0,
          taxAmount: 0,
          netAmount: item.amount,
          grossAmount: item.amount,
          reverseCharge: true,
          marketplaceLiable: false,
        }
      } else if (isEUBuyer) {
        // EU B2C → destination VAT
        const taxInfo = await getTaxRate(buyer, undefined, item.category)
        const rate = taxInfo?.rate ?? 19 // fallback to DE
        const taxAmount = round2(item.amount * rate / 100)
        calc = {
          taxCountry: buyer,
          taxType: 'VAT',
          taxRate: rate,
          taxAmount,
          netAmount: item.amount,
          grossAmount: round2(item.amount + taxAmount),
          reverseCharge: false,
          marketplaceLiable: true,
        }
      } else if (buyer === 'US') {
        // EU seller → US buyer → US state sales tax
        const taxInfo = await getTaxRate('US', buyerRegion)
        const rate = taxInfo?.rate ?? 0
        const taxAmount = round2(item.amount * rate / 100)
        calc = {
          taxCountry: 'US',
          taxType: 'sales_tax',
          taxRate: rate,
          taxAmount,
          netAmount: item.amount,
          grossAmount: round2(item.amount + taxAmount),
          reverseCharge: false,
          marketplaceLiable: true,
        }
      } else if (buyer === 'TR') {
        // EU seller → TR buyer → KDV
        const taxInfo = await getTaxRate('TR')
        const rate = taxInfo?.rate ?? 20
        const taxAmount = round2(item.amount * rate / 100)
        calc = {
          taxCountry: 'TR',
          taxType: 'KDV',
          taxRate: rate,
          taxAmount,
          netAmount: item.amount,
          grossAmount: round2(item.amount + taxAmount),
          reverseCharge: false,
          marketplaceLiable: true,
        }
      } else {
        // Non-EU, non-US, non-TR → seller country VAT (simplified)
        const taxInfo = await getTaxRate(seller)
        const rate = taxInfo?.rate ?? 19
        const taxAmount = round2(item.amount * rate / 100)
        calc = {
          taxCountry: seller,
          taxType: taxInfo?.taxType || 'VAT',
          taxRate: rate,
          taxAmount,
          netAmount: item.amount,
          grossAmount: round2(item.amount + taxAmount),
          reverseCharge: false,
          marketplaceLiable: true,
        }
      }
    }
    // ── TR Seller ──
    else if (seller === 'TR') {
      const rate = 20 // KDV flat
      const taxAmount = round2(item.amount * rate / 100)
      calc = {
        taxCountry: 'TR',
        taxType: 'KDV',
        taxRate: rate,
        taxAmount,
        netAmount: item.amount,
        grossAmount: round2(item.amount + taxAmount),
        reverseCharge: false,
        marketplaceLiable: true,
      }
    }
    // ── US Seller ──
    else if (seller === 'US') {
      const taxInfo = await getTaxRate('US', buyerRegion)
      const rate = taxInfo?.rate ?? 0
      const taxAmount = round2(item.amount * rate / 100)
      calc = {
        taxCountry: 'US',
        taxType: 'sales_tax',
        taxRate: rate,
        taxAmount,
        netAmount: item.amount,
        grossAmount: round2(item.amount + taxAmount),
        reverseCharge: false,
        marketplaceLiable: buyer === 'US', // marketplace liable only for domestic
      }
    }
    // ── Other ──
    else {
      // No tax calculation for unknown jurisdictions
      calc = {
        taxCountry: buyer,
        taxType: 'VAT',
        taxRate: 0,
        taxAmount: 0,
        netAmount: item.amount,
        grossAmount: item.amount,
        reverseCharge: false,
        marketplaceLiable: false,
      }
    }

    results.push(calc)
    totalTax += calc.taxAmount
    totalNet += calc.netAmount
    totalGross += calc.grossAmount
  }

  return {
    items: results,
    totalTax: round2(totalTax),
    totalNet: round2(totalNet),
    totalGross: round2(totalGross),
  }
}

// ─── Snapshot & Storage ─────────────────────────────────────────────

/**
 * Save tax breakdown to database (immutable snapshot at checkout)
 */
export async function snapshotOrderTax(
  orderId: string,
  breakdown: TaxCalculation[],
  sellerVatId?: string,
  buyerCountry?: string
): Promise<void> {
  const rows = breakdown.map(item => ({
    order_id: orderId,
    tax_country: item.taxCountry,
    tax_type: item.taxType,
    tax_rate: item.taxRate,
    tax_amount: item.taxAmount,
    net_amount: item.netAmount,
    gross_amount: item.grossAmount,
    seller_vat_id: sellerVatId || null,
    buyer_country: buyerCountry || item.taxCountry,
    reverse_charge_flag: item.reverseCharge,
    marketplace_liable: item.marketplaceLiable,
  }))

  if (rows.length > 0) {
    const { error } = await supabaseAdmin
      .from('order_tax_breakdown')
      .insert(rows)

    if (error) {
      console.error('[Tax] Snapshot error:', error.message)
    }
  }
}

/**
 * Get VAT report for a seller — aggregated by country
 */
export async function getVATReport(
  sellerId: string,
  startDate: string,
  endDate: string
): Promise<Array<{
  country: string
  taxType: string
  totalTax: number
  totalNet: number
  totalGross: number
  orderCount: number
  reverseChargeCount: number
}>> {
  // Get orders for this seller in date range
  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('id')
    .eq('seller_id', sellerId)
    .eq('payment_status', 'paid')
    .gte('created_at', startDate)
    .lte('created_at', endDate)

  if (!orders || orders.length === 0) return []

  const orderIds = orders.map(o => o.id)

  // Get tax breakdowns for those orders
  const { data: breakdowns } = await supabaseAdmin
    .from('order_tax_breakdown')
    .select('*')
    .in('order_id', orderIds)

  if (!breakdowns || breakdowns.length === 0) return []

  // Aggregate by country + tax_type
  const map = new Map<string, {
    country: string; taxType: string
    totalTax: number; totalNet: number; totalGross: number
    orderCount: number; reverseChargeCount: number
  }>()

  for (const b of breakdowns) {
    const key = `${b.tax_country}_${b.tax_type}`
    const existing = map.get(key) || {
      country: b.tax_country,
      taxType: b.tax_type,
      totalTax: 0, totalNet: 0, totalGross: 0,
      orderCount: 0, reverseChargeCount: 0,
    }
    existing.totalTax += parseFloat(String(b.tax_amount || 0))
    existing.totalNet += parseFloat(String(b.net_amount || 0))
    existing.totalGross += parseFloat(String(b.gross_amount || 0))
    existing.orderCount += 1
    if (b.reverse_charge_flag) existing.reverseChargeCount += 1
    map.set(key, existing)
  }

  return Array.from(map.values()).sort((a, b) => b.totalTax - a.totalTax)
}

/**
 * Get aggregated VAT by country for admin overview
 */
export async function getVATByCountry(
  startDate?: string,
  endDate?: string
): Promise<Array<{ country: string; totalTax: number; orderCount: number }>> {
  let query = supabaseAdmin
    .from('order_tax_breakdown')
    .select('tax_country, tax_amount')

  if (startDate) query = query.gte('created_at', startDate)
  if (endDate) query = query.lte('created_at', endDate)

  const { data } = await query

  if (!data || data.length === 0) return []

  const map = new Map<string, { country: string; totalTax: number; orderCount: number }>()
  for (const row of data) {
    const existing = map.get(row.tax_country) || { country: row.tax_country, totalTax: 0, orderCount: 0 }
    existing.totalTax += parseFloat(String(row.tax_amount || 0))
    existing.orderCount += 1
    map.set(row.tax_country, existing)
  }

  return Array.from(map.values()).sort((a, b) => b.totalTax - a.totalTax)
}

// ─── Helpers ────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
