import { supabaseAdmin } from './supabase-admin'

// ═══════════════════════════════════════════════════════════
// WEARO Campaign & Coupon Engine
// Production-grade campaign management with real DB queries.
// Works with: campaigns, campaign_products, coupon_codes, ad_spend, orders
// ═══════════════════════════════════════════════════════════

// ─── Types ─────────────────────────────────────────────────

export type CampaignType =
  | 'percentage'
  | 'fixed_amount'
  | 'free_shipping'
  | 'buy_x_get_y'
  | 'flash_sale'

export type CampaignStatus =
  | 'draft'
  | 'scheduled'
  | 'active'
  | 'paused'
  | 'completed'
  | 'cancelled'

export interface CouponCode {
  id?: string
  code: string
  campaignId: string
  maxUses: number
  currentUses: number
  minOrderAmount: number
  expiresAt: string
}

export interface Campaign {
  id: string
  sellerId: string
  name: string
  type: CampaignType
  status: CampaignStatus
  budget: number
  spent: number
  revenueGenerated: number
  discountPercent: number | null
  discountAmount: number | null
  freeShipping: boolean
  buyX: number | null
  getY: number | null
  impressions: number
  clicks: number
  conversions: number
  startDate: string
  endDate: string
  createdAt: string
  updatedAt: string
}

export interface CreateCampaignData {
  name: string
  type: CampaignType
  budget: number
  discountPercent?: number
  discountAmount?: number
  freeShipping?: boolean
  buyX?: number
  getY?: number
  startDate: string
  endDate: string
  productIds?: string[]
  couponCode?: {
    code?: string
    maxUses?: number
    minOrderAmount?: number
  }
}

export interface CampaignAnalytics {
  campaign: Campaign
  products: Array<{ id: string; title: string; addedAt: string }>
  dailySpend: Array<{
    date: string
    impressions: number
    clicks: number
    spend: number
    revenue: number
    conversions: number
  }>
  coupons: CouponCode[]
  totalCouponRedemptions: number
  ctr: number
  conversionRate: number
  costPerConversion: number
  roas: number
}

export interface DiscountResult {
  discountAmount: number
  discountedTotal: number
  appliedType: CampaignType
  campaignName: string
  freeShipping: boolean
  description: string
}

export interface OrderItem {
  productId: string
  quantity: number
  price: number
}

// ─── Valid Status Transitions ──────────────────────────────

const VALID_STATUS_TRANSITIONS: Record<CampaignStatus, CampaignStatus[]> = {
  draft: ['scheduled', 'active', 'cancelled'],
  scheduled: ['active', 'paused', 'cancelled'],
  active: ['paused', 'completed', 'cancelled'],
  paused: ['active', 'cancelled'],
  completed: [],
  cancelled: [],
}

// ─── DB Type Mapping ───────────────────────────────────────
// The campaigns table has type CHECK ('discount', 'flash_sale', 'seasonal', 'sponsored')
// We map our richer CampaignType to the DB type and store details via discount columns

function campaignTypeToDbType(type: CampaignType): string {
  switch (type) {
    case 'percentage':
    case 'fixed_amount':
    case 'buy_x_get_y':
      return 'discount'
    case 'flash_sale':
      return 'flash_sale'
    case 'free_shipping':
      return 'seasonal' // use seasonal for free_shipping campaigns
  }
}

// The DB status CHECK is ('draft', 'active', 'paused', 'completed', 'cancelled')
// 'scheduled' is mapped to 'draft' in DB but tracked by start_date being in the future
function campaignStatusToDbStatus(status: CampaignStatus): string {
  if (status === 'scheduled') return 'draft'
  return status
}

function dbStatusToCampaignStatus(dbStatus: string, startDate: string): CampaignStatus {
  if (dbStatus === 'draft' && new Date(startDate) > new Date()) {
    return 'scheduled'
  }
  return dbStatus as CampaignStatus
}

// ─── Helpers ───────────────────────────────────────────────

function roundCents(value: number): number {
  return Math.round(value * 100) / 100
}

function parseMoney(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0
  const parsed = typeof value === 'string' ? parseFloat(value) : value
  return isNaN(parsed) ? 0 : parsed
}

