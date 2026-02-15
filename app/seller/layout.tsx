"use client"

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import SellerSidebar from '@/components/seller-sidebar'
import SellerSettingsDrawer from '@/components/seller-settings-drawer'

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [isApprovedSeller, setIsApprovedSeller] = useState(false)
  const [checking, setChecking] = useState(true)
  const [sidebarExpanded, setSidebarExpanded] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)

  // Check if this is a public shop view page (e.g., /seller/123)
  const isShopView = pathname ? /^\/seller\/[^\/]+$/.test(pathname) : false

  // Listen for sidebar toggle events and settings drawer events
  useEffect(() => {
    // Load initial state
    try {
      const saved = localStorage.getItem('wearo-sidebar-expanded')
      if (saved !== null) setSidebarExpanded(saved === 'true')
    } catch {}

    const handleToggle = (e: Event) => {
      const detail = (e as CustomEvent).detail
      setSidebarExpanded(detail.expanded)
    }

    const handleSettings = () => setSettingsOpen(true)

    window.addEventListener('sidebar-toggle', handleToggle)
    window.addEventListener('open-settings-drawer', handleSettings)
    return () => {
      window.removeEventListener('sidebar-toggle', handleToggle)
      window.removeEventListener('open-settings-drawer', handleSettings)
    }
  }, [])

  useEffect(() => {
    if (isShopView) {
      setChecking(false)
      return
    }

    if (status === 'loading') return

    if (!session?.user?.id) {
      router.push('/auth/signin')
      return
    }

    checkSellerAccess()
  }, [session, status, pathname, isShopView])

  const checkSellerAccess = async () => {
    try {
      const response = await fetch('/api/seller/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: session!.user!.id })
      })

      const data = await response.json()

      if (data.isSeller && data.seller) {
        if (data.seller.status === 'approved') {
          setIsApprovedSeller(true)
        } else if (data.seller.status === 'pending') {
          router.push('/seller-application/pending')
        } else {
          router.push('/')
        }
      } else {
        router.push('/')
      }
    } catch {
      router.push('/')
    } finally {
      setChecking(false)
    }
  }

  // Public shop view
  if (isShopView) {
    return <>{children}</>
  }

  // Loading state
  if (status === 'loading' || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'oklch(0.1 0.02 260)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'oklch(0.78 0.14 85)' }}>
            <Loader2 className="w-6 h-6 animate-spin text-white" />
          </div>
          <p className="text-sm text-muted-foreground">Loading Command Center...</p>
        </div>
      </div>
    )
  }

  if (!isApprovedSeller) return null

  return (
    <>
      <SellerSidebar />
      <div
        className="transition-all duration-300 ease-in-out min-h-screen"
        style={{ marginLeft: sidebarExpanded ? '256px' : '80px' }}
      >
        {children}
      </div>
      <SellerSettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  )
}
