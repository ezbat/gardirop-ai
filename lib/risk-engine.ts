import { supabaseAdmin } from './supabase-admin'
import { logger } from './logger'

// ─── Types ───────────────────────────────────────────────

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'
export type RiskAction = 'allow' | 'flag' | 'hold' | 'block'
export type EntityType = 'order' | 'withdrawal' | 'seller' | 'user'

interface RiskFactor {
  name: string
  score: number
  weight: number
  weighted_score: number
  detail: string
}

interface RiskAssessment {
  entity_type: EntityType
  entity_id: string
  score: number
  level: RiskLevel
  action: RiskAction
  factors: RiskFactor[]
}

// ─── Score → Level/Action Mapping ────────────────────────

function scoreToLevel(score: number): RiskLevel {
  if (score <= 30) return 'low'
  if (score <= 60) return 'medium'
  if (score <= 80) return 'high'
  return 'critical'
}

function levelToAction(level: RiskLevel): RiskAction {
  switch (level) {
    case 'low': return 'allow'
    case 'medium': return 'flag'
    case 'high': return 'hold'
    case 'critical': return 'block'
  }
}

// ─── Helper: Compute weighted score ──────────────────────

function computeRisk(factors: RiskFactor[]): { score: number; level: RiskLevel; action: RiskAction } {
  const score = Math.round(
    factors.reduce((sum, f) => sum + f.weighted_score, 0)
  )
  const clampedScore = Math.min(100, Math.max(0, score))
  const level = scoreToLevel(clampedScore)
  const action = levelToAction(level)
  return { score: clampedScore, level, action }
}

function factor(name: string, rawScore: number, weight: number, detail: string): RiskFactor {
  const clamped = Math.min(100, Math.max(0, rawScore))
  return {
    name,
    score: clamped,
    weight,
    weighted_score: Math.round(clamped * weight),
    detail,
  }
}

// ─── Persist Risk Score ──────────────────────────────────