function mapDbRowToCampaign(row: Record<string, unknown>): Campaign {
  const r = row as Record<string, string | number | null>
  return {
    id: r.id as string,
    sellerId: r.seller_id as string,
    name: r.name as string,
    type: mapDbTypeToCampaignType(r.type as string, r),
    status: dbStatusToCampaignStatus(r.status as string, r.start_date as string),
    budget: parseMoney(r.budget),
    spent: parseMoney(r.spent),
    revenueGenerated: parseMoney(r.revenue_generated),
    discountPercent: r.discount_percent !== null ? parseMoney(r.discount_percent) : null,
    discountAmount: r.discount_amount !== null && r.discount_amount !== undefined
      ? parseMoney(r.discount_amount)
      : null,
    freeShipping: (r.free_shipping as any) === true || (r.free_shipping as any) === 'true',
    buyX: r.buy_x !== null && r.buy_x !== undefined ? Number(r.buy_x) : null,
    getY: r.get_y !== null && r.get_y !== undefined ? Number(r.get_y) : null,
    impressions: Number(r.impressions || 0),
    clicks: Number(r.clicks || 0),
    conversions: Number(r.conversions || 0),
    startDate: r.start_date as string,
    endDate: r.end_date as string,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  }
}

function mapDbTypeToCampaignType(
  dbType: string,
  row: Record<string, unknown>
): CampaignType {
  if (dbType === 'flash_sale') return 'flash_sale'
  if (dbType === 'seasonal' && row.free_shipping) return 'free_shipping'
  if (row.buy_x && row.get_y) return 'buy_x_get_y'
  if (row.discount_amount && parseMoney(row.discount_amount as string) > 0) return 'fixed_amount'
  return 'percentage'
}

// ═══════════════════════════════════════════════════════════
// CAMPAIGN CRUD
// ═══════════════════════════════════════════════════════════

/**
 * Create a new campaign with validation.
 * Inserts into campaigns table, optionally links products and creates a coupon code.
 */
export async function createCampaign(
  sellerId: string,
  data: CreateCampaignData
): Promise<{ success: boolean; campaign?: Campaign; error?: string }> {
  // ── Validation ──
  if (!data.name || data.name.trim().length < 2) {
    return { success: false, error: 'Kampagnenname muss mindestens 2 Zeichen lang sein.' }
  }

  if (data.name.length > 100) {
    return { success: false, error: 'Kampagnenname darf maximal 100 Zeichen lang sein.' }
  }

  if (!data.budget || data.budget <= 0) {
    return { success: false, error: 'Budget muss groesser als 0 sein.' }
  }

  if (data.budget > 100_000) {
    return { success: false, error: 'Maximales Budget betraegt 100.000 EUR.' }
  }

  const startDate = new Date(data.startDate)
  const endDate = new Date(data.endDate)

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return { success: false, error: 'Ungueltige Datumsangaben.' }
  }

  if (endDate <= startDate) {
    return { success: false, error: 'Enddatum muss nach dem Startdatum liegen.' }
  }

  if (data.type === 'percentage') {
    if (!data.discountPercent || data.discountPercent <= 0 || data.discountPercent > 90) {
      return { success: false, error: 'Rabatt muss zwischen 1% und 90% liegen.' }
    }
  }

  if (data.type === 'fixed_amount') {
    if (!data.discountAmount || data.discountAmount <= 0) {
      return { success: false, error: 'Rabattbetrag muss groesser als 0 sein.' }
    }
  }

  if (data.type === 'buy_x_get_y') {
    if (!data.buyX || data.buyX < 1 || !data.getY || data.getY < 1) {
      return { success: false, error: 'Buy-X und Get-Y muessen mindestens 1 sein.' }
    }
  }

  // Determine initial status: if start_date is in the future, mark as scheduled (stored as draft)
  const now = new Date()
  const initialStatus: CampaignStatus = startDate > now ? 'scheduled' : 'active'

  // ── Insert campaign ──
  const insertData: Record<string, unknown> = {
    seller_id: sellerId,
    name: data.name.trim(),
    type: campaignTypeToDbType(data.type),
    status: campaignStatusToDbStatus(initialStatus),
    budget: data.budget,
    spent: 0,
    revenue_generated: 0,
    discount_percent: data.discountPercent || null,
    impressions: 0,
    clicks: 0,
    conversions: 0,
    start_date: data.startDate,
    end_date: data.endDate,
  }

  const { data: campaignRow, error: insertError } = await supabaseAdmin
    .from('campaigns')
    .insert(insertData)
    .select('*')
    .single()

  if (insertError || !campaignRow) {
    console.error('[CampaignEngine] Kampagne erstellen fehlgeschlagen:', insertError)
    return {
      success: false,
      error: `Kampagne konnte nicht erstellt werden: ${insertError?.message || 'Unbekannter Fehler'}`,
    }
  }

  const campaign = mapDbRowToCampaign(campaignRow)

  // ── Link products ──
  if (data.productIds && data.productIds.length > 0) {
    const productLinks = data.productIds.map((productId) => ({
      campaign_id: campaign.id,
      product_id: productId,
    }))

    const { error: linkError } = await supabaseAdmin
      .from('campaign_products')
      .insert(productLinks)

    if (linkError) {
      console.error('[CampaignEngine] Produkte verknuepfen fehlgeschlagen:', linkError)
    }
  }

  // ── Create coupon code ──
  if (data.couponCode) {
    const code = data.couponCode.code || generateCouponCode('WEARO')
    const { error: couponError } = await supabaseAdmin
      .from('coupon_codes')
      .insert({
        code: code.toUpperCase(),
        campaign_id: campaign.id,
        max_uses: data.couponCode.maxUses || 100,
        current_uses: 0,
        min_order_amount: data.couponCode.minOrderAmount || 0,
        expires_at: data.endDate,
      })

    if (couponError) {
      console.error('[CampaignEngine] Coupon erstellen fehlgeschlagen:', couponError)
      // Non-fatal: campaign was still created
    }
  }

  return { success: true, campaign }
}

