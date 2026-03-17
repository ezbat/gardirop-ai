import { supabaseAdmin } from './supabase-admin'

// ─── Types ───────────────────────────────────────────────

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  requestId?: string
  context?: Record<string, unknown>
}

type ActorType = 'user' | 'seller' | 'admin' | 'system' | 'webhook'
type AuditSeverity = 'info' | 'warning' | 'error' | 'critical'

interface AuditEntry {
  actor_id?: string
  actor_type: ActorType
  action: string
  resource_type: string
  resource_id?: string
  details?: Record<string, unknown>
  ip_address?: string
  user_agent?: string
  request_id?: string
  severity?: AuditSeverity
}

interface RequestContext {
  requestId: string
  ip: string
  userAgent: string
}

// ─── Structured Logger ───────────────────────────────────

function formatLog(entry: LogEntry): string {
  return JSON.stringify({
    timestamp: entry.timestamp,
    level: entry.level,
    message: entry.message,
    ...(entry.requestId && { requestId: entry.requestId }),
    ...(entry.context && { ...entry.context }),
  })
}

function log(level: LogLevel, message: string, context?: Record<string, unknown>, requestId?: string) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    requestId,
    context,
  }

  const formatted = formatLog(entry)

  switch (level) {
    case 'debug':
      if (process.env.NODE_ENV === 'development') console.debug(formatted)
      break
    case 'info':
      console.info(formatted)
      break
    case 'warn':
      console.warn(formatted)
      break
    case 'error':
      console.error(formatted)
      break
  }
}

// ─── Request-scoped Logger ───────────────────────────────

export function createRequestLogger(request: Request) {
  const requestId = crypto.randomUUID()
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'

  const ctx: RequestContext = { requestId, ip, userAgent }

  return {
    requestId,
    ip,
    userAgent,
    context: ctx,

    debug: (message: string, context?: Record<string, unknown>) =>
      log('debug', message, { ...context, ip }, requestId),

    info: (message: string, context?: Record<string, unknown>) =>
      log('info', message, { ...context, ip }, requestId),

    warn: (message: string, context?: Record<string, unknown>) =>
      log('warn', message, { ...context, ip }, requestId),

    error: (message: string, context?: Record<string, unknown>) =>
      log('error', message, { ...context, ip }, requestId),

    audit: (entry: Omit<AuditEntry, 'request_id' | 'ip_address' | 'user_agent'>) =>
      writeAuditLog({
        ...entry,
        request_id: requestId,
        ip_address: ip,
        user_agent: userAgent,
      }),
  }
}

// ─── Standalone Logger (no request context) ──────────────

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) =>
    log('debug', message, context),

  info: (message: string, context?: Record<string, unknown>) =>
    log('info', message, context),

  warn: (message: string, context?: Record<string, unknown>) =>
    log('warn', message, context),

  error: (message: string, context?: Record<string, unknown>) =>
    log('error', message, context),

  audit: (entry: AuditEntry) => writeAuditLog(entry),
}

// ─── Audit Log Persistence (fire-and-forget) ─────────────

async function writeAuditLog(entry: AuditEntry): Promise<void> {
  try {
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        actor_id: entry.actor_id || null,
        actor_type: entry.actor_type,
        action: entry.action,
        resource_type: entry.resource_type,
        resource_id: entry.resource_id || null,
        details: entry.details || null,
        ip_address: entry.ip_address || null,
        user_agent: entry.user_agent || null,
        request_id: entry.request_id || null,
        severity: entry.severity || 'info',
      })
  } catch (err) {
    // Audit write failure should never break the main flow
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: 'Failed to write audit log',
      error: err instanceof Error ? err.message : String(err),
      auditAction: entry.action,
    }))
  }
}

// ─── Query Audit Logs ────────────────────────────────────

export async function queryAuditLogs(filters: {
  action?: string
  actor_id?: string
  resource_type?: string
  resource_id?: string
  severity?: AuditSeverity
  from?: string
  to?: string
  limit?: number
  offset?: number
}) {
  let query = supabaseAdmin
    .from('audit_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (filters.action) query = query.eq('action', filters.action)
  if (filters.actor_id) query = query.eq('actor_id', filters.actor_id)
  if (filters.resource_type) query = query.eq('resource_type', filters.resource_type)
  if (filters.resource_id) query = query.eq('resource_id', filters.resource_id)
  if (filters.severity) query = query.eq('severity', filters.severity)
  if (filters.from) query = query.gte('created_at', filters.from)
  if (filters.to) query = query.lte('created_at', filters.to)

  query = query.range(
    filters.offset || 0,
    (filters.offset || 0) + (filters.limit || 50) - 1
  )

  const { data, error, count } = await query

  if (error) throw error
  return { logs: data || [], total: count || 0 }
}
