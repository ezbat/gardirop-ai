import { supabaseAdmin } from './supabase-admin'
import { logger } from './logger'

// ─── Types ───────────────────────────────────────────────

interface ClaimResult {
  claimed: boolean
  duplicate: boolean
  webhookEventId?: string
  status?: string
  attempts?: number
}

// ─── Claim a webhook event (persistent idempotency) ──────

export async function claimWebhookEvent(
  eventId: string,
  eventType: string,
  source: string = 'stripe',
  payload?: Record<string, unknown>
): Promise<ClaimResult> {
  const { data, error } = await supabaseAdmin.rpc('webhook_claim', {
    p_event_id: eventId,
    p_event_type: eventType,
    p_source: source,
    p_payload: payload || null,
  })

  if (error) {
    logger.error('webhook_claim RPC failed', {
      eventId,
      eventType,
      error: error.message,
    })
    throw new Error(`webhook_claim failed: ${error.message}`)
  }

  const result = data as { claimed: boolean; duplicate: boolean; webhook_event_id?: string; status?: string; attempts?: number }

  if (result.duplicate) {
    logger.info('Duplicate webhook event skipped', {
      eventId,
      eventType,
      status: result.status,
      attempts: result.attempts,
    })
  }

  return {
    claimed: result.claimed,
    duplicate: result.duplicate,
    webhookEventId: result.webhook_event_id,
    status: result.status,
    attempts: result.attempts,
  }
}

// ─── Mark webhook event as completed ─────────────────────

export async function completeWebhookEvent(eventId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('webhook_events')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('event_id', eventId)

  if (error) {
    logger.error('Failed to complete webhook event', {
      eventId,
      error: error.message,
    })
  }
}

// ─── Mark webhook event as failed ────────────────────────

export async function failWebhookEvent(
  eventId: string,
  errorMessage: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('webhook_events')
    .update({
      status: 'failed',
      error_message: errorMessage,
      completed_at: new Date().toISOString(),
    })
    .eq('event_id', eventId)

  if (error) {
    logger.error('Failed to mark webhook event as failed', {
      eventId,
      error: error.message,
    })
  }
}

// ─── Cleanup expired events ──────────────────────────────

export async function cleanupExpiredWebhooks(): Promise<number> {
  const { data, error } = await supabaseAdmin.rpc('cleanup_expired_webhooks')

  if (error) {
    logger.error('Failed to cleanup expired webhooks', { error: error.message })
    return 0
  }

  return (data as number) || 0
}