// ═══════════════════════════════════════════════════════════
// STATUS MANAGEMENT
// ═══════════════════════════════════════════════════════════

/**
 * Update campaign status with valid transition checks.
 * Only the campaign owner (seller) can change status.
 */
export async function updateCampaignStatus(
  campaignId: string,
  sellerId: string,
  newStatus: CampaignStatus
): Promise<{ success: boolean; error?: string }> {
  // Fetch current campaign
  const { data: row, error: fetchError } = await supabaseAdmin
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .eq('seller_id', sellerId)
    .single()

  if (fetchError || !row) {
    return { success: false, error: 'Kampagne nicht gefunden oder kein Zugriff.' }
  }

  const campaign = mapDbRowToCampaign(row)
  const currentStatus = campaign.status

  // Check valid transitions
  const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus]
  if (!allowedTransitions || !allowedTransitions.includes(newStatus)) {
    return {
      success: false,
      error: `Uebergang von "${currentStatus}" zu "${newStatus}" ist nicht erlaubt.`,
    }
  }

  const dbStatus = campaignStatusToDbStatus(newStatus)

  const { error: updateError } = await supabaseAdmin
    .from('campaigns')
    .update({ status: dbStatus })
    .eq('id', campaignId)
    .eq('seller_id', sellerId)

  if (updateError) {
    console.error('[CampaignEngine] Status-Update fehlgeschlagen:', updateError)
    return { success: false, error: 'Status konnte nicht aktualisiert werden.' }
  }

  return { success: true }
}

// ═══════════════════════════════════════════════════════════
// PRODUCT MANAGEMENT
// ═══════════════════════════════════════════════════════════

/**
 * Add or replace products linked to a campaign.
 * Verifies campaign ownership before modifying.
 */
export async function addProductsToCampaign(
  campaignId: string,
  sellerId: string,
  productIds: string[]
): Promise<{ success: boolean; added: number; error?: string }> {
  // Verify ownership
  const { data: campaign, error: fetchError } = await supabaseAdmin
    .from('campaigns')
    .select('id, seller_id')
    .eq('id', campaignId)
    .eq('seller_id', sellerId)
    .single()

  if (fetchError || !campaign) {
    return { success: false, added: 0, error: 'Kampagne nicht gefunden oder kein Zugriff.' }
  }

  if (!productIds || productIds.length === 0) {
    return { success: false, added: 0, error: 'Keine Produkt-IDs angegeben.' }
  }

  // Verify products belong to the seller
  const { data: validProducts, error: productError } = await supabaseAdmin
    .from('products')
    .select('id')
    .eq('seller_id', sellerId)
    .in('id', productIds)

  if (productError || !validProducts) {
    return { success: false, added: 0, error: 'Produkte konnten nicht verifiziert werden.' }
  }

  const validProductIds = validProducts.map((p) => p.id)

  if (validProductIds.length === 0) {
    return { success: false, added: 0, error: 'Keine gueltigen Produkte gefunden.' }
  }

  // Upsert product links (ignore conflicts for already-linked products)
  const links = validProductIds.map((productId) => ({
    campaign_id: campaignId,
    product_id: productId,
  }))

  const { error: insertError } = await supabaseAdmin
    .from('campaign_products')
    .upsert(links, { onConflict: 'campaign_id,product_id', ignoreDuplicates: true })

  if (insertError) {
    console.error('[CampaignEngine] Produkte hinzufuegen fehlgeschlagen:', insertError)
    return { success: false, added: 0, error: 'Produkte konnten nicht verknuepft werden.' }
  }

  return { success: true, added: validProductIds.length }
}

/**
 * Remove specific products from a campaign.
 */
