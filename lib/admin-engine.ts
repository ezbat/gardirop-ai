import { supabaseAdmin } from '@/lib/supabase-admin'

// ═══════════════════════════════════════════════════════════
// WEARO Admin Engine - Platform Management
// Real database aggregation. NO mock data. NO hardcoded values.
// All functions verify admin authorization before execution.
// ═══════════════════════════════════════════════════════════

// ─── TYPES ─────────────────────────────────────────────────

export interface PlatformStats {
  totalUsers: number
  totalSellers: number
  totalOrders: number
  totalRevenue: number
  activeProducts: number
  pendingSellers: number
  pendingProducts: number
  pendingWithdrawals: number
  openDisputes: number
}

export interface DailyRevenueBreakdown {
  date: string
  revenue: number
  orders: number
  platformFees: number
}

export interface PlatformRevenueResult {
  totalRevenue: number
  totalPlatformFees: number
  totalSellerEarnings: number
  orderCount: number
  averageOrderValue: number
  daily: DailyRevenueBreakdown[]
}

export interface SellerApplication {
  id: string
  user_id: string
  shop_name: string
  shop_description: string | null
  business_type: string | null
  tax_number: string | null
  phone: string | null
  address: string | null
  city: string | null
  country: string | null
  status: string
  created_at: string
  reviewed_at: string | null
  reviewed_by: string | null
  rejection_reason: string | null
}

export interface AdminUser {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: string
  is_banned: boolean
  ban_reason: string | null
  created_at: string
}

export interface UserActivity {
  orders: Array<{
    id: string
    status: string
    total_amount: number
    payment_status: string
    created_at: string
  }>
  reviews: Array<{
    id: string
    product_id: string
    rating: number
    comment: string | null
    status: string
    created_at: string
  }>
  reports: Array<{
    id: string
    action_type: string
    target_type: string
    target_id: string
    created_at: string
  }>
  totalSpent: number
  orderCount: number
  reviewCount: number
}

export interface PendingProduct {
  id: string
  title: string
  description: string | null
  price: number
  images: string[]
  category: string | null
  moderation_status: string
  created_at: string
  seller: {
    id: string
    shop_name: string
    user_id: string
  } | null
}

export interface FlaggedContent {
  id: string
  content_type: string
  content_id: string
  reason: string | null
  status: string
  created_at: string
}

export interface WithdrawalRequest {
  id: string
  seller_id: string
  amount: number
  method: string
  status: string
  admin_notes: string | null
  processed_by: string | null
  processed_at: string | null
  created_at: string
  seller: {
    id: string
    shop_name: string
    phone: string | null
    user_id: string
  } | null
}

export interface PlatformFeesSummary {
  totalFees: number
  totalOrderRevenue: number
  feePercentage: number
  orderCount: number
  periodStart: string | null
  periodEnd: string | null
}

export interface SellerPayout {
  id: string
  seller_id: string
  net_amount: number
  status: string
  completed_at: string | null
  created_at: string
  seller?: {
    id: string
    shop_name: string
    user_id: string
  } | null
}

export interface AdminActionResult {
  success: boolean
  error?: string
}

// ─── ADMIN AUTHORIZATION ───────────────────────────────────

/**
 * Verify that the given userId belongs to an admin.
 * Checks the admins table first, then falls back to users.role = 'admin'.
 * Throws an error if the user is not an admin.
 */
export async function verifyAdmin(userId: string): Promise<void> {
  // Check the admins table first
  const { data: adminEntry } = await supabaseAdmin
    .from('admins')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (adminEntry) return

  // Fallback: check users table role
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', userId)
    .single()

  if (user?.role === 'admin') return

  throw new Error('FORBIDDEN: Admin access required')
}

// ═══════════════════════════════════════════════════════════
// 1. PLATFORM OVERVIEW
// ═══════════════════════════════════════════════════════════

/**
 * Get platform-wide statistics.
 * Total users, sellers, orders, revenue, active products from real DB.
 */
