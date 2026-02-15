"use client"

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export default function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // Skip check if already on onboarding page
    if (pathname === '/onboarding') {
      setIsReady(true)
      return
    }

    // Check if onboarding completed
    const completed = localStorage.getItem('onboarding-complete')

    if (completed !== 'true' && pathname !== '/onboarding') {
      // First time user -> redirect to onboarding
      router.push('/onboarding')
    } else {
      setIsReady(true)
    }
  }, [pathname, router])

  // Show nothing while checking (prevents flash)
  if (!isReady) {
    return (
      <div className="min-h-screen-mobile bg-background flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
      </div>
    )
  }

  return <>{children}</>
}
