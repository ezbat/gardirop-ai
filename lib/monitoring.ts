/**
 * WEARO Monitoring & Observability Library
 *
 * In-memory metrics collection for API latency, database queries,
 * order funnel tracking, and error aggregation.
 * No external dependencies - uses circular buffers for bounded memory.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface APILatencyEntry {
  endpoint: string
  durationMs: number
  statusCode: number
  timestamp: number
}

interface DatabaseQueryEntry {
  table: string
  operation: string
  durationMs: number
  timestamp: number
}

type OrderEventType = 'created' | 'paid' | 'shipped' | 'delivered' | 'cancelled'

interface OrderEvent {
  event: OrderEventType
  orderId: string
  timestamp: number
}

interface TrackedError {
  source: string
  message: string
  stack?: string
  context?: Record<string, unknown>
  timestamp: number
}

interface LatencyStats {
  count: number
  avg: number
  p50: number
  p95: number
  p99: number
  min: number
  max: number
}

interface APIMetrics extends LatencyStats {
  endpoint: string
  successRate: number
}

interface SlowQuery {
  table: string
  operation: string
  durationMs: number
  timestamp: number
}

interface OrderFunnelMetrics {
  created: number
  paid: number
  shipped: number
  delivered: number
  cancelled: number
  paidRate: number
  shippedRate: number
  deliveredRate: number
  cancelledRate: number
}

interface ErrorSummaryEntry {
  source: string
  count: number
  lastSeen: number
  lastMessage: string
}

// ---------------------------------------------------------------------------
// Circular Buffer
// ---------------------------------------------------------------------------

class CircularBuffer<T> {
  private buffer: T[]
  private head: number = 0
  private _size: number = 0
  private readonly capacity: number

  constructor(capacity: number) {
    this.capacity = capacity
    this.buffer = new Array(capacity)
  }

  push(item: T): void {
    this.buffer[this.head] = item
    this.head = (this.head + 1) % this.capacity
    if (this._size < this.capacity) {
      this._size++
    }
  }

  toArray(): T[] {
    if (this._size === 0) return []
    if (this._size < this.capacity) {
      return this.buffer.slice(0, this._size)
    }
    // When full, entries wrap around; reconstruct in chronological order
    return [
      ...this.buffer.slice(this.head),
      ...this.buffer.slice(0, this.head),
    ]
  }

  get size(): number {
    return this._size
  }

  clear(): void {
    this.buffer = new Array(this.capacity)
    this.head = 0
    this._size = 0
  }
}

// ---------------------------------------------------------------------------
// Storage (module-level singletons)
// ---------------------------------------------------------------------------

const BUFFER_SIZE = 1000

const apiLatencyBuffer = new CircularBuffer<APILatencyEntry>(BUFFER_SIZE)
const dbQueryBuffer = new CircularBuffer<DatabaseQueryEntry>(BUFFER_SIZE)
const orderEventBuffer = new CircularBuffer<OrderEvent>(BUFFER_SIZE)
const errorBuffer = new CircularBuffer<TrackedError>(BUFFER_SIZE)

// Global request counter (never resets until process restarts)
let totalRequests = 0
let totalErrors = 0

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const idx = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[Math.max(0, idx)]
}

function computeLatencyStats(durations: number[]): LatencyStats {
  if (durations.length === 0) {
    return { count: 0, avg: 0, p50: 0, p95: 0, p99: 0, min: 0, max: 0 }
  }
  const sorted = [...durations].sort((a, b) => a - b)
  const sum = sorted.reduce((acc, v) => acc + v, 0)
  return {
    count: sorted.length,
    avg: Math.round((sum / sorted.length) * 100) / 100,
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
    min: sorted[0],
    max: sorted[sorted.length - 1],
  }
}

// ---------------------------------------------------------------------------
// Auto-cleanup: prune entries older than 1 hour every 5 minutes
// ---------------------------------------------------------------------------

const CLEANUP_INTERVAL_MS = 5 * 60 * 1000
const MAX_ENTRY_AGE_MS = 60 * 60 * 1000

let cleanupTimer: ReturnType<typeof setInterval> | null = null

function ensureCleanupRunning(): void {
  if (cleanupTimer !== null) return
  cleanupTimer = setInterval(() => {
    const cutoff = Date.now() - MAX_ENTRY_AGE_MS
    // For circular buffers we cannot selectively remove, but the bounded size
    // already caps memory. The cleanup here is a no-op safety net; the real
    // bound is the circular buffer capacity.
    void cutoff
  }, CLEANUP_INTERVAL_MS)

  // Allow the Node.js process to exit even if the timer is active
  if (typeof cleanupTimer === 'object' && 'unref' in cleanupTimer) {
    cleanupTimer.unref()
  }
}

ensureCleanupRunning()

// ---------------------------------------------------------------------------
// 1. Performance Monitoring
// ---------------------------------------------------------------------------

/**
 * Track an API request's latency and status code.
 */
export function trackAPILatency(
  endpoint: string,
  durationMs: number,
  statusCode: number
): void {
  totalRequests++
  if (statusCode >= 400) totalErrors++

  apiLatencyBuffer.push({
    endpoint,
    durationMs,
    statusCode,
    timestamp: Date.now(),
  })
}

/**
 * Retrieve latency statistics, optionally filtered to a single endpoint.
 * When no endpoint is given, returns per-endpoint metrics for every
 * endpoint that appears in the buffer.
 */
