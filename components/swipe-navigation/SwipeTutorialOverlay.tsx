"use client"

import { useState, useEffect, useCallback } from 'react'
import useSwipeNavigation from './useSwipeNavigation'
import { useLanguage } from '@/lib/language-context'

const STEPS = 4
const AUTO_ADVANCE_MS = 5000

export default function SwipeTutorialOverlay() {
  const { tutorialDone, completeTutorial } = useSwipeNavigation()
  const { t } = useLanguage()
  const [mounted, setMounted] = useState(false)
  const [step, setStep] = useState(0)
  const [handX, setHandX] = useState(0)
  const [handY, setHandY] = useState(0)

  useEffect(() => setMounted(true), [])

  // Hand animation loop
  useEffect(() => {
    if (tutorialDone || !mounted) return

    let frame: number
    let startTime = Date.now()

    const animate = () => {
      const elapsed = (Date.now() - startTime) % 2000
      const progress = elapsed / 2000

      if (step === 1) {
        // Horizontal swipe demo
        setHandX(Math.sin(progress * Math.PI * 2) * 60)
        setHandY(0)
      } else if (step === 2) {
        // Vertical swipe demo
        setHandX(0)
        setHandY(Math.sin(progress * Math.PI * 2) * -40)
      } else {
        setHandX(0)
        setHandY(0)
      }

      frame = requestAnimationFrame(animate)
    }

    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [step, tutorialDone, mounted])

  // Auto advance
  useEffect(() => {
    if (tutorialDone || !mounted) return
    const timer = setTimeout(() => {
      if (step < STEPS - 1) setStep(s => s + 1)
    }, AUTO_ADVANCE_MS)
    return () => clearTimeout(timer)
  }, [step, tutorialDone, mounted])

  const nextStep = useCallback(() => {
    if (step < STEPS - 1) setStep(s => s + 1)
    else completeTutorial()
  }, [step, completeTutorial])

  if (!mounted || tutorialDone) return null

  const gold = 'oklch(0.75 0.15 85)'

  return (
    <div
      onClick={nextStep}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        backgroundColor: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        padding: '24px',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* Skip button */}
      <button
        onClick={(e) => { e.stopPropagation(); completeTutorial() }}
        style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          padding: '8px 16px',
          borderRadius: '20px',
          backgroundColor: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.2)',
          color: 'white',
          fontSize: '14px',
          cursor: 'pointer',
        }}
      >
        {t('skip') || 'Skip'}
      </button>

      {/* Step content */}
      <div style={{ textAlign: 'center', maxWidth: '320px' }}>
        {step === 0 && (
          <>
            <div style={{ fontSize: '48px', marginBottom: '24px' }}>✨</div>
            <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '12px' }}>
              {t('tutorialWelcome') || 'Swipe ile Gezin'}
            </h2>
            <p style={{ fontSize: '16px', opacity: 0.7, lineHeight: 1.5 }}>
              {t('tutorialWelcomeDesc') || 'Butonlara gerek yok! Parmağınızla kaydırarak ekranlar arası geçin.'}
            </p>
            {/* Screen map visualization */}
            <div style={{
              marginTop: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontSize: '12px',
              opacity: 0.6,
            }}>
              <span>Keşfet</span>
              <span style={{ color: gold }}>←←</span>
              <span>Mesajlar</span>
              <span style={{ color: gold }}>←</span>
              <span style={{
                padding: '4px 12px',
                borderRadius: '12px',
                backgroundColor: gold,
                color: 'black',
                fontWeight: 'bold',
              }}>
                Ana Sayfa
              </span>
              <span style={{ color: gold }}>→</span>
              <span>Bildirimler</span>
              <span style={{ color: gold }}>→→</span>
              <span>Profil</span>
            </div>
            <div style={{ marginTop: '12px', fontSize: '12px', opacity: 0.5 }}>
              ↑ Yukarı çek = Mağaza
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <div style={{ fontSize: '48px', marginBottom: '24px' }}>👆</div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '12px' }}>
              {t('tutorialHorizontal') || 'Sola & Sağa Kaydır'}
            </h2>
            <p style={{ fontSize: '16px', opacity: 0.7, lineHeight: 1.5 }}>
              {t('tutorialHorizontalDesc') || 'Sola kaydır → Mesajlar & Keşfet. Sağa kaydır → Bildirimler & Profil.'}
            </p>
            {/* Animated hand */}
            <div style={{
              marginTop: '40px',
              fontSize: '64px',
              transform: `translateX(${handX}px)`,
              transition: 'none',
            }}>
              👋
            </div>
            <div style={{
              marginTop: '16px',
              display: 'flex',
              justifyContent: 'center',
              gap: '32px',
              fontSize: '14px',
              opacity: 0.5,
            }}>
              <span>← Sol</span>
              <span>Sağ →</span>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div style={{ fontSize: '48px', marginBottom: '24px' }}>🛍️</div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '12px' }}>
              {t('tutorialVertical') || 'Yukarı Çek = Mağaza'}
            </h2>
            <p style={{ fontSize: '16px', opacity: 0.7, lineHeight: 1.5 }}>
              {t('tutorialVerticalDesc') || 'Herhangi bir ekranda yukarı çekerek mağazayı açın.'}
            </p>
            {/* Animated hand going up */}
            <div style={{
              marginTop: '40px',
              fontSize: '64px',
              transform: `translateY(${handY}px)`,
              transition: 'none',
            }}>
              ☝️
            </div>
            <div style={{ marginTop: '16px', fontSize: '14px', opacity: 0.5 }}>
              ↑ Yukarı çek
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div style={{ fontSize: '48px', marginBottom: '24px' }}>➕</div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '12px' }}>
              {t('tutorialCreate') || 'İçerik Oluştur'}
            </h2>
            <p style={{ fontSize: '16px', opacity: 0.7, lineHeight: 1.5 }}>
              {t('tutorialCreateDesc') || 'Alttaki + butonuna basarak fotoğraf, video veya canlı yayın paylaşın.'}
            </p>
            {/* Create button preview */}
            <div style={{
              marginTop: '40px',
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${gold}, oklch(0.65 0.15 60))`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '40px auto 0',
              boxShadow: `0 0 30px rgba(255,200,100,0.4)`,
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </div>
            <div style={{
              marginTop: '32px',
              padding: '12px 24px',
              borderRadius: '20px',
              backgroundColor: gold,
              color: 'black',
              fontWeight: 'bold',
              fontSize: '16px',
              display: 'inline-block',
            }}>
              {t('tutorialStart') || 'Başla!'}
            </div>
          </>
        )}
      </div>

      {/* Step indicators */}
      <div style={{
        position: 'absolute',
        bottom: '40px',
        display: 'flex',
        gap: '8px',
      }}>
        {Array.from({ length: STEPS }).map((_, i) => (
          <div
            key={i}
            style={{
              width: i === step ? '24px' : '8px',
              height: '8px',
              borderRadius: '4px',
              backgroundColor: i === step ? gold : 'rgba(255,255,255,0.3)',
              transition: 'all 0.3s ease',
            }}
          />
        ))}
      </div>

      {/* Tap to continue hint */}
      {step < STEPS - 1 && (
        <div style={{
          position: 'absolute',
          bottom: '60px',
          fontSize: '12px',
          opacity: 0.4,
        }}>
          {t('tapToContinue') || 'Devam etmek için dokun'}
        </div>
      )}
    </div>
  )
}
