/**
 * Maintenance Mode Utilities
 *
 * Environment variable kullanımı:
 * NEXT_PUBLIC_MAINTENANCE_MODE=true
 * NEXT_PUBLIC_MAINTENANCE_MESSAGE="Bakımdayız, yakında döneriz!"
 * NEXT_PUBLIC_MAINTENANCE_ALLOWED_IPS=192.168.1.1,127.0.0.1
 */

/**
 * Check if maintenance mode is enabled
 */
export function isMaintenanceMode(): boolean {
  return process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true'
}

/**
 * Get maintenance message
 */
export function getMaintenanceMessage(): string {
  return (
    process.env.NEXT_PUBLIC_MAINTENANCE_MESSAGE ||
    'Sistemimiz şu anda bakımdadır. Lütfen daha sonra tekrar deneyin.'
  )
}

/**
 * Check if IP is allowed during maintenance
 */
export function isIPAllowed(ip: string): boolean {
  const allowedIPs = process.env.NEXT_PUBLIC_MAINTENANCE_ALLOWED_IPS?.split(',') || []
  return allowedIPs.includes(ip)
}

/**
 * Get estimated maintenance end time
 */
export function getMaintenanceEndTime(): Date | null {
  const endTime = process.env.NEXT_PUBLIC_MAINTENANCE_END_TIME
  return endTime ? new Date(endTime) : null
}

/**
 * Check if user can bypass maintenance
 */
export function canBypassMaintenance(
  userRole?: string,
  userIP?: string
): boolean {
  // Admins can always bypass
  if (userRole === 'admin') return true

  // Allowed IPs can bypass
  if (userIP && isIPAllowed(userIP)) return true

  return false
}