export async function getPlatformStats(adminUserId: string): Promise<PlatformStats> {
  await verifyAdmin(adminUserId)

  const [
    { count: totalUsers },
    { count: totalSellers },
    { count: pendingSellers },
    { count: totalOrders },
    { count: activeProducts },
    { count: pendingProducts },
    { count: pendingWithdrawals },
    { count: openDisputes },
    { data: paidOrders },
  ] = await Promise.all([
    supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true }),
    supabaseAdmin
      .from('sellers')
      .select('*', { count: 'exact', head: true })
      .in('status', ['approved', 'active']),
    supabaseAdmin
      .from('seller_applications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabaseAdmin
      .from('orders')
      .select('*', { count: 'exact', head: true }),
    supabaseAdmin
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('moderation_status', 'approved'),
    supabaseAdmin
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('moderation_status', 'pending'),
    supabaseAdmin
      .from('withdrawal_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabaseAdmin
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .in('status', ['DISPUTE_OPENED', 'RETURN_REQUESTED']),
    supabaseAdmin
      .from('orders')
      .select('total_amount')
      .eq('payment_status', 'paid'),
  ])

  const totalRevenue = (paidOrders || []).reduce(
    (sum, o) => sum + parseFloat(o.total_amount || '0'),
    0
  )

  return {
    totalUsers: totalUsers || 0,
    totalSellers: totalSellers || 0,
    totalOrders: totalOrders || 0,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    activeProducts: activeProducts || 0,
    pendingSellers: pendingSellers || 0,
    pendingProducts: pendingProducts || 0,
    pendingWithdrawals: pendingWithdrawals || 0,
    openDisputes: openDisputes || 0,
  }
}

/**
 * Get platform-wide revenue with daily breakdown.
 * @param period Number of days to look back (default 30)
 */
export async function getPlatformRevenue(
  adminUserId: string,
  period: number = 30
): Promise<PlatformRevenueResult> {
  await verifyAdmin(adminUserId)

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - (period - 1))
  startDate.setHours(0, 0, 0, 0)

  const { data: orders, error } = await supabaseAdmin
    .from('orders')
    .select('total_amount, platform_fee, seller_earnings, created_at')
    .eq('payment_status', 'paid')
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: true })

  if (error || !orders) {
    return {
      totalRevenue: 0,
      totalPlatformFees: 0,
      totalSellerEarnings: 0,
      orderCount: 0,
      averageOrderValue: 0,
      daily: generateEmptyDays(period),
    }
  }

  // Build daily map
  const dailyMap = new Map<string, DailyRevenueBreakdown>()
  for (let i = 0; i < period; i++) {
    const d = new Date()
    d.setDate(d.getDate() - (period - 1 - i))
    const dateKey = d.toISOString().split('T')[0]
    dailyMap.set(dateKey, {
      date: dateKey,
      revenue: 0,
      orders: 0,
      platformFees: 0,
    })
  }

  let totalRevenue = 0
  let totalPlatformFees = 0
  let totalSellerEarnings = 0

  for (const order of orders) {
    const dateKey = order.created_at.split('T')[0]
    const total = parseFloat(order.total_amount || '0')
    const fee = parseFloat(order.platform_fee || '0')
    const earning = parseFloat(order.seller_earnings || '0')

    totalRevenue += total
    totalPlatformFees += fee
    totalSellerEarnings += earning

    const day = dailyMap.get(dateKey)
    if (day) {
      day.revenue += total
      day.orders += 1
      day.platformFees += fee
    }
  }

  const daily = Array.from(dailyMap.values()).map(d => ({
    ...d,
    revenue: Math.round(d.revenue * 100) / 100,
    platformFees: Math.round(d.platformFees * 100) / 100,
  }))

  return {
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalPlatformFees: Math.round(totalPlatformFees * 100) / 100,
    totalSellerEarnings: Math.round(totalSellerEarnings * 100) / 100,
    orderCount: orders.length,
    averageOrderValue: orders.length > 0
      ? Math.round((totalRevenue / orders.length) * 100) / 100
      : 0,
    daily,
  }
}

function generateEmptyDays(days: number): DailyRevenueBreakdown[] {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (days - 1 - i))
    return {
      date: d.toISOString().split('T')[0],
      revenue: 0,
      orders: 0,
      platformFees: 0,
    }
  })
}

