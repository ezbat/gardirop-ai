"use client"

import { usePathname } from 'next/navigation'

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // Skip animation for immersive fullscreen pages (fixed positioning breaks with transforms)
  const skipAnimation = pathname === '/reels'

  if (skipAnimation) return <>{children}</>

  return (
    <div
      key={pathname}
      style={{ animation: 'pageEnter 300ms cubic-bezier(0.16, 1, 0.3, 1)' }}
    >
      {children}
    </div>
  )
}
