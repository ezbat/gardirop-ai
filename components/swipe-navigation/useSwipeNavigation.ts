"use client"

import { useContext } from 'react'
import { SwipeNavContext, type SwipeNavContextType } from './SwipeNavigationProvider'

export default function useSwipeNavigation(): SwipeNavContextType {
  const context = useContext(SwipeNavContext)
  if (!context) {
    throw new Error('useSwipeNavigation must be used within SwipeNavigationProvider')
  }
  return context
}