/**
 * Get seller applications filtered by status.
 * @param status Optional filter: 'pending' | 'approved' | 'rejected'
 */
export async function getSellerRequests(
  adminUserId: string,
  status?: string
): Promise<SellerApplication[]> {
  await verifyAdmin(adminUserId)

  let query = supabaseAdmin
    .from('seller_applications')
    .select('*')
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch seller requests: ${error.message}`)
  }

  return data || []
}

/**
 * Process a seller application: approve or reject.
 * On approval, creates the seller record and initializes the seller balance.
 * On rejection, records the reason.
 */
export async function reviewSellerRequest(
  requestId: string,
  adminUserId: string,
  action: 'approve' | 'reject',
  reason?: string
): Promise<AdminActionResult> {
  await verifyAdmin(adminUserId)

  // Fetch the application
  const { data: application, error: fetchError } = await supabaseAdmin
    .from('seller_applications')
    .select('*')
    .eq('id', requestId)
    .single()

  if (fetchError || !application) {
    return { success: false, error: 'Seller application not found' }
  }

  if (application.status !== 'pending') {
    return { success: false, error: `Application already ${application.status}` }
  }

  if (action === 'approve') {
    // Generate unique shop slug
    const shopSlug = application.shop_name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      + '-' + Date.now().toString().slice(-6)

    // Create seller record
    const { data: seller, error: sellerError } = await supabaseAdmin
      .from('sellers')
      .insert({
        user_id: application.user_id,
        shop_name: application.shop_name,
        shop_slug: shopSlug,
        shop_description: application.shop_description,
        business_type: application.business_type,
        tax_number: application.tax_number,
        phone: application.phone,
        address: application.address,
        city: application.city,
        country: application.country,
        status: 'approved',
      })
      .select()
      .single()

    if (sellerError) {
      return { success: false, error: `Failed to create seller: ${sellerError.message}` }
    }

    // Initialize seller balance
    await supabaseAdmin
      .from('seller_balances')
      .upsert({
        seller_id: seller.id,
        available_balance: 0,
        pending_balance: 0,
        total_withdrawn: 0,
        total_sales: 0,
      }, { onConflict: 'seller_id' })

    // Update user role
    await supabaseAdmin
      .from('users')
      .update({ role: 'seller' })
      .eq('id', application.user_id)

    // Update application status
    await supabaseAdmin
      .from('seller_applications')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: adminUserId,
      })
      .eq('id', requestId)

    // Log admin action
    await logAdminAction(adminUserId, 'approve_seller', 'seller_application', requestId, {
      seller_id: seller.id,
      shop_name: application.shop_name,
    })

    return { success: true }
  } else {
    // Reject
    await supabaseAdmin
      .from('seller_applications')
      .update({
        status: 'rejected',
        rejection_reason: reason || 'Application did not meet requirements',
        reviewed_at: new Date().toISOString(),
        reviewed_by: adminUserId,
      })
      .eq('id', requestId)

    await logAdminAction(adminUserId, 'reject_seller', 'seller_application', requestId, {
      reason,
      shop_name: application.shop_name,
    })

    return { success: true }
  }
}

/**
 * Get recent orders across the entire platform.
 * @param limit Number of orders to return (default 20)
 */
export async function getRecentOrders(
  adminUserId: string,
  limit: number = 20
): Promise<Array<{
  id: string
  order_number: string | null
  user_id: string
  seller_id: string | null
  status: string
  payment_status: string
  total_amount: number
  platform_fee: number
  created_at: string
  user: { email: string; full_name: string | null } | null
}>> {
  await verifyAdmin(adminUserId)

  const { data: orders, error } = await supabaseAdmin
    .from('orders')
    .select(`
      id, order_number, user_id, seller_id, status, payment_status,
      total_amount, platform_fee, created_at,
      user:users(email, full_name)
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(`Failed to fetch recent orders: ${error.message}`)
  }

  return (orders || []).map((o: any) => ({
    id: o.id,
    order_number: o.order_number,
    user_id: o.user_id,
    seller_id: o.seller_id,
    status: o.status,
    payment_status: o.payment_status,
    total_amount: parseFloat(o.total_amount || '0'),
    platform_fee: parseFloat(o.platform_fee || '0'),
    created_at: o.created_at,
    user: o.user,
  }))
}

