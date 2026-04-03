import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Middleware: Slug-based storefront routing
 *
 * All top-level routes that are NOT reserved platform routes
 * are treated as potential seller slugs and rewritten to /[slug].
 *
 * Reserved routes (existing app/* directories, Next.js internals,
 * static assets) pass through untouched.
 */

const RESERVED_ROUTES = new Set([
  // Platform pages
  'about', 'admin', 'api', 'auth', 'cart', 'categories', 'category', 'chat',
  'checkout', 'coupons', 'explore', 'favorites', 'follow-requests',
  'legal', 'live', 'loyalty', 'messages', 'notifications', 'onboarding',
  'order-confirmation', 'orders', 'outfits', 'privacy', 'product',
  'products', 'profile', 'reels', 'returns', 'saved', 'search', 'sell',
  'seller', 'seller-application', 'settings', 'shop', 'social', 'store',
  'support', 'terms', 'test', 'upload', 'wardrobe', 'wishlist',

  // Next.js internals & static
  '_next', 'favicon.ico', 'robots.txt', 'sitemap.xml',
])

// Valid slug pattern: lowercase alphanumeric + hyphens, 3-40 chars
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Security headers on all responses ──────────────────────────
  const response = NextResponse.next()
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  // Skip: root, paths with extensions (static files), multi-segment paths
  if (pathname === '/') return response

  const segments = pathname.split('/').filter(Boolean)
  if (segments.length !== 1) return response

  const segment = segments[0]

  // Skip reserved routes
  if (RESERVED_ROUTES.has(segment)) return response

  // Skip files with extensions (images, fonts, etc.)
  if (segment.includes('.')) return response

  // If it looks like a valid slug, let it through to app/[slug]
  // The page itself will handle 404 if the slug doesn't exist
  if (SLUG_PATTERN.test(segment)) {
    return response
  }

  // Anything else passes through (will 404 naturally)
  return response
}

export const config = {
  // Only run on top-level paths (not nested, not api, not _next)
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
}
