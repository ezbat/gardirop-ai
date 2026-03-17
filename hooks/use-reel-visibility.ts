'use client'

import { useRef, useEffect, useCallback } from 'react'

// Module-level set: tracks which reels have already been "viewed" this session
const viewedReels = new Set<string>()

interface UseReelVisibilityOptions {
  postId: string
  onVisible?: (postId: string) => void
  onEnter?: () => void   // called when 60%+ visible (for autoplay)
  onLeave?: () => void   // called when less than 60% visible (for pause)
  threshold?: number      // default 0.6
  delay?: number          // default 2000ms
}

export function useReelVisibility({
  postId,
  onVisible,
  onEnter,
  onLeave,
  threshold = 0.6,
  delay = 2000,
}: UseReelVisibilityOptions) {
  const ref = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isVisibleRef = useRef(false)

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Element is >= threshold visible
          if (!isVisibleRef.current) {
            isVisibleRef.current = true
            onEnter?.()
          }

          // Start view-count timer (only if not already viewed)
          if (!viewedReels.has(postId) && onVisible) {
            clearTimer()
            timerRef.current = setTimeout(() => {
              if (isVisibleRef.current && !viewedReels.has(postId)) {
                viewedReels.add(postId)
                onVisible(postId)
              }
            }, delay)
          }
        } else {
          // Element is less than threshold visible
          if (isVisibleRef.current) {
            isVisibleRef.current = false
            onLeave?.()
          }
          clearTimer()
        }
      },
      { threshold }
    )

    observer.observe(element)

    return () => {
      observer.disconnect()
      clearTimer()
    }
  }, [postId, onVisible, onEnter, onLeave, threshold, delay, clearTimer])

  return ref
}
