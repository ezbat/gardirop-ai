"use client"

import { createContext, useContext, useCallback, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

interface PageTransitionContextType {
  navigateTo: (href: string) => void
  isLeaving: boolean
}

const PageTransitionContext = createContext<PageTransitionContextType>({
  navigateTo: () => {},
  isLeaving: false,
})

export function PageTransitionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [isLeaving, setIsLeaving] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const navigateTo = useCallback((href: string) => {
    if (isLeaving) return
    setIsLeaving(true)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      router.push(href)
      setTimeout(() => setIsLeaving(false), 50)
    }, 150)
  }, [router, isLeaving])

  return (
    <PageTransitionContext.Provider value={{ navigateTo, isLeaving }}>
      {children}
    </PageTransitionContext.Provider>
  )
}

export const usePageTransition = () => useContext(PageTransitionContext)
