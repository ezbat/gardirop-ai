"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import OnboardingScreen from '@/components/onboarding/onboarding-screen'

// Onboarding screen data
const screens = [
  {
    id: 1,
    title: "Keşfet, Beğen, Satın Al",
    description: "Dünya çapında ürünleri keşfet, beğen, anında satın al",
    emoji: "🛍️",
    gradient: "from-blue-500 to-purple-600"
  },
  {
    id: 2,
    title: "Tüm Dünyadan Satıcılar",
    description: "Milyonlarca satıcıdan güvenle alışveriş yap",
    emoji: "🌍",
    gradient: "from-purple-600 to-pink-500"
  },
  {
    id: 3,
    title: "Güvenli Ödeme",
    description: "Stripe ile korunan ödemeler, 100% güvenli",
    emoji: "🔒",
    gradient: "from-pink-500 to-red-500"
  },
  {
    id: 4,
    title: "Canlı Yayınlarla Alışveriş",
    description: "Canlı yayınlarda ürünleri gör, anında satın al",
    emoji: "📱",
    gradient: "from-red-500 to-orange-500"
  },
  {
    id: 5,
    title: "Hemen Başla!",
    description: "Hadi başlayalım! İlk keşfine hazır mısın?",
    emoji: "🎉",
    gradient: "from-orange-500 to-yellow-500"
  }
]

export default function OnboardingPage() {
  const router = useRouter()
  const [currentScreen, setCurrentScreen] = useState(0)
  const [direction, setDirection] = useState(0)

  // Check if user already completed onboarding
  useEffect(() => {
    const completed = localStorage.getItem('onboarding-complete')
    if (completed === 'true') {
      router.push('/explore')
    }
  }, [router])

  const handleNext = () => {
    if (currentScreen === screens.length - 1) {
      completeOnboarding()
    } else {
      setDirection(1)
      setCurrentScreen((prev) => prev + 1)
    }
  }

  const handlePrev = () => {
    if (currentScreen > 0) {
      setDirection(-1)
      setCurrentScreen((prev) => prev - 1)
    }
  }

  const handleSkip = () => {
    completeOnboarding()
  }

  const completeOnboarding = () => {
    localStorage.setItem('onboarding-complete', 'true')
    router.push('/explore')
  }

  const handleSwipe = (event: any, info: any) => {
    const swipeThreshold = 50

    if (info.offset.x < -swipeThreshold) {
      // Swipe left -> next screen
      handleNext()
    } else if (info.offset.x > swipeThreshold) {
      // Swipe right -> previous screen
      handlePrev()
    }
  }

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0
    })
  }

  return (
    <div className="relative min-h-screen-mobile bg-background overflow-hidden">
      {/* Skip button */}
      {currentScreen < screens.length - 1 && (
        <button
          onClick={handleSkip}
          className="absolute top-8 right-6 z-50 px-4 py-2 text-sm font-medium text-muted-foreground tap-highlight-none safe-area-top"
        >
          Skip
        </button>
      )}

      {/* Swipeable screens */}
      <div className="relative h-screen overflow-hidden">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={currentScreen}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 }
            }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleSwipe}
            className="absolute inset-0"
          >
            <OnboardingScreen
              {...screens[currentScreen]}
              currentStep={currentScreen}
              totalSteps={screens.length}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Progress dots */}
      <div className="absolute bottom-32 left-0 right-0 flex justify-center gap-2 z-40 safe-area-bottom">
        {screens.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              setDirection(index > currentScreen ? 1 : -1)
              setCurrentScreen(index)
            }}
            className="tap-highlight-none"
          >
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentScreen
                  ? 'w-8 bg-primary'
                  : 'w-2 bg-muted-foreground/30'
              }`}
            />
          </button>
        ))}
      </div>

      {/* Action buttons */}
      <div className="absolute bottom-8 left-6 right-6 z-40 flex gap-3 safe-area-bottom">
        {currentScreen > 0 && (
          <button
            onClick={handlePrev}
            className="flex-1 h-14 rounded-full bg-secondary text-secondary-foreground font-semibold active:scale-95 transition-transform tap-highlight-none"
          >
            Back
          </button>
        )}
        <button
          onClick={handleNext}
          className={`h-14 rounded-full bg-gradient-to-r ${screens[currentScreen].gradient} text-white font-semibold active:scale-95 transition-transform tap-highlight-none ${
            currentScreen === 0 ? 'flex-1' : 'flex-1'
          }`}
        >
          {currentScreen === screens.length - 1 ? "Let's Go! 🚀" : "Next"}
        </button>
      </div>
    </div>
  )
}