export async function removeProductsFromCampaign(
  campaignId: string,
  sellerId: string,
  productIds: string[]
): Promise<{ success: boolean; removed: number; error?: string }> {
  // Verify ownership
  const { data: campaign, error: fetchError } = await supabaseAdmin
    .from('campaigns')
    .select('id, seller_id')
    .eq('id', campaignId)
    .eq('seller_id', sellerId)
    .single()

  if (fetchError || !campaign) {
    return { success: false, removed: 0, error: 'Kampagne nicht gefunden oder kein Zugriff.' }
  }

  const { error: deleteError, count } = await supabaseAdmin
    .from('campaign_products')
    .delete({ count: 'exact' })
    .eq('campaign_id', campaignId)
    .in('product_id', productIds)

  if (deleteError) {
    return { success: false, removed: 0, error: 'Produkte konnten nicht entfernt werden.' }
  }

  return { success: true, removed: count || 0 }
}

// ═══════════════════════════════════════════════════════════
// COUPON CODE MANAGEMENT
// ═══════════════════════════════════════════════════════════

/**
 * Generate a unique coupon code with optional prefix.
 * Format: PREFIX-XXXXX (alphanumeric uppercase)
 */
export function generateCouponCode(prefix?: string): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no I/O/0/1 to avoid confusion
  let code = ''
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  const pfx = prefix ? prefix.toUpperCase().replace(/[^A-Z0-9]/g, '') : 'WEARO'
  return `${pfx}-${code}`
}

/**
 * Validate a coupon code at checkout.
 * Checks: existence, expiry, usage limits, minimum order amount, campaign active status.
 */
export async function validateCouponCode(
  code: string,
  sellerId: string,
  orderAmount: number
): Promise<{
  valid: boolean
  coupon?: CouponCode
  campaign?: Campaign
  error?: string
}> {
  if (!code || code.trim().length === 0) {
    return { valid: false, error: 'Kein Gutscheincode angegeben.' }
  }

  const normalizedCode = code.toUpperCase().trim()

  // Fetch coupon with associated campaign
  const { data: couponRow, error: couponError } = await supabaseAdmin
    .from('coupon_codes')
    .select(`
      id, code, campaign_id, max_uses, current_uses, min_order_amount, expires_at,
      campaign:campaigns!inner(
        id, seller_id, name, type, status, budget, spent, revenue_generated,
        discount_percent, impressions, clicks, conversions,
        start_date, end_date, created_at, updated_at
      )
    `)
    .eq('code', normalizedCode)
    .single()

  if (couponError || !couponRow) {
    return { valid: false, error: 'Gutscheincode nicht gefunden.' }
  }

  const row = couponRow as Record<string, unknown>
  const campaignData = row.campaign as Record<string, unknown>

  // Validate seller match
  if (campaignData.seller_id !== sellerId) {
    return { valid: false, error: 'Gutscheincode gilt nicht fuer diesen Shop.' }
  }

  // Check campaign status
  const dbStatus = campaignData.status as string
  if (dbStatus !== 'active') {
    return { valid: false, error: 'Kampagne ist nicht aktiv.' }
  }

  // Check campaign date range
  const now = new Date()
  const startDate = new Date(campaignData.start_date as string)
  const endDate = new Date(campaignData.end_date as string)

  if (now < startDate) {
    return { valid: false, error: 'Kampagne hat noch nicht begonnen.' }
  }

  if (now > endDate) {
    return { valid: false, error: 'Kampagne ist abgelaufen.' }
  }

  // Check coupon expiry
  const expiresAt = new Date(row.expires_at as string)
  if (now > expiresAt) {
    return { valid: false, error: 'Gutscheincode ist abgelaufen.' }
  }

  // Check usage limits
  const maxUses = Number(row.max_uses || 0)
  const currentUses = Number(row.current_uses || 0)
  if (maxUses > 0 && currentUses >= maxUses) {
    return { valid: false, error: 'Gutscheincode wurde bereits zu oft eingeloest.' }
  }

  // Check minimum order amount
  const minOrderAmount = parseMoney(row.min_order_amount as string)
  if (orderAmount < minOrderAmount) {
    return {
      valid: false,
      error: `Mindestbestellwert von ${minOrderAmount.toFixed(2)} EUR nicht erreicht.`,
    }
  }

  const coupon: CouponCode = {
    id: row.id as string,
    code: row.code as string,
    campaignId: row.campaign_id as string,
    maxUses,
    currentUses,
    minOrderAmount,
    expiresAt: row.expires_at as string,
  }

  const campaign = mapDbRowToCampaign(campaignData)

  return { valid: true, coupon, campaign }
}

/**
 * Apply a coupon code to an order.
 * Increments usage counter and records the discount on the campaign.
 * Returns the calculated discount.
 */
