import { supabase } from './supabase'

/**
 * Order State Machine for Marketplace
 *
 * This implements a strict state machine for order lifecycle management.
 * States can only transition according to predefined rules stored in the database.
 *
 * Flow:
 * CREATED → PAYMENT_PENDING → PAID → SHIPPED → DELIVERED → COMPLETED
 *                              ↓                              ↓
 *                          CANCELLED                   RETURN_REQUESTED
 *                                                            ↓
 *                                                      RETURN_APPROVED → REFUNDED
 *                                                            ↓
 *                                                      DISPUTE_OPENED
 *                                                       ↓          ↓
 *                                                  REFUNDED    COMPLETED
 */

export const OrderState = {
  CREATED: 'CREATED',
  PAYMENT_PENDING: 'PAYMENT_PENDING',
  PAID: 'PAID',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  RETURN_REQUESTED: 'RETURN_REQUESTED',
  RETURN_APPROVED: 'RETURN_APPROVED',
  DISPUTE_OPENED: 'DISPUTE_OPENED',
  COMPLETED: 'COMPLETED',
  REFUNDED: 'REFUNDED',
  CANCELLED: 'CANCELLED',
} as const

export type State = typeof OrderState[keyof typeof OrderState]

/**
 * Allowed state transitions (defined in code for quick validation)
 * This mirrors the database order_state_transitions table
 */
const STATE_TRANSITIONS: Record<State, State[]> = {
  CREATED: ['PAYMENT_PENDING'],
  PAYMENT_PENDING: ['PAID', 'CANCELLED'],
  PAID: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: ['COMPLETED', 'RETURN_REQUESTED'],
  RETURN_REQUESTED: ['RETURN_APPROVED', 'DISPUTE_OPENED'],
  RETURN_APPROVED: ['REFUNDED'],
  DISPUTE_OPENED: ['REFUNDED', 'COMPLETED'],
  COMPLETED: [], // Terminal state
  REFUNDED: [], // Terminal state
  CANCELLED: [], // Terminal state
}

/**
 * Check if a state transition is allowed
 */
export function canTransition(from: State, to: State): boolean {
  return STATE_TRANSITIONS[from]?.includes(to) ?? false
}

/**
 * Check if a state is terminal (no further transitions allowed)
 */
export function isTerminalState(state: State): boolean {
  return ['COMPLETED', 'REFUNDED', 'CANCELLED'].includes(state)
}

/**
 * Get all possible next states from current state
 */
export function getNextStates(currentState: State): State[] {
  return STATE_TRANSITIONS[currentState] || []
}

/**
 * Get human-readable state label
 */
export function getStateLabel(state: State, locale: 'en' | 'de' | 'tr' = 'en'): string {
  const labels: Record<'en' | 'de' | 'tr', Record<State, string>> = {
    en: {
      CREATED: 'Created',
      PAYMENT_PENDING: 'Payment Pending',
      PAID: 'Paid',
      SHIPPED: 'Shipped',
      DELIVERED: 'Delivered',
      RETURN_REQUESTED: 'Return Requested',
      RETURN_APPROVED: 'Return Approved',
      DISPUTE_OPENED: 'Dispute Opened',
      COMPLETED: 'Completed',
      REFUNDED: 'Refunded',
      CANCELLED: 'Cancelled',
    },
    de: {
      CREATED: 'Erstellt',
      PAYMENT_PENDING: 'Zahlung ausstehend',
      PAID: 'Bezahlt',
      SHIPPED: 'Versendet',
      DELIVERED: 'Zugestellt',
      RETURN_REQUESTED: 'Rücksendung angefragt',
      RETURN_APPROVED: 'Rücksendung genehmigt',
      DISPUTE_OPENED: 'Streitfall eröffnet',
      COMPLETED: 'Abgeschlossen',
      REFUNDED: 'Erstattet',
      CANCELLED: 'Storniert',
    },
    tr: {
      CREATED: 'Oluşturuldu',
      PAYMENT_PENDING: 'Ödeme Bekleniyor',
      PAID: 'Ödendi',
      SHIPPED: 'Kargoya Verildi',
      DELIVERED: 'Teslim Edildi',
      RETURN_REQUESTED: 'İade Talep Edildi',
      RETURN_APPROVED: 'İade Onaylandı',
      DISPUTE_OPENED: 'Anlaşmazlık Açıldı',
      COMPLETED: 'Tamamlandı',
      REFUNDED: 'İade Edildi',
      CANCELLED: 'İptal Edildi',
    },
  }

  return labels[locale][state] || state
}

