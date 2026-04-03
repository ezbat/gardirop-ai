/**
 * Shared admin fetch helper for client-side admin pages.
 *
 * All admin pages should use getAdminToken() to read the stored token
 * and pass it via x-admin-token header.
 *
 * The token is stored in localStorage by the admin layout auth gate.
 */

const TOKEN_KEY = 'adminToken'

export function getAdminToken(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem(TOKEN_KEY) ?? ''
}

export function setAdminToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearAdminToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

/**
 * Fetch wrapper that automatically includes x-admin-token header.
 * Use for all admin API calls.
 */
export async function adminFetch(
  url: string,
  options?: RequestInit,
): Promise<Response> {
  const token = getAdminToken()
  const headers = new Headers(options?.headers)
  if (token) {
    headers.set('x-admin-token', token)
  }
  return fetch(url, { ...options, headers })
}
