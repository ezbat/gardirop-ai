"use client"

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Store, Play, User, Zap, Grid3X3 } from 'lucide-react'
import { usePageTransition } from '@/lib/page-transition-context'

export default function MobileBottomNav() {
  const pathname = usePathname()
  const { navigateTo } = usePageTransition()

  // Hide on certain pages
  const hiddenPaths = ['/onboarding', '/auth', '/seller']
  if (hiddenPaths.some(p => pathname?.startsWith(p))) return null

  const items = [
    { icon: Store, label: 'Home', href: '/store', active: pathname === '/store' || pathname === '/' },
    { icon: Grid3X3, label: 'Kategorien', href: '/explore', active: pathname === '/explore' },
    { icon: Zap, label: 'Angebote', href: '/store', active: false, amber: true },
    { icon: Play, label: 'Reels', href: '/reels', active: pathname === '/reels' },
    { icon: User, label: 'Konto', href: '/profile', active: pathname?.startsWith('/profile') },
  ]

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      style={{
        background: 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid #E5E5E5',
      }}
    >
      <div className="flex items-center justify-around px-[8px]" style={{ height: '64px' }}>
        {items.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={(e) => { e.preventDefault(); navigateTo(item.href) }}
              className="flex flex-col items-center justify-center gap-[3px] flex-1"
              style={{
                color: item.amber ? '#D97706' : item.active ? '#1A1A1A' : '#999999',
                opacity: item.active || item.amber ? 1 : 0.7,
                transition: 'all 150ms ease',
              }}
            >
              <Icon className="w-[20px] h-[20px]" strokeWidth={item.active ? 2.2 : 1.8} />
              <span className="text-[10px] font-medium" style={{ letterSpacing: '0.02em' }}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
      <div style={{ height: 'env(safe-area-inset-bottom)', background: 'rgba(255,255,255,0.97)' }} />
    </nav>
  )
}