/**
 * Get state color for UI
 */
export function getStateColor(state: State): string {
  const colors: Record<State, string> = {
    CREATED: 'gray',
    PAYMENT_PENDING: 'yellow',
    PAID: 'blue',
    SHIPPED: 'purple',
    DELIVERED: 'green',
    RETURN_REQUESTED: 'orange',
    RETURN_APPROVED: 'orange',
    DISPUTE_OPENED: 'red',
    COMPLETED: 'green',
    REFUNDED: 'blue',
    CANCELLED: 'red',
  }

  return colors[state] || 'gray'
}

/**
 * Transition order to a new state
 *
 * @param orderId - Order UUID
 * @param toState - Target state
 * @param metadata - Additional data to store (e.g., tracking_number, refund_id)
 * @throws Error if transition is not allowed or order not found
 */
export async function transitionOrderState(
  orderId: string,
  toState: State,
  metadata?: Record<string, any>
): Promise<void> {
  // Fetch current order state
  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('state, id')
    .eq('id', orderId)
    .single()

  if (fetchError || !order) {
    throw new Error(`Order ${orderId} not found: ${fetchError?.message}`)
  }

  const currentState = order.state as State

  // Validate transition
  if (!canTransition(currentState, toState)) {
    throw new Error(
      `Invalid state transition: ${currentState} → ${toState}. ` +
      `Allowed transitions from ${currentState}: ${getNextStates(currentState).join(', ')}`
    )
  }

  // Update order state
  const { error: updateError } = await supabase
    .from('orders')
    .update({
      state: toState,
      ...metadata,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)

  if (updateError) {
    throw new Error(`Failed to transition order ${orderId}: ${updateError.message}`)
  }
}

/**
 * Get order state history
 */
export async function getOrderStateHistory(orderId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('state_history')
    .eq('id', orderId)
    .single()

  if (error || !data) {
    throw new Error(`Order ${orderId} not found`)
  }

  return data.state_history || []
}

/**
 * Check if order can be shipped (must be in PAID state)
 */
export function canShipOrder(state: State): boolean {
  return state === OrderState.PAID
}

/**
 * Check if order can be returned (must be DELIVERED and within 14 days)
 */
export async function canReturnOrder(orderId: string): Promise<boolean> {
  const { data: order } = await supabase
    .from('orders')
    .select('state, delivered_at')
    .eq('id', orderId)
    .single()

  if (!order || order.state !== OrderState.DELIVERED) {
    return false
  }

  if (!order.delivered_at) {
    return false
  }

  // AB law: 14 days return window
  const deliveryDate = new Date(order.delivered_at)
  const daysSinceDelivery = Math.floor(
    (Date.now() - deliveryDate.getTime()) / (1000 * 60 * 60 * 24)
  )

  return daysSinceDelivery <= 14
}

/**
 * Check if escrow should be released (7 days after delivery)
 */
export async function shouldReleaseEscrow(orderId: string): Promise<boolean> {
  const { data: order } = await supabase
    .from('orders')
    .select('state, escrow_release_at')
    .eq('id', orderId)
    .single()

  if (!order || order.state !== OrderState.DELIVERED) {
    return false
  }

  if (!order.escrow_release_at) {
    return false
  }

  return new Date(order.escrow_release_at) <= new Date()
}
