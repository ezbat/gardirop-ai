"use client"

import { createContext, useState, useEffect, useCallback, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  SCREENS,
  STORE_SCREEN,
  HOME_INDEX,
  DOUBLE_SWIPE_WINDOW,
  getCurrentIndex,
  isMainScreen,
  canSwipeLeft,
  canSwipeRight,
  getLeftScreen,
  getRightScreen,
  type SwipeDirection,
} from './screen-map'

export interface SwipeNavContextType {
  currentIndex: number
  isTransitioning: boolean
  transitionDirection: SwipeDirection | null
  storeOpen: boolean
  createOpen: boolean
  tutorialDone: boolean
  navigateLeft: () => void
  navigateRight: () => void
  openStore: () => void
  closeStore: () => void
  openCreate: () => void
  closeCreate: () => void
  completeTutorial: () => void
  canGoLeft: boolean
  canGoRight: boolean
}

export const SwipeNavContext = createContext<SwipeNavContextType | null>(null)

export default function SwipeNavigationProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()

  const [currentIndex, setCurrentIndex] = useState(() => getCurrentIndex(pathname))
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [transitionDirection, setTransitionDirection] = useState<SwipeDirection | null>(null)
  const [storeOpen, setStoreOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [tutorialDone, setTutorialDone] = useState(true) // default true, check in useEffect

  const lastSwipeTime = useRef(0)
  const lastSwipeDir = useRef<'left' | 'right' | null>(null)

  // Sync currentIndex with pathname
  useEffect(() => {
    if (isMainScreen(pathname)) {
      setCurrentIndex(getCurrentIndex(pathname))
    }
  }, [pathname])

  // Check tutorial state
  useEffect(() => {
    const done = localStorage.getItem('wearo-swipe-tutorial') === 'done'
    setTutorialDone(done)
  }, [])

  // Prefetch adjacent screens
  useEffect(() => {
    const left = getLeftScreen(currentIndex)
    const right = getRightScreen(currentIndex)
    if (left) router.prefetch(left.path)
    if (right) router.prefetch(right.path)
    router.prefetch(STORE_SCREEN.path)
  }, [currentIndex, router])

  const navigateTo = useCallback((index: number, direction: SwipeDirection) => {
    const target = SCREENS[index]
    if (!target) return

    // Auth check
    if (target.authRequired && !session?.user) {
      router.push('/auth/signin')
      return
    }

    setIsTransitioning(true)
    setTransitionDirection(direction)

    // Small delay for animation to start, then navigate
    setTimeout(() => {
      router.push(target.path)
      setCurrentIndex(index)
      setTimeout(() => {
        setIsTransitioning(false)
        setTransitionDirection(null)
      }, 350)
    }, 50)
  }, [router, session])

  const navigateLeft = useCallback(() => {
    if (isTransitioning || !canSwipeLeft(currentIndex)) return

    const now = Date.now()
    // Double swipe detection: if second left swipe within window, jump 2
    if (lastSwipeDir.current === 'left' && now - lastSwipeTime.current < DOUBLE_SWIPE_WINDOW && canSwipeLeft(currentIndex - 1)) {
      lastSwipeTime.current = now
      lastSwipeDir.current = 'left'
      navigateTo(currentIndex - 2, 'left')
      return
    }

    lastSwipeTime.current = now
    lastSwipeDir.current = 'left'
    navigateTo(currentIndex - 1, 'left')
  }, [currentIndex, isTransitioning, navigateTo])

  const navigateRight = useCallback(() => {
    if (isTransitioning || !canSwipeRight(currentIndex)) return

    const now = Date.now()
    // Double swipe detection
    if (lastSwipeDir.current === 'right' && now - lastSwipeTime.current < DOUBLE_SWIPE_WINDOW && canSwipeRight(currentIndex + 1)) {
      lastSwipeTime.current = now
      lastSwipeDir.current = 'right'
      navigateTo(currentIndex + 2, 'right')
      return
    }

    lastSwipeTime.current = now
    lastSwipeDir.current = 'right'
    navigateTo(currentIndex + 1, 'right')
  }, [currentIndex, isTransitioning, navigateTo])

  const openStore = useCallback(() => {
    if (isTransitioning) return
    router.prefetch(STORE_SCREEN.path)
    setStoreOpen(true)
    router.push(STORE_SCREEN.path)
  }, [isTransitioning, router])

  const closeStore = useCallback(() => {
    setStoreOpen(false)
    router.back()
  }, [router])

  const openCreate = useCallback(() => setCreateOpen(true), [])
  const closeCreate = useCallback(() => setCreateOpen(false), [])

  const completeTutorial = useCallback(() => {
    localStorage.setItem('wearo-swipe-tutorial', 'done')
    setTutorialDone(true)
  }, [])

  // Keyboard navigation
  useEffect(() => {
    if (!isMainScreen(pathname) && pathname !== STORE_SCREEN.path) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if focus is in input, textarea, select
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      // Skip if modifier keys
      if (e.ctrlKey || e.metaKey || e.altKey) return

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          navigateLeft()
          break
        case 'ArrowRight':
          e.preventDefault()
          navigateRight()
          break
        case 'ArrowUp':
          e.preventDefault()
          if (!storeOpen) openStore()
          break
        case 'ArrowDown':
          e.preventDefault()
          if (storeOpen) closeStore()
          break
        case 'Escape':
          if (storeOpen) closeStore()
          else if (createOpen) closeCreate()
          else if (currentIndex !== HOME_INDEX) navigateTo(HOME_INDEX, currentIndex > HOME_INDEX ? 'left' : 'right')
          break
        case 'c':
        case 'C':
          if (!createOpen) openCreate()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [pathname, currentIndex, storeOpen, createOpen, isTransitioning, navigateLeft, navigateRight, openStore, closeStore, openCreate, closeCreate, navigateTo])

  return (
    <SwipeNavContext.Provider value={{
      currentIndex,
      isTransitioning,
      transitionDirection,
      storeOpen,
      createOpen,
      tutorialDone,
      navigateLeft,
      navigateRight,
      openStore,
      closeStore,
      openCreate,
      closeCreate,
      completeTutorial,
      canGoLeft: canSwipeLeft(currentIndex),
      canGoRight: canSwipeRight(currentIndex),
    }}>
      {children}
    </SwipeNavContext.Provider>
  )
}