async function persistRiskScore(assessment: RiskAssessment): Promise<void> {
  try {
    await supabaseAdmin.from('risk_scores').insert({
      entity_type: assessment.entity_type,
      entity_id: assessment.entity_id,
      score: assessment.score,
      level: assessment.level,
      factors: assessment.factors,
      action_taken: assessment.action,
    })
  } catch (err) {
    logger.error('Failed to persist risk score', {
      entity_type: assessment.entity_type,
      entity_id: assessment.entity_id,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}

// ═══════════════════════════════════════════════════════════
// ORDER RISK ASSESSMENT
// ═══════════════════════════════════════════════════════════

interface OrderRiskInput {
  orderId: string
  buyerId: string
  sellerId: string
  totalAmount: number
  ip: string
  couponUsed: boolean
  itemCount: number
}

export async function assessOrderRisk(input: OrderRiskInput): Promise<RiskAssessment> {
  const factors: RiskFactor[] = []

  // 1. Amount deviation (weight: 0.15)
  const { data: avgData } = await supabaseAdmin
    .from('orders')
    .select('total_amount')
    .eq('user_id', input.buyerId)
    .eq('payment_status', 'paid')
    .order('created_at', { ascending: false })
    .limit(20)

  if (avgData && avgData.length >= 3) {
    const avg = avgData.reduce((s, o) => s + Number(o.total_amount), 0) / avgData.length
    const deviation = avg > 0 ? Math.abs(input.totalAmount - avg) / avg : 0
    const deviationScore = deviation > 3 ? 100 : deviation > 2 ? 70 : deviation > 1 ? 40 : 10
    factors.push(factor('amount_deviation', deviationScore, 0.15,
      `Order €${input.totalAmount} vs avg €${avg.toFixed(2)} (${(deviation * 100).toFixed(0)}% deviation)`))
  } else {
    factors.push(factor('amount_deviation', 20, 0.15, 'Insufficient order history'))
  }

  // 2. Buyer account age (weight: 0.10)
  const { data: userData } = await supabaseAdmin
    .from('users')
    .select('created_at')
    .eq('id', input.buyerId)
    .single()

  if (userData) {
    const ageDays = (Date.now() - new Date(userData.created_at).getTime()) / (1000 * 60 * 60 * 24)
    const ageScore = ageDays < 1 ? 90 : ageDays < 7 ? 60 : ageDays < 30 ? 30 : 5
    factors.push(factor('buyer_age', ageScore, 0.10,
      `Account age: ${Math.floor(ageDays)} days`))
  } else {
    factors.push(factor('buyer_age', 50, 0.10, 'User not found'))
  }

  // 3. Order velocity (weight: 0.15)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count: recentOrders } = await supabaseAdmin
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', input.buyerId)
    .gte('created_at', oneHourAgo)

  const velocityCount = recentOrders || 0
  const velocityScore = velocityCount > 5 ? 100 : velocityCount > 3 ? 70 : velocityCount > 1 ? 30 : 5
  factors.push(factor('order_velocity', velocityScore, 0.15,
    `${velocityCount} orders in last hour`))

  // 4. IP risk (weight: 0.10)
  const { data: blockedIp } = await supabaseAdmin
    .from('blocked_ips')
    .select('id')
    .eq('ip_address', input.ip)
    .single()

  if (blockedIp) {
    factors.push(factor('ip_risk', 100, 0.10, `IP ${input.ip} is blocked`))
  } else {
    const { count: ipOrders } = await supabaseAdmin
      .from('orders')
      .select('user_id', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    const ipScore = (ipOrders || 0) > 50 ? 60 : 5
    factors.push(factor('ip_risk', ipScore, 0.10, `IP activity normal`))
  }

  // 5. Payment failure history (weight: 0.15)
  const { count: failedPayments } = await supabaseAdmin
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', input.buyerId)
    .eq('payment_status', 'failed')

  const failCount = failedPayments || 0
  const failScore = failCount > 5 ? 100 : failCount > 3 ? 70 : failCount > 1 ? 40 : 0
  factors.push(factor('payment_failures', failScore, 0.15,
    `${failCount} failed payments`))

  // 6. Coupon abuse (weight: 0.10)
  if (input.couponUsed) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { count: couponOrders } = await supabaseAdmin
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', input.buyerId)
      .not('coupon_code', 'is', null)
      .gte('created_at', thirtyDaysAgo)

    const couponCount = couponOrders || 0
    const couponScore = couponCount > 10 ? 90 : couponCount > 5 ? 50 : 10
    factors.push(factor('coupon_abuse', couponScore, 0.10,
      `${couponCount} coupon orders in 30d`))
  } else {
    factors.push(factor('coupon_abuse', 0, 0.10, 'No coupon used'))
  }

  // 7. Buyer purchase history (weight: 0.10)
  const { count: totalOrders } = await supabaseAdmin
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', input.buyerId)
    .eq('payment_status', 'paid')

  const historyCount = totalOrders || 0
  const historyScore = historyCount > 10 ? 0 : historyCount > 5 ? 10 : historyCount > 0 ? 30 : 60
  factors.push(factor('buyer_history', historyScore, 0.10,
    `${historyCount} successful orders`))

  // 8. High-value order flag (weight: 0.15)
  const amountScore = input.totalAmount > 500 ? 80 : input.totalAmount > 200 ? 40 : input.totalAmount > 100 ? 20 : 5
  factors.push(factor('order_amount', amountScore, 0.15,
    `Order amount: €${input.totalAmount}`))

  const { score, level, action } = computeRisk(factors)

  const assessment: RiskAssessment = {
    entity_type: 'order',
    entity_id: input.orderId,
    score,
    level,
    action,
    factors,
  }

  await persistRiskScore(assessment)

  logger.info('Order risk assessed', {
    orderId: input.orderId,
    score,
    level,
    action,
  })

  return assessment
}

// ═══════════════════════════════════════════════════════════
// WITHDRAWAL RISK ASSESSMENT
// ═══════════════════════════════════════════════════════════

interface WithdrawalRiskInput {
  sellerId: string
  amount: number
  availableBalance: number
}

export async function assessWithdrawalRisk(input: WithdrawalRiskInput): Promise<RiskAssessment> {
  const factors: RiskFactor[] = []

  // 1. Withdrawal frequency (weight: 0.20)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { count: recentWithdrawals } = await supabaseAdmin
    .from('seller_transactions')
    .select('id', { count: 'exact', head: true })
    .eq('seller_id', input.sellerId)
    .eq('type', 'withdrawal')
    .gte('created_at', sevenDaysAgo)

  const freqCount = recentWithdrawals || 0
  const freqScore = freqCount > 5 ? 100 : freqCount > 3 ? 70 : freqCount > 1 ? 30 : 5
  factors.push(factor('withdrawal_frequency', freqScore, 0.20,
    `${freqCount} withdrawals in 7d`))

  // 2. Amount deviation (weight: 0.25)
  const { data: prevWithdrawals } = await supabaseAdmin
    .from('seller_transactions')
    .select('amount')
    .eq('seller_id', input.sellerId)
    .eq('type', 'withdrawal')
    .order('created_at', { ascending: false })
    .limit(10)

  if (prevWithdrawals && prevWithdrawals.length >= 2) {
    const avg = prevWithdrawals.reduce((s, w) => s + Number(w.amount), 0) / prevWithdrawals.length
    const deviation = avg > 0 ? Math.abs(input.amount - avg) / avg : 0
    const devScore = deviation > 3 ? 100 : deviation > 2 ? 70 : deviation > 1 ? 40 : 10
    factors.push(factor('amount_deviation', devScore, 0.25,
      `€${input.amount} vs avg €${avg.toFixed(2)}`))
  } else {
    factors.push(factor('amount_deviation', 30, 0.25, 'Insufficient withdrawal history'))
  }

  // 3. Seller account age (weight: 0.15)
  const { data: sellerData } = await supabaseAdmin
    .from('sellers')
    .select('created_at')
    .eq('id', input.sellerId)
    .single()

  if (sellerData) {
    const ageDays = (Date.now() - new Date(sellerData.created_at).getTime()) / (1000 * 60 * 60 * 24)
    const ageScore = ageDays < 7 ? 90 : ageDays < 30 ? 60 : ageDays < 90 ? 30 : 5
    factors.push(factor('seller_age', ageScore, 0.15,
      `Seller age: ${Math.floor(ageDays)} days`))
  } else {
    factors.push(factor('seller_age', 50, 0.15, 'Seller not found'))
  }

  // 4. Dispute rate (weight: 0.20)
  const { count: totalSales } = await supabaseAdmin
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('seller_id', input.sellerId)
    .eq('payment_status', 'paid')

  const { count: disputeCount } = await supabaseAdmin
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('seller_id', input.sellerId)
    .eq('payment_status', 'disputed')

  const salesTotal = totalSales || 0
  const disputes = disputeCount || 0
  const disputeRate = salesTotal > 0 ? (disputes / salesTotal) * 100 : 0
  const disputeScore = disputeRate > 5 ? 100 : disputeRate > 2 ? 70 : disputeRate > 1 ? 40 : 5
  factors.push(factor('dispute_rate', disputeScore, 0.20,
    `${disputes}/${salesTotal} orders disputed (${disputeRate.toFixed(1)}%)`))

  // 5. Revenue consistency (weight: 0.20)
  const balanceRatio = input.availableBalance > 0
    ? input.amount / input.availableBalance
    : 1
  const ratioScore = balanceRatio > 0.95 ? 80 : balanceRatio > 0.8 ? 50 : balanceRatio > 0.5 ? 20 : 5
  factors.push(factor('revenue_consistency', ratioScore, 0.20,
    `Withdrawing ${(balanceRatio * 100).toFixed(0)}% of available balance`))

  const { score, level, action } = computeRisk(factors)

  const assessment: RiskAssessment = {
    entity_type: 'withdrawal',
    entity_id: input.sellerId,
    score,
    level,
    action,
    factors,
  }

  await persistRiskScore(assessment)

  logger.info('Withdrawal risk assessed', {
    sellerId: input.sellerId,
    amount: input.amount,
    score,
    level,
    action,
  })

  return assessment
}

// ═══════════════════════════════════════════════════════════
// SELLER RISK ASSESSMENT
// ═══════════════════════════════════════════════════════════

export async function assessSellerRisk(sellerId: string): Promise<RiskAssessment> {
  const factors: RiskFactor[] = []

  // Dispute rate
  const { count: totalSales } = await supabaseAdmin
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('seller_id', sellerId)
    .eq('payment_status', 'paid')

  const { count: disputeCount } = await supabaseAdmin
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('seller_id', sellerId)
    .eq('payment_status', 'disputed')

  const sales = totalSales || 0
  const disputes = disputeCount || 0
  const disputeRate = sales > 0 ? (disputes / sales) * 100 : 0
  const disputeScore = disputeRate > 5 ? 100 : disputeRate > 2 ? 70 : disputeRate > 1 ? 40 : 5
  factors.push(factor('dispute_rate', disputeScore, 0.30,
    `${disputes}/${sales} disputed (${disputeRate.toFixed(1)}%)`))

  // Refund rate
  const { count: refundCount } = await supabaseAdmin
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('seller_id', sellerId)
    .eq('payment_status', 'refunded')

  const refunds = refundCount || 0
  const refundRate = sales > 0 ? (refunds / sales) * 100 : 0
  const refundScore = refundRate > 10 ? 100 : refundRate > 5 ? 60 : refundRate > 2 ? 30 : 5
  factors.push(factor('refund_rate', refundScore, 0.25,
    `${refunds}/${sales} refunded (${refundRate.toFixed(1)}%)`))

  // Average rating
  const { data: reviewData } = await supabaseAdmin
    .from('reviews')
    .select('rating')
    .eq('seller_id', sellerId)

  if (reviewData && reviewData.length > 0) {
    const avgRating = reviewData.reduce((s, r) => s + r.rating, 0) / reviewData.length
    const ratingScore = avgRating < 2 ? 90 : avgRating < 3 ? 60 : avgRating < 3.5 ? 30 : 5
    factors.push(factor('average_rating', ratingScore, 0.20,
      `${avgRating.toFixed(1)}/5 from ${reviewData.length} reviews`))
  } else {
    factors.push(factor('average_rating', 20, 0.20, 'No reviews'))
  }

  // Account age
  const { data: sellerData } = await supabaseAdmin
    .from('sellers')
    .select('created_at')
    .eq('id', sellerId)
    .single()

  if (sellerData) {
    const ageDays = (Date.now() - new Date(sellerData.created_at).getTime()) / (1000 * 60 * 60 * 24)
    const ageScore = ageDays < 14 ? 70 : ageDays < 60 ? 40 : ageDays < 180 ? 15 : 5
    factors.push(factor('account_age', ageScore, 0.25,
      `${Math.floor(ageDays)} days old`))
  } else {
    factors.push(factor('account_age', 50, 0.25, 'Seller not found'))
  }

  const { score, level, action } = computeRisk(factors)

  const assessment: RiskAssessment = {
    entity_type: 'seller',
    entity_id: sellerId,
    score,
    level,
    action,
    factors,
  }

  await persistRiskScore(assessment)

  return assessment
}

// ─── Query Risk Scores ───────────────────────────────────

export async function queryRiskScores(filters: {
  entity_type?: EntityType
  level?: RiskLevel
  action?: RiskAction
  from?: string
  to?: string
  limit?: number
  offset?: number
}) {
  let query = supabaseAdmin
    .from('risk_scores')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (filters.entity_type) query = query.eq('entity_type', filters.entity_type)
  if (filters.level) query = query.eq('level', filters.level)
  if (filters.action) query = query.eq('action_taken', filters.action)
  if (filters.from) query = query.gte('created_at', filters.from)
  if (filters.to) query = query.lte('created_at', filters.to)

  query = query.range(
    filters.offset || 0,
    (filters.offset || 0) + (filters.limit || 50) - 1
  )

  const { data, error, count } = await query
  if (error) throw error
  return { scores: data || [], total: count || 0 }
}
