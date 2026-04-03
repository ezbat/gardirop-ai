/**
 * lib/notifications.ts
 *
 * Best-effort notification helpers.  Every function catches its own errors
 * and NEVER throws — callers must not depend on the notification succeeding.
 *
 * Usage:
 *   import { createCustomerNotification, createSellerNotification,
 *            createAdminNotification } from '@/lib/notifications'
 *
 *   // best-effort — fire and forget is fine
 *   createSellerNotification(sellerId, 'application_approved', {
 *     title: 'Bewerbung genehmigt',
 *     body:  'Herzlichen Glückwunsch! ...',
 *     link:  '/seller/dashboard',
 *   })
 */

import { supabaseAdmin } from '@/lib/supabase-admin'

// ─── Types ────────────────────────────────────────────────────────────────────

export type CustomerNotificationType =
  | 'order_placed'
  | 'order_shipped'
  | 'order_delivered'
  | 'order_cancelled'
  | 'return_approved'
  | 'return_rejected'
  | 'refund_processed'
  | 'new_message'

export type SellerNotificationType =
  | 'application_approved'
  | 'application_rejected'
  | 'new_order'
  | 'order_cancelled'
  | 'new_return_request'
  | 'new_message'
  | 'product_approved'
  | 'product_rejected'
  | 'payout_paid'
  | 'payout_failed'

export type AdminNotificationType =
  | 'new_seller_application'
  | 'payout_requested'
  | 'product_flagged'
  | 'new_return_request'
  | 'new_message'
  | 'stuck_order'
  | 'system_alert'

export type NotificationType =
  | CustomerNotificationType
  | SellerNotificationType
  | AdminNotificationType

// ─── German copy defaults per type ───────────────────────────────────────────

const DEFAULTS: Record<
  NotificationType,
  { title: string; body: string }
> = {
  // Customer
  order_placed:     { title: 'Bestellung aufgegeben',     body: 'Deine Bestellung wurde erfolgreich aufgegeben.' },
  order_shipped:    { title: 'Bestellung versandt',        body: 'Dein Paket ist auf dem Weg zu dir.' },
  order_delivered:  { title: 'Bestellung zugestellt',     body: 'Deine Bestellung wurde erfolgreich zugestellt.' },
  order_cancelled:  { title: 'Bestellung storniert',      body: 'Deine Bestellung wurde storniert.' },
  return_approved:  { title: 'Rückgabe genehmigt',        body: 'Deine Rückgabe wurde genehmigt. Bitte sende das Produkt zurück.' },
  return_rejected:  { title: 'Rückgabe abgelehnt',        body: 'Deine Rückgabe wurde leider abgelehnt.' },
  refund_processed: { title: 'Erstattung bearbeitet',      body: 'Die Erstattung wurde veranlasst und erscheint in 5–10 Werktagen.' },

  // Seller
  application_approved: { title: 'Bewerbung genehmigt',   body: 'Herzlichen Glückwunsch! Dein Seller-Konto ist jetzt aktiv.' },
  application_rejected: { title: 'Bewerbung abgelehnt',   body: 'Deine Seller-Bewerbung wurde leider abgelehnt.' },
  new_order:            { title: 'Neue Bestellung',        body: 'Du hast eine neue Bestellung erhalten.' },
  product_approved:     { title: 'Produkt genehmigt',      body: 'Dein Produkt ist jetzt im Shop sichtbar.' },
  product_rejected:     { title: 'Produkt abgelehnt',      body: 'Dein Produkt wurde leider nicht genehmigt.' },
  payout_paid:          { title: 'Auszahlung erhalten',    body: 'Deine Auszahlung wurde erfolgreich überwiesen.' },
  payout_failed:        { title: 'Auszahlung fehlgeschlagen', body: 'Bei deiner Auszahlung ist ein Fehler aufgetreten.' },
  new_return_request:   { title: 'Neue Rückgabe-Anfrage',    body: 'Ein Kunde hat eine Rückgabe beantragt.' },

  // Admin
  new_seller_application: { title: 'Neue Seller-Bewerbung', body: 'Eine neue Seller-Bewerbung wartet auf Prüfung.' },
  payout_requested:       { title: 'Auszahlung beantragt',  body: 'Ein Seller hat eine Auszahlung beantragt.' },
  product_flagged:        { title: 'Produkt gemeldet',      body: 'Ein Produkt wurde von einem Nutzer gemeldet.' },
  stuck_order:            { title: 'Bestellung hängt',      body: 'Eine Bestellung befindet sich seit über 24 h in einem offenen Status.' },
  system_alert:           { title: 'Systemwarnung',          body: 'Das System hat eine Auffälligkeit erkannt.' },

  // Shared (new_message appears in customer, seller, admin)
  new_message: { title: 'Neue Nachricht', body: 'Du hast eine neue Nachricht erhalten.' },
}