export function getAPIMetrics(endpoint?: string): APIMetrics | APIMetrics[] {
  const entries = apiLatencyBuffer.toArray()

  if (endpoint) {
    const filtered = entries.filter((e) => e.endpoint === endpoint)
    const durations = filtered.map((e) => e.durationMs)
    const stats = computeLatencyStats(durations)
    const successes = filtered.filter((e) => e.statusCode < 400).length
    return {
      ...stats,
      endpoint,
      successRate:
        filtered.length > 0
          ? Math.round((successes / filtered.length) * 10000) / 100
          : 100,
    }
  }

  // Group by endpoint
  const grouped = new Map<string, APILatencyEntry[]>()
  for (const entry of entries) {
    const list = grouped.get(entry.endpoint) || []
    list.push(entry)
    grouped.set(entry.endpoint, list)
  }

  const results: APIMetrics[] = []
  for (const [ep, list] of grouped) {
    const durations = list.map((e) => e.durationMs)
    const stats = computeLatencyStats(durations)
    const successes = list.filter((e) => e.statusCode < 400).length
    results.push({
      ...stats,
      endpoint: ep,
      successRate:
        list.length > 0
          ? Math.round((successes / list.length) * 10000) / 100
          : 100,
    })
  }
  return results
}

/**
 * Track a database query execution time.
 */
export function trackDatabaseQuery(
  table: string,
  operation: string,
  durationMs: number
): void {
  dbQueryBuffer.push({
    table,
    operation,
    durationMs,
    timestamp: Date.now(),
  })
}

/**
 * Return queries that exceeded a duration threshold (default 500 ms).
 */
export function getSlowQueries(thresholdMs: number = 500): SlowQuery[] {
  return dbQueryBuffer
    .toArray()
    .filter((q) => q.durationMs > thresholdMs)
    .map(({ table, operation, durationMs, timestamp }) => ({
      table,
      operation,
      durationMs,
      timestamp,
    }))
    .sort((a, b) => b.durationMs - a.durationMs)
}

// ---------------------------------------------------------------------------
// 2. Business Metrics
// ---------------------------------------------------------------------------

/**
 * Track an order lifecycle event.
 */
export function trackOrderEvent(
  event: OrderEventType,
  orderId: string
): void {
  orderEventBuffer.push({
    event,
    orderId,
    timestamp: Date.now(),
  })
}

/**
 * Compute the order conversion funnel for a recent time window.
 * @param period - Lookback window in hours (default 24).
 */
export function getOrderFunnel(period: number = 24): OrderFunnelMetrics {
  const cutoff = Date.now() - period * 60 * 60 * 1000
  const recent = orderEventBuffer.toArray().filter((e) => e.timestamp >= cutoff)

  const counts: Record<OrderEventType, number> = {
    created: 0,
    paid: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
  }

  for (const entry of recent) {
    counts[entry.event]++
  }

  const base = counts.created || 1 // avoid division by zero
  return {
    ...counts,
    paidRate: Math.round((counts.paid / base) * 10000) / 100,
    shippedRate: Math.round((counts.shipped / base) * 10000) / 100,
    deliveredRate: Math.round((counts.delivered / base) * 10000) / 100,
    cancelledRate: Math.round((counts.cancelled / base) * 10000) / 100,
  }
}

/**
 * Track an application error with optional context.
 */
export function trackError(
  source: string,
  error: Error,
  context?: Record<string, unknown>
): void {
  totalErrors++

  errorBuffer.push({
    source,
    message: error.message,
    stack: error.stack,
    context,
    timestamp: Date.now(),
  })

  // Also log to stderr for runtime log aggregation
  console.error(`[monitoring] ${source}:`, error.message, context ?? '')
}

/**
 * Aggregate errors by source over the last N hours.
 */
export function getErrorSummary(hours: number = 24): ErrorSummaryEntry[] {
  const cutoff = Date.now() - hours * 60 * 60 * 1000
  const recent = errorBuffer.toArray().filter((e) => e.timestamp >= cutoff)

  const grouped = new Map<
    string,
    { count: number; lastSeen: number; lastMessage: string }
  >()

  for (const entry of recent) {
    const existing = grouped.get(entry.source)
    if (!existing || entry.timestamp > existing.lastSeen) {
      grouped.set(entry.source, {
        count: (existing?.count ?? 0) + 1,
        lastSeen: entry.timestamp,
        lastMessage: entry.message,
      })
    } else {
      existing.count++
    }
  }

  return Array.from(grouped.entries())
    .map(([source, data]) => ({ source, ...data }))
    .sort((a, b) => b.count - a.count)
}

// ---------------------------------------------------------------------------
// 3. Aggregate Accessors (used by health endpoint)
// ---------------------------------------------------------------------------

/**
 * Quick summary numbers intended for the /api/health response.
 */
export function getGlobalMetrics(): {
  totalRequests: number
  totalErrors: number
  errorRate: number
  avgLatencyMs: number
} {
  const entries = apiLatencyBuffer.toArray()
  const durations = entries.map((e) => e.durationMs)
  const avg =
    durations.length > 0
      ? Math.round(
          (durations.reduce((s, v) => s + v, 0) / durations.length) * 100
        ) / 100
      : 0

  return {
    totalRequests,
    totalErrors,
    errorRate:
      totalRequests > 0
        ? Math.round((totalErrors / totalRequests) * 10000) / 100
        : 0,
    avgLatencyMs: avg,
  }
}

// ---------------------------------------------------------------------------
// 4. Reset (useful for testing)
// ---------------------------------------------------------------------------

export function resetMetrics(): void {
  apiLatencyBuffer.clear()
  dbQueryBuffer.clear()
  orderEventBuffer.clear()
  errorBuffer.clear()
  totalRequests = 0
  totalErrors = 0
}
