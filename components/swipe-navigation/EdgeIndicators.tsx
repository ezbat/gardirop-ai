"use client"

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import useSwipeNavigation from './useSwipeNavigation'
import { SCREENS, isMainScreen } from './screen-map'
import { supabase } from '@/lib/supabase'

export default function EdgeIndicators() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { currentIndex, canGoLeft, canGoRight } = useSwipeNavigation()
  const [mounted, setMounted] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => setMounted(true), [])

  // Load unread notification count
  useEffect(() => {
    if (!session?.user?.id) return

    const loadUnread = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .eq('is_read', false)
      setUnreadCount(count || 0)
    }

    loadUnread()

    // Real-time subscription
    const channel = supabase
      .channel('edge-indicator-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${session.user.id}`
        },
        () => loadUnread()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [session?.user?.id])

  if (!mounted || !isMainScreen(pathname)) return null

  const gold = 'oklch(0.75 0.15 85)'
  const green = '#22c55e'
  // Notifications is index 3
  const NOTIF_INDEX = 3

  return (
    <>
      {/* Left edge indicator */}
      {canGoLeft && (
        <div style={{
          position: 'fixed',
          left: 0,
          top: '20%',
          bottom: '20%',
          width: '3px',
          background: `linear-gradient(to bottom, transparent, ${gold}, transparent)`,
          opacity: 0.3,
          zIndex: 9000,
          animation: 'gold-pulse 3s ease-in-out infinite',
          pointerEvents: 'none',
        }} />
      )}

      {/* Right edge indicator */}
      {canGoRight && (
        <div style={{
          position: 'fixed',
          right: 0,
          top: '20%',
          bottom: '20%',
          width: '3px',
          background: `linear-gradient(to bottom, transparent, ${unreadCount > 0 && currentIndex < NOTIF_INDEX ? green : gold}, transparent)`,
          opacity: unreadCount > 0 && currentIndex < NOTIF_INDEX ? 0.6 : 0.3,
          zIndex: 9000,
          animation: 'gold-pulse 3s ease-in-out infinite',
          pointerEvents: 'none',
        }} />
      )}

      {/* Top edge indicator (Store access) */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: '20%',
        right: '20%',
        height: '3px',
        background: `linear-gradient(to right, transparent, ${gold}, transparent)`,
        opacity: 0.25,
        zIndex: 9000,
        animation: 'gold-pulse 3s ease-in-out infinite',
        pointerEvents: 'none',
      }} />

      {/* Bottom position dots */}
      <div style={{
        position: 'fixed',
        bottom: '12px',
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '8px',
        zIndex: 9000,
        pointerEvents: 'none',
      }}>
        {SCREENS.map((screen, idx) => {
          const isActive = idx === currentIndex
          const isNotifDot = idx === NOTIF_INDEX
          const hasUnread = isNotifDot && unreadCount > 0

          return (
            <div
              key={screen.path}
              style={{
                position: 'relative',
                width: isActive ? '20px' : '6px',
                height: '6px',
                borderRadius: '3px',
                backgroundColor: isActive
                  ? (hasUnread ? green : gold)
                  : (hasUnread ? green : 'rgba(255,255,255,0.25)'),
                transition: 'all 0.3s ease',
                opacity: isActive ? 1 : (hasUnread ? 0.9 : 0.6),
                boxShadow: hasUnread ? `0 0 8px ${green}` : 'none',
              }}
            >
              {/* Notification badge number */}
              {hasUnread && !isActive && (
                <div style={{
                  position: 'absolute',
                  top: '-14px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  minWidth: '16px',
                  height: '16px',
                  borderRadius: '8px',
                  backgroundColor: green,
                  color: 'white',
                  fontSize: '9px',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 4px',
                  boxShadow: `0 0 6px ${green}`,
                }}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
