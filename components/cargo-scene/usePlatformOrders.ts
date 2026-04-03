'use client'

/**
 * usePlatformOrders — Real data hook for cargo scene.
 *
 * DATA MODEL:
 * - totalOrders: real platform-wide order count (from API)
 * - cycleProgress: 0→1 within the current takeoff cycle (totalOrders % TAKEOFF_THRESHOLD / TAKEOFF_THRESHOLD)
 * - isTakingOff: true when a threshold cycle completes
 * - boxRate: visual abstraction — higher orders = faster box loading rhythm
 *
 * WHAT IS DATA-DRIVEN:
 * - totalOrders count comes from the real database
 * - cycleProgress is derived from real orders modulo the threshold
 * - isTakingOff triggers at real threshold crossings
 *
 * WHAT IS VISUAL ABSTRACTION:
 * - boxRate is a smoothed visual rhythm, not 1:1 with real orders
 * - Individual box animations are decorative, not representing specific orders
 * - The "cargo loading speed" is an artistic interpretation of platform activity
 *
 * WHAT IS FUTURE-READY:
 * - Real-time WebSocket/SSE can replace polling
 * - Per-user order count can personalize the profile scene
 * - Seasonal themes can modify plane appearance
 */

import { useState, useEffect, useCallback, useRef } from 'react'

export const TAKEOFF_THRESHOLD = 50

interface PlatformOrderState {
  totalOrders: number
  cycleProgress: number      // 0→1 within current cycle
  isTakingOff: boolean       // true when threshold crossed
  boxRate: number            // 0→1 visual loading intensity
  userOrderCount: number     // current user's order count (profile context)
  loading: boolean
}

export function usePlatformOrders(userId?: string): PlatformOrderState {
  const [state, setState] = useState<PlatformOrderState>({
    totalOrders: 0,
    cycleProgress: 0,
    isTakingOff: false,
    boxRate: 0.3,
    userOrderCount: 0,
    loading: true,
  })
  const prevCycleRef = useRef(0)

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/storefront/order-activity')
      const data = await res.json()

      if (data.success) {
        const total = data.totalOrders ?? 0
        const currentCycle = Math.floor(total / TAKEOFF_THRESHOLD)
        const withinCycle = total % TAKEOFF_THRESHOLD
        const progress = withinCycle / TAKEOFF_THRESHOLD

        // Detect threshold crossing
        const justCrossed = currentCycle > prevCycleRef.current && prevCycleRef.current > 0
        prevCycleRef.current = currentCycle

        // Visual abstraction: box loading rate based on recent activity
        // More recent orders = higher rate, smoothed between 0.2 and 1.0
        const recentRate = Math.min(1, Math.max(0.2, (data.recentOrdersPerHour ?? 0) / 10))

        setState({
          totalOrders: total,
          cycleProgress: progress,
          isTakingOff: justCrossed,
          boxRate: recentRate,
          userOrderCount: data.userOrderCount ?? 0,
          loading: false,
        })
      }
    } catch {
      setState(prev => ({ ...prev, loading: false }))
    }
  }, [])

  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, 30_000) // Poll every 30s
    return () => clearInterval(interval)
  }, [fetchOrders])

  return state
}

/**
 * useReducedMotion — respects prefers-reduced-motion.
 */
export function useCargoMotionPreference() {
  const [reduced, setReduced] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', handler)

    setIsMobile(window.innerWidth < 768)
    const resizeHandler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', resizeHandler)

    return () => {
      mq.removeEventListener('change', handler)
      window.removeEventListener('resize', resizeHandler)
    }
  }, [])

  return { reducedMotion: reduced, isMobile }
}