/**
 * Get orders with disputes or return requests.
 */
export async function getDisputedOrders(
  adminUserId: string
): Promise<Array<{
  id: string
  order_number: string | null
  user_id: string
  seller_id: string | null
  status: string
  payment_status: string
  total_amount: number
  created_at: string
  user: { email: string; full_name: string | null } | null
}>> {
  await verifyAdmin(adminUserId)

  const { data: orders, error } = await supabaseAdmin
    .from('orders')
    .select(`
      id, order_number, user_id, seller_id, status, payment_status,
      total_amount, created_at,
      user:users(email, full_name)
    `)
    .in('status', ['DISPUTE_OPENED', 'RETURN_REQUESTED', 'RETURN_APPROVED'])
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch disputed orders: ${error.message}`)
  }

  return (orders || []).map((o: any) => ({
    id: o.id,
    order_number: o.order_number,
    user_id: o.user_id,
    seller_id: o.seller_id,
    status: o.status,
    payment_status: o.payment_status,
    total_amount: parseFloat(o.total_amount || '0'),
    created_at: o.created_at,
    user: o.user,
  }))
}

// ═══════════════════════════════════════════════════════════
// 2. USER MANAGEMENT
// ═══════════════════════════════════════════════════════════

/**
 * List and search users with optional filters.
 */
export async function getUsers(
  adminUserId: string,
  options: {
    search?: string
    role?: string
    status?: 'active' | 'banned'
    limit?: number
    offset?: number
  } = {}
): Promise<{ users: AdminUser[]; total: number }> {
  await verifyAdmin(adminUserId)

  const { search, role, status, limit = 50, offset = 0 } = options

  // Count query
  let countQuery = supabaseAdmin
    .from('users')
    .select('*', { count: 'exact', head: true })

  // Data query
  let dataQuery = supabaseAdmin
    .from('users')
    .select('id, email, full_name, avatar_url, role, is_banned, ban_reason, created_at')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  // Apply filters
  if (search) {
    const searchFilter = `email.ilike.%${search}%,full_name.ilike.%${search}%`
    countQuery = countQuery.or(searchFilter)
    dataQuery = dataQuery.or(searchFilter)
  }

  if (role && role !== 'all') {
    countQuery = countQuery.eq('role', role)
    dataQuery = dataQuery.eq('role', role)
  }

  if (status === 'banned') {
    countQuery = countQuery.eq('is_banned', true)
    dataQuery = dataQuery.eq('is_banned', true)
  } else if (status === 'active') {
    countQuery = countQuery.or('is_banned.is.null,is_banned.eq.false')
    dataQuery = dataQuery.or('is_banned.is.null,is_banned.eq.false')
  }

  const [{ count }, { data: users, error }] = await Promise.all([countQuery, dataQuery])

  if (error) {
    throw new Error(`Failed to fetch users: ${error.message}`)
  }

  return {
    users: (users || []) as AdminUser[],
    total: count || 0,
  }
}

/**
 * Suspend a user account.
 * Sets is_banned = true and records the reason and admin who took action.
 */
export async function suspendUser(
  userId: string,
  adminUserId: string,
  reason: string
): Promise<AdminActionResult> {
  await verifyAdmin(adminUserId)

  if (userId === adminUserId) {
    return { success: false, error: 'Cannot suspend your own account' }
  }

  const { error } = await supabaseAdmin
    .from('users')
    .update({
      is_banned: true,
      banned_at: new Date().toISOString(),
      ban_reason: reason,
    })
    .eq('id', userId)

  if (error) {
    return { success: false, error: `Failed to suspend user: ${error.message}` }
  }

  // If the user is a seller, also suspend their seller account
  const { data: seller } = await supabaseAdmin
    .from('sellers')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (seller) {
    await supabaseAdmin
      .from('sellers')
      .update({ status: 'suspended' })
      .eq('id', seller.id)
  }

  await logAdminAction(adminUserId, 'suspend_user', 'user', userId, { reason })

  return { success: true }
}

/**
 * Unsuspend / reactivate a user account.
 */
export async function unsuspendUser(
  userId: string,
  adminUserId: string
): Promise<AdminActionResult> {
  await verifyAdmin(adminUserId)

  const { error } = await supabaseAdmin
    .from('users')
    .update({
      is_banned: false,
      banned_at: null,
      ban_reason: null,
    })
    .eq('id', userId)

  if (error) {
    return { success: false, error: `Failed to unsuspend user: ${error.message}` }
  }

  // Reactivate seller account if one exists
  const { data: seller } = await supabaseAdmin
    .from('sellers')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (seller) {
    await supabaseAdmin
      .from('sellers')
      .update({ status: 'approved' })
      .eq('id', seller.id)
  }

  await logAdminAction(adminUserId, 'unsuspend_user', 'user', userId, {})

  return { success: true }
}

/**
 * Get detailed activity for a specific user.
 * Includes orders, reviews, and any admin actions targeting this user.
 */
export async function getUserActivity(
  adminUserId: string,
  userId: string
): Promise<UserActivity> {
  await verifyAdmin(adminUserId)

  const [ordersResult, reviewsResult, reportsResult] = await Promise.all([
    supabaseAdmin
      .from('orders')
      .select('id, status, total_amount, payment_status, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50),
    supabaseAdmin
      .from('reviews')
      .select('id, product_id, rating, comment, status, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50),
    supabaseAdmin
      .from('admin_actions')
      .select('id, action_type, target_type, target_id, created_at')
      .eq('target_id', userId)
      .eq('target_type', 'user')
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const orders = (ordersResult.data || []).map(o => ({
    ...o,
    total_amount: parseFloat(o.total_amount || '0'),
  }))

  const totalSpent = orders
    .filter(o => o.payment_status === 'paid')
    .reduce((sum, o) => sum + o.total_amount, 0)

  return {
    orders,
    reviews: reviewsResult.data || [],
    reports: reportsResult.data || [],
    totalSpent: Math.round(totalSpent * 100) / 100,
    orderCount: orders.length,
    reviewCount: (reviewsResult.data || []).length,
  }
}

// ═══════════════════════════════════════════════════════════
// 3. CONTENT MODERATION
// ═══════════════════════════════════════════════════════════

/**
 * Get products awaiting moderation (moderation_status = 'pending').
 */
export async function getPendingProducts(
  adminUserId: string
): Promise<PendingProduct[]> {
  await verifyAdmin(adminUserId)

  const { data: products, error } = await supabaseAdmin
    .from('products')
    .select(`
      id, title, description, price, images, category,
      moderation_status, created_at,
      seller:sellers(id, shop_name, user_id)
    `)
    .eq('moderation_status', 'pending')
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch pending products: ${error.message}`)
  }

  return (products || []).map((p: any) => ({
    id: p.id,
    title: p.title,
    description: p.description,
    price: parseFloat(p.price || '0'),
    images: p.images || [],
    category: p.category,
    moderation_status: p.moderation_status,
    created_at: p.created_at,
    seller: p.seller,
  }))
}