// ─── Core insert ──────────────────────────────────────────────────────────────

interface NotificationPayload {
  title?:    string
  body?:     string
  link?:     string
  metadata?: Record<string, unknown>
}

async function insert(row: {
  recipient_type: 'customer' | 'seller' | 'admin'
  type:           NotificationType
  title:          string
  body:           string
  link?:          string | null
  user_id?:       string | null
  seller_id?:     string | null
  admin_scope?:   boolean
  metadata?:      Record<string, unknown>
}): Promise<void> {
  const { error } = await supabaseAdmin.from('notifications').insert({
    recipient_type: row.recipient_type,
    type:           row.type,
    title:          row.title,
    body:           row.body,
    link:           row.link ?? null,
    user_id:        row.user_id   ?? null,
    seller_id:      row.seller_id ?? null,
    admin_scope:    row.admin_scope ?? false,
    metadata:       row.metadata ?? {},
    is_read:        false,
  })

  if (error) {
    if (error.code !== '42P01') {
      console.warn('[notifications] insert failed:', error.message, { type: row.type })
    }
  }
}

// ─── Public helpers ───────────────────────────────────────────────────────────

/**
 * Create a notification for a customer (identified by NextAuth user id).
 */
export async function createCustomerNotification(
  userId:  string,
  type:    CustomerNotificationType,
  payload: NotificationPayload = {},
): Promise<void> {
  try {
    const def = DEFAULTS[type]
    await insert({
      recipient_type: 'customer',
      type,
      title:    payload.title    ?? def.title,
      body:     payload.body     ?? def.body,
      link:     payload.link     ?? null,
      metadata: payload.metadata ?? {},
      user_id:  userId,
    })
  } catch (err) {
    console.warn('[notifications] createCustomerNotification threw:', err)
  }
}

/**
 * Create a notification for a seller (identified by sellers.id UUID).
 */
export async function createSellerNotification(
  sellerId: string,
  type:     SellerNotificationType,
  payload:  NotificationPayload = {},
): Promise<void> {
  try {
    const def = DEFAULTS[type]
    await insert({
      recipient_type: 'seller',
      type,
      title:     payload.title    ?? def.title,
      body:      payload.body     ?? def.body,
      link:      payload.link     ?? null,
      metadata:  payload.metadata ?? {},
      seller_id: sellerId,
    })
  } catch (err) {
    console.warn('[notifications] createSellerNotification threw:', err)
  }
}

/**
 * Create a broadcast notification visible to all admins.
 */
export async function createAdminNotification(
  type:    AdminNotificationType,
  payload: NotificationPayload = {},
): Promise<void> {
  try {
    const def = DEFAULTS[type]
    await insert({
      recipient_type: 'admin',
      type,
      title:       payload.title    ?? def.title,
      body:        payload.body     ?? def.body,
      link:        payload.link     ?? null,
      metadata:    payload.metadata ?? {},
      admin_scope: true,
    })
  } catch (err) {
    console.warn('[notifications] createAdminNotification threw:', err)
  }
}