export async function applyCoupon(
  code: string,
  orderId: string,
  orderAmount: number,
  items: OrderItem[] = []
): Promise<{
  success: boolean
  discount?: DiscountResult
  error?: string
}> {
  // First validate
  // We need the seller_id from the order to validate the coupon
  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .select('id, seller_id, total_amount')
    .eq('id', orderId)
    .single()

  if (orderError || !order) {
    return { success: false, error: 'Bestellung nicht gefunden.' }
  }

  const validation = await validateCouponCode(code, order.seller_id, orderAmount)

  if (!validation.valid || !validation.coupon || !validation.campaign) {
    return { success: false, error: validation.error }
  }

  // Calculate the discount
  const discount = calculateDiscount(validation.campaign, orderAmount, items)

  if (discount.discountAmount <= 0) {
    return { success: false, error: 'Kein Rabatt anwendbar.' }
  }

  // Increment coupon usage
  const { error: updateCouponError } = await supabaseAdmin
    .from('coupon_codes')
    .update({
      current_uses: validation.coupon.currentUses + 1,
    })
    .eq('id', validation.coupon.id)

  if (updateCouponError) {
    console.error('[CampaignEngine] Coupon-Nutzung aktualisieren fehlgeschlagen:', updateCouponError)
    return { success: false, error: 'Gutschein konnte nicht eingeloest werden.' }
  }

  // Update campaign conversions and spent
  const { error: updateCampaignError } = await supabaseAdmin
    .from('campaigns')
    .update({
      conversions: validation.campaign.conversions + 1,
      spent: roundCents(validation.campaign.spent + discount.discountAmount),
    })
    .eq('id', validation.campaign.id)

  if (updateCampaignError) {
    console.error('[CampaignEngine] Kampagne aktualisieren fehlgeschlagen:', updateCampaignError)
  }

  // Store the applied coupon reference on the order (via coupon_code column if it exists)
  await supabaseAdmin
    .from('orders')
    .update({
      coupon_code: code.toUpperCase().trim(),
      discount_amount: discount.discountAmount,
    })
    .eq('id', orderId)
    // Silently ignore if columns don't exist
    .then(({ error }) => {
      if (error) {
        console.warn('[CampaignEngine] Bestellungs-Coupon-Update uebersprungen:', error.message)
      }
    })

  return { success: true, discount }
}

// ═══════════════════════════════════════════════════════════
// DISCOUNT CALCULATION
// ═══════════════════════════════════════════════════════════

/**
 * Calculate the actual discount for a campaign given the order amount and items.
 * Supports all campaign types: percentage, fixed_amount, free_shipping, buy_x_get_y, flash_sale.
 */
export function calculateDiscount(
  campaign: Campaign,
  orderAmount: number,
  items: OrderItem[] = []
): DiscountResult {
  let discountAmount = 0
  let freeShipping = false
  let description = ''

  switch (campaign.type) {
    case 'percentage': {
      const percent = campaign.discountPercent || 0
      discountAmount = roundCents(orderAmount * (percent / 100))
      description = `${percent}% Rabatt`
      break
    }

    case 'fixed_amount': {
      const fixedDiscount = campaign.discountAmount || campaign.discountPercent || 0
      // Fixed discount cannot exceed order total
      discountAmount = roundCents(Math.min(fixedDiscount, orderAmount))
      description = `${fixedDiscount.toFixed(2)} EUR Rabatt`
      break
    }

    case 'free_shipping': {
      // Free shipping doesn't reduce order amount but flags shipping as free
      discountAmount = 0
      freeShipping = true
      description = 'Kostenloser Versand'
      break
    }

    case 'buy_x_get_y': {
      const buyX = campaign.buyX || 2
      const getY = campaign.getY || 1

      // Calculate total items in the order
      const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0)

      if (totalQuantity >= buyX + getY) {
        // Find the cheapest Y items for the discount
        const sortedItems = expandAndSortItems(items)
        const freeItemCount = Math.min(
          getY,
          Math.floor(totalQuantity / (buyX + getY)) * getY
        )

        // Sum the cheapest items (they become free)
        for (let i = 0; i < freeItemCount && i < sortedItems.length; i++) {
          discountAmount += sortedItems[i]
        }
        discountAmount = roundCents(discountAmount)
      }

      description = `Kauf ${buyX}, erhalte ${getY} gratis`
      break
    }

    case 'flash_sale': {
      // Flash sale uses discount_percent with a time constraint (already validated by campaign dates)
      const flashPercent = campaign.discountPercent || 0
      discountAmount = roundCents(orderAmount * (flashPercent / 100))
      description = `Flash Sale: ${flashPercent}% Rabatt`
      break
    }

    default:
      description = 'Unbekannter Kampagnentyp'
  }

  // Ensure discount doesn't exceed budget remaining
  const budgetRemaining = roundCents(campaign.budget - campaign.spent)
  if (budgetRemaining > 0 && discountAmount > budgetRemaining) {
    discountAmount = budgetRemaining
  }

  // Discount cannot exceed order total
  discountAmount = Math.min(discountAmount, orderAmount)

  return {
    discountAmount: roundCents(discountAmount),
    discountedTotal: roundCents(orderAmount - discountAmount),
    appliedType: campaign.type,
    campaignName: campaign.name,
    freeShipping,
    description,
  }
}