/**
 * Approve or reject a product.
 */
export async function moderateProduct(
  productId: string,
  adminUserId: string,
  action: 'approve' | 'reject',
  reason?: string
): Promise<AdminActionResult> {
  await verifyAdmin(adminUserId)

  const moderationStatus = action === 'approve' ? 'approved' : 'rejected'

  const updateData: Record<string, unknown> = {
    moderation_status: moderationStatus,
    moderated_by: adminUserId,
    moderated_at: new Date().toISOString(),
  }

  if (reason) {
    updateData.moderation_notes = reason
  }

  const { error } = await supabaseAdmin
    .from('products')
    .update(updateData)
    .eq('id', productId)

  if (error) {
    return { success: false, error: `Failed to moderate product: ${error.message}` }
  }

  await logAdminAction(adminUserId, `${moderationStatus}_product`, 'product', productId, {
    action,
    reason,
  })

  return { success: true }
}

/**
 * Get flagged/reported content.
 * Checks reviews with status 'flagged' and products with moderation_status 'flagged'.
 */
export async function getFlaggedContent(
  adminUserId: string
): Promise<{
  flaggedReviews: Array<{
    id: string
    product_id: string
    user_id: string
    rating: number
    comment: string | null
    status: string
    created_at: string
  }>
  flaggedProducts: Array<{
    id: string
    title: string
    seller_id: string | null
    moderation_status: string
    moderation_notes: string | null
    created_at: string
  }>
}> {
  await verifyAdmin(adminUserId)

  const [reviewsResult, productsResult] = await Promise.all([
    supabaseAdmin
      .from('reviews')
      .select('id, product_id, user_id, rating, comment, status, created_at')
      .eq('status', 'flagged')
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('products')
      .select('id, title, seller_id, moderation_status, moderation_notes, created_at')
      .eq('moderation_status', 'flagged')
      .order('created_at', { ascending: false }),
  ])

  return {
    flaggedReviews: reviewsResult.data || [],
    flaggedProducts: productsResult.data || [],
  }
}

