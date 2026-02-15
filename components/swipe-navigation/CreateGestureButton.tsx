"use client"

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import useSwipeNavigation from './useSwipeNavigation'
import { isMainScreen } from './screen-map'
import CreateContentSheet from '@/components/create-content-sheet'

export default function CreateGestureButton() {
  const pathname = usePathname()
  const { createOpen, openCreate, closeCreate } = useSwipeNavigation()
  const [mounted, setMounted] = useState(false)
  const [pressed, setPressed] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted || !isMainScreen(pathname)) return null

  return (
    <>
      <button
        onClick={openCreate}
        onTouchStart={() => setPressed(true)}
        onTouchEnd={() => setPressed(false)}
        onMouseDown={() => setPressed(true)}
        onMouseUp={() => setPressed(false)}
        onMouseLeave={() => setPressed(false)}
        style={{
          position: 'fixed',
          bottom: '28px',
          left: '50%',
          transform: `translateX(-50%) scale(${pressed ? 0.9 : 1})`,
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, oklch(0.75 0.15 85), oklch(0.65 0.15 60))',
          border: '2px solid rgba(255,255,255,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 9500,
          opacity: pressed ? 1 : 0.5,
          transition: 'opacity 0.2s ease, transform 0.15s ease',
          boxShadow: pressed ? '0 0 20px rgba(255,200,100,0.4)' : '0 2px 10px rgba(0,0,0,0.3)',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {createOpen && (
        <CreateContentSheet
          isOpen={createOpen}
          onClose={closeCreate}
        />
      )}
    </>
  )
}