/**
 * Expand order items into individual unit prices and sort ascending (cheapest first).
 * Used for buy_x_get_y to determine which items become free.
 */
function expandAndSortItems(items: OrderItem[]): number[] {
  const prices: number[] = []
  for (const item of items) {
    for (let i = 0; i < item.quantity; i++) {
      prices.push(item.price)
    }
  }
  return prices.sort((a, b) => a - b)
}

// ═══════════════════════════════════════════════════════════
// ANALYTICS
// ═══════════════════════════════════════════════════════════

/**
 * Get full analytics for a specific campaign.
 * Pulls data from campaigns, campaign_products, ad_spend, and coupon_codes tables.
 */
export async function getCampaignAnalytics(
  campaignId: string,
  sellerId: string
): Promise<{ success: boolean; analytics?: CampaignAnalytics; error?: string }> {
  // Fetch campaign with ownership check
  const { data: row, error: fetchError } = await supabaseAdmin
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .eq('seller_id', sellerId)
    .single()

  if (fetchError || !row) {
    return { success: false, error: 'Kampagne nicht gefunden oder kein Zugriff.' }
  }

  const campaign = mapDbRowToCampaign(row)

  // Fetch linked products, daily spend, and coupons in parallel
  const [productsResult, adSpendResult, couponsResult] = await Promise.all([
    supabaseAdmin
      .from('campaign_products')
      .select(`
        product_id, created_at,
        product:products(id, title)
      `)
      .eq('campaign_id', campaignId),

    supabaseAdmin
      .from('ad_spend')
      .select('date, impressions, clicks, spend, revenue, conversions')
      .eq('campaign_id', campaignId)
      .order('date', { ascending: true }),

    supabaseAdmin
      .from('coupon_codes')
      .select('id, code, campaign_id, max_uses, current_uses, min_order_amount, expires_at')
      .eq('campaign_id', campaignId),
  ])

  // Map products
  const products = (productsResult.data || []).map((p: Record<string, unknown>) => {
    const product = p.product as Record<string, unknown> | null
    return {
      id: p.product_id as string,
      title: (product?.title as string) || 'Unbekannt',
      addedAt: p.created_at as string,
    }
  })

  // Map daily ad spend
  const dailySpend = (adSpendResult.data || []).map((d: Record<string, unknown>) => ({
    date: d.date as string,
    impressions: Number(d.impressions || 0),
    clicks: Number(d.clicks || 0),
    spend: parseMoney(d.spend as string),
    revenue: parseMoney(d.revenue as string),
    conversions: Number(d.conversions || 0),
  }))

  // Map coupons
  const coupons: CouponCode[] = (couponsResult.data || []).map((c: Record<string, unknown>) => ({
    id: c.id as string,
    code: c.code as string,
    campaignId: c.campaign_id as string,
    maxUses: Number(c.max_uses || 0),
    currentUses: Number(c.current_uses || 0),
    minOrderAmount: parseMoney(c.min_order_amount as string),
    expiresAt: c.expires_at as string,
  }))

  const totalCouponRedemptions = coupons.reduce((sum, c) => sum + c.currentUses, 0)

  // Calculated metrics
  const ctr = campaign.impressions > 0
    ? roundCents((campaign.clicks / campaign.impressions) * 100)
    : 0

  const conversionRate = campaign.clicks > 0
    ? roundCents((campaign.conversions / campaign.clicks) * 100)
    : 0

  const costPerConversion = campaign.conversions > 0
    ? roundCents(campaign.spent / campaign.conversions)
    : 0

  const roas = campaign.spent > 0
    ? roundCents(campaign.revenueGenerated / campaign.spent)
    : 0

  const analytics: CampaignAnalytics = {
    campaign,
    products,
    dailySpend,
    coupons,
    totalCouponRedemptions,
    ctr,
    conversionRate,
    costPerConversion,
    roas,
  }

  return { success: true, analytics }
}