// ═══════════════════════════════════════════════════════════
// 4. FINANCIAL ADMIN
// ═══════════════════════════════════════════════════════════

/**
 * Get all pending seller withdrawal requests.
 */
export async function getPendingWithdrawals(
  adminUserId: string
): Promise<WithdrawalRequest[]> {
  await verifyAdmin(adminUserId)

  const { data: requests, error } = await supabaseAdmin
    .from('withdrawal_requests')
    .select(`
      *,
      seller:sellers(id, shop_name, phone, user_id)
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch pending withdrawals: ${error.message}`)
  }

  return (requests || []).map((r: any) => ({
    id: r.id,
    seller_id: r.seller_id,
    amount: parseFloat(r.amount || '0'),
    method: r.method,
    status: r.status,
    admin_notes: r.admin_notes,
    processed_by: r.processed_by,
    processed_at: r.processed_at,
    created_at: r.created_at,
    seller: r.seller,
  }))
}

/**
 * Process a withdrawal request: approve or reject.
 * On approval, deducts from seller's available_balance and increments total_withdrawn.
 * Records a seller_transaction for audit trail.
 */
export async function processWithdrawal(
  withdrawalId: string,
  adminUserId: string,
  action: 'approve' | 'reject'
): Promise<AdminActionResult> {
  await verifyAdmin(adminUserId)

  // Fetch the withdrawal request
  const { data: request, error: fetchError } = await supabaseAdmin
    .from('withdrawal_requests')
    .select('*, seller:sellers(id)')
    .eq('id', withdrawalId)
    .single()

  if (fetchError || !request) {
    return { success: false, error: 'Withdrawal request not found' }
  }

  if (request.status !== 'pending') {
    return { success: false, error: `Request already ${request.status}` }
  }

  const newStatus = action === 'approve' ? 'completed' : 'rejected'

  if (action === 'approve') {
    // Verify seller has sufficient balance
    const { data: balance } = await supabaseAdmin
      .from('seller_balances')
      .select('available_balance, total_withdrawn')
      .eq('seller_id', request.seller_id)
      .single()

    if (!balance) {
      return { success: false, error: 'Seller balance record not found' }
    }

    const amount = parseFloat(request.amount || '0')

    if (parseFloat(balance.available_balance || '0') < amount) {
      return { success: false, error: 'Insufficient seller balance' }
    }

    // Deduct from balance
    const { error: balanceError } = await supabaseAdmin
      .from('seller_balances')
      .update({
        available_balance: parseFloat(balance.available_balance) - amount,
        total_withdrawn: parseFloat(balance.total_withdrawn) + amount,
      })
      .eq('seller_id', request.seller_id)

    if (balanceError) {
      return { success: false, error: `Balance update failed: ${balanceError.message}` }
    }

    // Record transaction
    await supabaseAdmin
      .from('seller_transactions')
      .insert({
        seller_id: request.seller_id,
        type: 'withdrawal',
        amount: amount,
        commission_amount: 0,
        net_amount: -amount,
        status: 'completed',
        description: `Withdrawal approved - ${request.method}`,
      })
  }

  // Update the withdrawal request
  const { error: updateError } = await supabaseAdmin
    .from('withdrawal_requests')
    .update({
      status: newStatus,
      processed_by: adminUserId,
      processed_at: new Date().toISOString(),
    })
    .eq('id', withdrawalId)

  if (updateError) {
    return { success: false, error: `Failed to update request: ${updateError.message}` }
  }

  await logAdminAction(adminUserId, `${action}_withdrawal`, 'withdrawal_request', withdrawalId, {
    amount: request.amount,
    method: request.method,
    seller_id: request.seller_id,
  })

  return { success: true }
}

