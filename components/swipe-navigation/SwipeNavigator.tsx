"use client"

import { useRef, useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence, type PanInfo } from 'framer-motion'
import { usePathname } from 'next/navigation'
import useSwipeNavigation from './useSwipeNavigation'
import { SWIPE_THRESHOLD, VELOCITY_THRESHOLD, DEADZONE, isMainScreen, STORE_SCREEN } from './screen-map'

type Axis = 'x' | 'y' | null

const pageVariants = {
  enterFromRight: { x: '100%', opacity: 0 },
  enterFromLeft: { x: '-100%', opacity: 0 },
  enterFromBottom: { y: '100%', opacity: 0 },
  center: { x: 0, y: 0, opacity: 1 },
  exitToLeft: { x: '-30%', opacity: 0, scale: 0.95 },
  exitToRight: { x: '30%', opacity: 0, scale: 0.95 },
  exitToTop: { y: '-30%', opacity: 0, scale: 0.95 },
}

const pageTransition = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 30,
}

export default function SwipeNavigator({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const {
    currentIndex,
    isTransitioning,
    transitionDirection,
    storeOpen,
    canGoLeft,
    canGoRight,
    navigateLeft,
    navigateRight,
    openStore,
    closeStore,
  } = useSwipeNavigation()

  const containerRef = useRef<HTMLDivElement>(null)
  const lockedAxis = useRef<Axis>(null)
  const panStarted = useRef(false)
  const [dragOffset, setDragOffset] = useState(0)

  // Scroll position memory
  const scrollMemory = useRef<Map<string, { top: number; time: number }>>(new Map())

  // Save scroll position before navigating
  useEffect(() => {
    return () => {
      if (containerRef.current) {
        const scrollEl = containerRef.current.querySelector('[data-scroll-container]') || containerRef.current
        scrollMemory.current.set(pathname, { top: scrollEl.scrollTop, time: Date.now() })
      }
    }
  }, [pathname])

  // Restore scroll position
  useEffect(() => {
    const saved = scrollMemory.current.get(pathname)
    if (saved && Date.now() - saved.time < 30000) {
      requestAnimationFrame(() => {
        if (containerRef.current) {
          const scrollEl = containerRef.current.querySelector('[data-scroll-container]') || containerRef.current
          scrollEl.scrollTop = saved.top
        }
      })
    }
    // Clean old entries
    scrollMemory.current.forEach((v, k) => {
      if (Date.now() - v.time > 30000) scrollMemory.current.delete(k)
    })
  }, [pathname])

  const isSwipeDisabled = useCallback((): boolean => {
    // Disabled on non-main screens
    if (!isMainScreen(pathname) && pathname !== STORE_SCREEN.path) return true
    // Disabled during transition
    if (isTransitioning) return true
    // Disabled when modal is open
    if (typeof document !== 'undefined') {
      const modal = document.querySelector('[role="dialog"], [data-radix-portal], .fixed.inset-0')
      if (modal) return true
    }
    return false
  }, [pathname, isTransitioning])

  const isTargetSwipeable = useCallback((target: EventTarget | null): boolean => {
    let el = target as HTMLElement | null
    while (el) {
      // Skip if inside input, textarea, select
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) return false
      // Skip if inside no-swipe area
      if (el.classList?.contains('no-swipe')) return false
      // Skip if inside horizontal scroll container
      if (el.scrollWidth > el.clientWidth && el.classList?.contains('overflow-x-auto')) return false
      el = el.parentElement
    }
    return true
  }, [])

  const canSwipeVertically = useCallback((): boolean => {
    if (!containerRef.current) return false
    const scrollEl = containerRef.current.querySelector('[data-scroll-container]') || containerRef.current
    // Only allow vertical swipe at scroll boundaries
    return scrollEl.scrollTop <= 0
  }, [])

  const handlePanStart = useCallback((e: PointerEvent) => {
    if (isSwipeDisabled()) return
    if (!isTargetSwipeable(e.target)) return
    lockedAxis.current = null
    panStarted.current = true
    setDragOffset(0)
  }, [isSwipeDisabled, isTargetSwipeable])

  const handlePan = useCallback((e: PointerEvent, info: PanInfo) => {
    if (!panStarted.current || isSwipeDisabled()) return

    const { offset } = info

    // Axis locking: determine direction after deadzone
    if (!lockedAxis.current) {
      if (Math.abs(offset.x) > DEADZONE || Math.abs(offset.y) > DEADZONE) {
        lockedAxis.current = Math.abs(offset.x) > Math.abs(offset.y) ? 'x' : 'y'
      } else {
        return
      }
    }

    if (lockedAxis.current === 'x') {
      // Horizontal: show visual drag feedback
      const maxDrag = canGoLeft && offset.x > 0 ? offset.x :
                      canGoRight && offset.x < 0 ? offset.x : 0
      setDragOffset(maxDrag * 0.3) // Resistance factor
    }
  }, [isSwipeDisabled, canGoLeft, canGoRight])

  const handlePanEnd = useCallback((e: PointerEvent, info: PanInfo) => {
    if (!panStarted.current) return
    panStarted.current = false
    setDragOffset(0)

    if (isSwipeDisabled()) return

    const { offset, velocity } = info
    const axis = lockedAxis.current
    lockedAxis.current = null

    if (!axis) return

    if (axis === 'x') {
      const isLeftSwipe = offset.x < -SWIPE_THRESHOLD || velocity.x < -VELOCITY_THRESHOLD
      const isRightSwipe = offset.x > SWIPE_THRESHOLD || velocity.x > VELOCITY_THRESHOLD

      if (isLeftSwipe && canGoRight) {
        // Swiped left → go to right screen
        navigateRight()
      } else if (isRightSwipe && canGoLeft) {
        // Swiped right → go to left screen
        navigateLeft()
      }
    } else if (axis === 'y') {
      const isUpSwipe = offset.y < -SWIPE_THRESHOLD || velocity.y < -VELOCITY_THRESHOLD

      if (isUpSwipe && canSwipeVertically() && !storeOpen) {
        openStore()
      }
    }
  }, [isSwipeDisabled, canGoLeft, canGoRight, navigateLeft, navigateRight, canSwipeVertically, storeOpen, openStore])

  // Determine animation variants based on transition direction
  const getInitialVariant = () => {
    if (!transitionDirection) return 'center'
    switch (transitionDirection) {
      case 'left': return 'enterFromLeft'
      case 'right': return 'enterFromRight'
      default: return 'center'
    }
  }

  const getExitVariant = () => {
    if (!transitionDirection) return 'center'
    switch (transitionDirection) {
      case 'left': return 'exitToRight'
      case 'right': return 'exitToLeft'
      default: return 'center'
    }
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', minHeight: '100vh', overflow: 'hidden' }}>
      <motion.div
        onPanStart={handlePanStart}
        onPan={handlePan}
        onPanEnd={handlePanEnd}
        style={{
          width: '100%',
          minHeight: '100vh',
          touchAction: 'pan-y',
          transform: dragOffset ? `translateX(${dragOffset}px)` : undefined,
          transition: dragOffset ? 'none' : 'transform 0.3s ease-out',
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={pathname}
            initial={getInitialVariant()}
            animate="center"
            exit={getExitVariant()}
            variants={pageVariants}
            transition={pageTransition}
            style={{ width: '100%', minHeight: '100vh' }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Store overlay (bottom sheet from bottom) */}
      <AnimatePresence>
        {storeOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={closeStore}
              style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'black',
                zIndex: 9990,
              }}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.5 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 100 || info.velocity.y > 0.5) {
                  closeStore()
                }
              }}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 9991,
                borderTopLeftRadius: '1.5rem',
                borderTopRightRadius: '1.5rem',
                overflow: 'hidden',
              }}
            >
              {/* Store drag handle */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                display: 'flex',
                justifyContent: 'center',
                paddingTop: '12px',
                paddingBottom: '8px',
                zIndex: 10,
              }}>
                <div style={{
                  width: '40px',
                  height: '4px',
                  borderRadius: '2px',
                  backgroundColor: 'rgba(255,255,255,0.3)',
                }} />
              </div>
              <iframe
                src="/store"
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  backgroundColor: 'var(--background)',
                }}
                title="Store"
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