// ═══════════════════════════════════════════════════════════
// CAMPAIGN LISTING
// ═══════════════════════════════════════════════════════════

/**
 * Get all active campaigns for a seller.
 * Returns campaigns with status 'active' and within their date range.
 */
export async function getActiveCampaigns(
  sellerId: string
): Promise<Campaign[]> {
  const now = new Date().toISOString()

  const { data: rows, error } = await supabaseAdmin
    .from('campaigns')
    .select('*')
    .eq('seller_id', sellerId)
    .eq('status', 'active')
    .lte('start_date', now)
    .gte('end_date', now)
    .order('created_at', { ascending: false })

  if (error || !rows) {
    console.error('[CampaignEngine] Aktive Kampagnen abrufen fehlgeschlagen:', error)
    return []
  }

  return rows.map(mapDbRowToCampaign)
}

/**
 * Get all campaigns for a seller, optionally filtered by status.
 */
export async function getSellerCampaigns(
  sellerId: string,
  statusFilter?: CampaignStatus,
  limit: number = 50,
  offset: number = 0
): Promise<{ campaigns: Campaign[]; total: number }> {
  let query = supabaseAdmin
    .from('campaigns')
    .select('*', { count: 'exact' })
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (statusFilter) {
    const dbStatus = campaignStatusToDbStatus(statusFilter)
    query = query.eq('status', dbStatus)
  }

  const { data: rows, error, count } = await query

  if (error || !rows) {
    console.error('[CampaignEngine] Kampagnen abrufen fehlgeschlagen:', error)
    return { campaigns: [], total: 0 }
  }

  const campaigns = rows.map(mapDbRowToCampaign)

  // If filtering for 'scheduled', additionally filter by start_date being in the future
  const filteredCampaigns = statusFilter === 'scheduled'
    ? campaigns.filter((c) => c.status === 'scheduled')
    : campaigns

  return { campaigns: filteredCampaigns, total: count || 0 }
}

// ═══════════════════════════════════════════════════════════
// CAMPAIGN EXPIRY (CRON-READY)
// ═══════════════════════════════════════════════════════════

/**
 * Deactivate expired campaigns.
 * Designed to be called by a cron job (e.g., /api/cron/campaigns).
 * Finds all 'active' campaigns whose end_date has passed and marks them 'completed'.
 * Also activates 'draft' campaigns whose start_date has arrived.
 */
export async function deactivateExpiredCampaigns(): Promise<{
  expired: number
  activated: number
  errors: string[]
}> {
  const now = new Date().toISOString()
  const errors: string[] = []
  let expired = 0
  let activated = 0

  // ── Expire active campaigns past their end_date ──
  const { data: expiredCampaigns, error: expireError } = await supabaseAdmin
    .from('campaigns')
    .update({ status: 'completed' })
    .eq('status', 'active')
    .lt('end_date', now)
    .select('id')

  if (expireError) {
    console.error('[CampaignEngine] Kampagnen ablaufen fehlgeschlagen:', expireError)
    errors.push(`Ablaufen fehlgeschlagen: ${expireError.message}`)
  } else {
    expired = expiredCampaigns?.length || 0
  }

  // ── Activate scheduled (draft) campaigns whose start_date has arrived ──
  const { data: activatedCampaigns, error: activateError } = await supabaseAdmin
    .from('campaigns')
    .update({ status: 'active' })
    .eq('status', 'draft')
    .lte('start_date', now)
    .gte('end_date', now)
    .select('id')

  if (activateError) {
    console.error('[CampaignEngine] Kampagnen aktivieren fehlgeschlagen:', activateError)
    errors.push(`Aktivieren fehlgeschlagen: ${activateError.message}`)
  } else {
    activated = activatedCampaigns?.length || 0
  }

  if (expired > 0 || activated > 0) {
    console.log(
      `[CampaignEngine] Cron: ${expired} Kampagne(n) abgelaufen, ${activated} Kampagne(n) aktiviert.`
    )
  }

  return { expired, activated, errors }
}

// ═══════════════════════════════════════════════════════════
// CAMPAIGN METRICS UPDATE
// ═══════════════════════════════════════════════════════════

/**
 * Record an impression for a campaign.
 */
export async function recordImpression(campaignId: string): Promise<void> {
  const { data } = await supabaseAdmin
    .from('campaigns')
    .select('impressions')
    .eq('id', campaignId)
    .single()

  if (data) {
    await supabaseAdmin
      .from('campaigns')
      .update({ impressions: (data.impressions || 0) + 1 })
      .eq('id', campaignId)
  }
}

/**
 * Record a click for a campaign.
 */