/**
 * Get total platform fees collected within a date range.
 * Aggregates platform_fee from all paid orders.
 */
export async function getPlatformFeesSummary(
  adminUserId: string,
  startDate?: string,
  endDate?: string
): Promise<PlatformFeesSummary> {
  await verifyAdmin(adminUserId)

  let query = supabaseAdmin
    .from('orders')
    .select('total_amount, platform_fee, created_at')
    .in('payment_status', ['paid', 'PAID'])

  if (startDate) query = query.gte('created_at', startDate)
  if (endDate) query = query.lte('created_at', endDate)

  const { data: orders, error } = await query

  if (error || !orders || orders.length === 0) {
    return {
      totalFees: 0,
      totalOrderRevenue: 0,
      feePercentage: 0,
      orderCount: 0,
      periodStart: startDate || null,
      periodEnd: endDate || null,
    }
  }

  const totalOrderRevenue = orders.reduce(
    (sum, o) => sum + parseFloat(o.total_amount || '0'),
    0
  )

  const totalFees = orders.reduce(
    (sum, o) => sum + parseFloat(o.platform_fee || '0'),
    0
  )

  return {
    totalFees: Math.round(totalFees * 100) / 100,
    totalOrderRevenue: Math.round(totalOrderRevenue * 100) / 100,
    feePercentage: totalOrderRevenue > 0
      ? Math.round((totalFees / totalOrderRevenue) * 10000) / 100
      : 0,
    orderCount: orders.length,
    periodStart: startDate || null,
    periodEnd: endDate || null,
  }
}

/**
 * Get payout history for a specific seller or all sellers.
 * Returns completed and pending payouts from seller_payouts.
 */
export async function getSellerPayoutHistory(
  adminUserId: string,
  sellerId?: string
): Promise<{
  payouts: SellerPayout[]
  totalPaid: number
  totalPending: number
}> {
  await verifyAdmin(adminUserId)

  let query = supabaseAdmin
    .from('seller_payouts')
    .select(`
      id, seller_id, net_amount, status, completed_at, created_at,
      seller:sellers(id, shop_name, user_id)
    `)
    .order('created_at', { ascending: false })

  if (sellerId) {
    query = query.eq('seller_id', sellerId)
  }

  const { data: payouts, error } = await query

  if (error) {
    throw new Error(`Failed to fetch payout history: ${error.message}`)
  }

  const payoutList = (payouts || []).map((p: any) => ({
    id: p.id,
    seller_id: p.seller_id,
    net_amount: parseFloat(p.net_amount || '0'),
    status: p.status,
    completed_at: p.completed_at,
    created_at: p.created_at,
    seller: p.seller,
  }))

  const totalPaid = payoutList
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + p.net_amount, 0)

  const totalPending = payoutList
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + p.net_amount, 0)

  return {
    payouts: payoutList,
    totalPaid: Math.round(totalPaid * 100) / 100,
    totalPending: Math.round(totalPending * 100) / 100,
  }
}

// ═══════════════════════════════════════════════════════════
// INTERNAL: Admin Action Logging
// ═══════════════════════════════════════════════════════════

/**
 * Log an admin action to the admin_actions table for audit trail.
 */
async function logAdminAction(
  adminId: string,
  actionType: string,
  targetType: string,
  targetId: string,
  details: Record<string, unknown>
): Promise<void> {
  try {
    await supabaseAdmin
      .from('admin_actions')
      .insert({
        admin_id: adminId,
        action_type: actionType,
        target_type: targetType,
        target_id: targetId,
        details,
      })
  } catch (err) {
    // Logging should not break the primary operation
    console.error('Failed to log admin action:', err)
  }
}
