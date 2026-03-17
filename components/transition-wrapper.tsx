"use client"

import { usePageTransition } from '@/lib/page-transition-context'

export default function TransitionWrapper({ children }: { children: React.ReactNode }) {
  const { isLeaving } = usePageTransition()

  return (
    <div
      className="flex-1"
      style={{
        opacity: isLeaving ? 0 : 1,
        transition: isLeaving ? 'opacity 150ms ease' : 'none',
      }}
    >
      {children}
    </div>
  )
}
