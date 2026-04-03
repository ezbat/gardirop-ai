/**
 * Storefront layout — clean wrapper for seller storefronts.
 * No platform navigation clutter. The storefront is the seller's world.
 */

import type { Metadata } from 'next'

export const metadata: Metadata = {
  robots: 'index, follow',
}

export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#0E0E10]">
      {children}
    </div>
  )
}