export async function recordClick(campaignId: string): Promise<void> {
  const { data } = await supabaseAdmin
    .from('campaigns')
    .select('clicks')
    .eq('id', campaignId)
    .single()

  if (data) {
    await supabaseAdmin
      .from('campaigns')
      .update({ clicks: (data.clicks || 0) + 1 })
      .eq('id', campaignId)
  }
}

/**
 * Record a conversion and revenue for a campaign.
 */
export async function recordConversion(
  campaignId: string,
  revenueAmount: number
): Promise<void> {
  const { data } = await supabaseAdmin
    .from('campaigns')
    .select('conversions, revenue_generated')
    .eq('id', campaignId)
    .single()

  if (data) {
    await supabaseAdmin
      .from('campaigns')
      .update({
        conversions: (data.conversions || 0) + 1,
        revenue_generated: roundCents(parseMoney(data.revenue_generated) + revenueAmount),
      })
      .eq('id', campaignId)
  }
}

/**
 * Record daily ad spend for a campaign.
 * Upserts into ad_spend table (one row per campaign per day).
 */
export async function recordDailyAdSpend(
  campaignId: string,
  sellerId: string,
  data: {
    impressions?: number
    clicks?: number
    spend?: number
    revenue?: number
    conversions?: number
  }
): Promise<void> {
  const today = new Date().toISOString().split('T')[0]

  const { error } = await supabaseAdmin
    .from('ad_spend')
    .upsert(
      {
        campaign_id: campaignId,
        seller_id: sellerId,
        date: today,
        impressions: data.impressions || 0,
        clicks: data.clicks || 0,
        spend: data.spend || 0,
        revenue: data.revenue || 0,
        conversions: data.conversions || 0,
      },
      { onConflict: 'campaign_id,date' }
    )

  if (error) {
    console.error('[CampaignEngine] Ad-Spend aufzeichnen fehlgeschlagen:', error)
  }
}

// ═══════════════════════════════════════════════════════════
// CAMPAIGN BUDGET CHECK
// ═══════════════════════════════════════════════════════════

/**
 * Check if a campaign has remaining budget.
 * Automatically pauses campaigns that exceed their budget.
 */
export async function checkAndEnforceBudget(campaignId: string): Promise<{
  withinBudget: boolean
  remaining: number
}> {
  const { data: campaign, error } = await supabaseAdmin
    .from('campaigns')
    .select('budget, spent, status')
    .eq('id', campaignId)
    .single()

  if (error || !campaign) {
    return { withinBudget: false, remaining: 0 }
  }

  const budget = parseMoney(campaign.budget)
  const spent = parseMoney(campaign.spent)
  const remaining = roundCents(budget - spent)

  if (remaining <= 0 && campaign.status === 'active') {
    // Auto-pause campaign when budget is exhausted
    await supabaseAdmin
      .from('campaigns')
      .update({ status: 'completed' })
      .eq('id', campaignId)

    console.log(
      `[CampaignEngine] Kampagne ${campaignId} automatisch abgeschlossen: Budget erschoepft.`
    )
    return { withinBudget: false, remaining: 0 }
  }

  return { withinBudget: remaining > 0, remaining }
}

// ═══════════════════════════════════════════════════════════
// UTILITY: Get products for active campaign discount
// ═══════════════════════════════════════════════════════════

/**
 * Check if a product has any active campaign discounts.
 * Returns the best (highest) discount available.
 */
export async function getProductActiveDiscount(
  productId: string
): Promise<{
  hasDiscount: boolean
  discountPercent: number
  campaignName: string
  campaignId: string
} | null> {
  const now = new Date().toISOString()

  const { data: rows, error } = await supabaseAdmin
    .from('campaign_products')
    .select(`
      campaign_id,
      campaign:campaigns!inner(
        id, name, type, status, discount_percent,
        start_date, end_date
      )
    `)
    .eq('product_id', productId)
    .eq('campaign.status', 'active')
    .lte('campaign.start_date', now)
    .gte('campaign.end_date', now)

  if (error || !rows || rows.length === 0) return null

  // Find the best discount
  let bestDiscount = 0
  let bestCampaignName = ''
  let bestCampaignId = ''

  for (const row of rows as unknown as Array<{
    campaign_id: string
    campaign: { id: string; name: string; discount_percent: number | null }
  }>) {
    const percent = row.campaign?.discount_percent || 0
    if (percent > bestDiscount) {
      bestDiscount = percent
      bestCampaignName = row.campaign?.name || ''
      bestCampaignId = row.campaign?.id || ''
    }
  }

  if (bestDiscount <= 0) return null

  return {
    hasDiscount: true,
    discountPercent: bestDiscount,
    campaignName: bestCampaignName,
    campaignId: bestCampaignId,
  }
}
