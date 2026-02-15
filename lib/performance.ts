/**
 * Performance Monitoring Utilities
 */

// Performance marks for measuring
const marks: Map<string, number> = new Map()

/**
 * Start performance measurement
 */
export function startMeasure(name: string): void {
  marks.set(name, performance.now())
}

/**
 * End performance measurement and log
 */
export function endMeasure(name: string, threshold: number = 1000): number {
  const start = marks.get(name)
  if (!start) {
    console.warn(`Performance mark "${name}" not found`)
    return 0
  }

  const duration = performance.now() - start
  marks.delete(name)

  // Log if exceeds threshold
  if (duration > threshold) {
    console.warn(`⚠️ Slow operation: ${name} took ${duration.toFixed(2)}ms`)
  } else if (process.env.NODE_ENV === 'development') {
    console.log(`⚡ ${name}: ${duration.toFixed(2)}ms`)
  }

  return duration
}

/**
 * Measure async function execution time
 */
export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>,
  threshold: number = 1000
): Promise<T> {
  startMeasure(name)
  try {
    const result = await fn()
    endMeasure(name, threshold)
    return result
  } catch (error) {
    endMeasure(name, threshold)
    throw error
  }
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }

    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(later, wait)
  }
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

/**
 * Cache with TTL
 */
export class Cache<T> {
  private cache: Map<string, { value: T; expires: number }> = new Map()

  set(key: string, value: T, ttl: number = 60000): void {
    this.cache.set(key, {
      value,
      expires: Date.now() + ttl
    })
  }

  get(key: string): T | undefined {
    const item = this.cache.get(key)
    if (!item) return undefined

    if (Date.now() > item.expires) {
      this.cache.delete(key)
      return undefined
    }

    return item.value
  }

  has(key: string): boolean {
    return this.get(key) !== undefined
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }
}

/**
 * Retry with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error

      if (i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i)
        console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError!
}

/**
 * Batch operations
 */
export function batchOperations<T, R>(
  items: T[],
  batchSize: number,
  operation: (batch: T[]) => Promise<R[]>
): Promise<R[]> {
  const batches: T[][] = []

  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize))
  }

  return Promise.all(batches.map(operation)).then(results => results.flat())
}

/**
 * Memory usage monitoring
 */
export function logMemoryUsage(): void {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const usage = process.memoryUsage()
    console.log('Memory Usage:')
    console.log(`  RSS: ${Math.round(usage.rss / 1024 / 1024)}MB`)
    console.log(`  Heap Total: ${Math.round(usage.heapTotal / 1024 / 1024)}MB`)
    console.log(`  Heap Used: ${Math.round(usage.heapUsed / 1024 / 1024)}MB`)
    console.log(`  External: ${Math.round(usage.external / 1024 / 1024)}MB`)
  }
}

/**
 * Format bytes
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}
