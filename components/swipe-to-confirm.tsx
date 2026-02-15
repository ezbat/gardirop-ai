"use client"

import { useState, useRef } from 'react'
import { motion, useMotionValue, useTransform } from 'framer-motion'
import { ChevronRight, Check, Loader2 } from 'lucide-react'

interface SwipeToConfirmProps {
  onConfirm: () => Promise<void>
  disabled?: boolean
  label?: string
}

export default function SwipeToConfirm({
  onConfirm,
  disabled = false,
  label = "Kaydır Satın Al"
}: SwipeToConfirmProps) {
  const [isConfirming, setIsConfirming] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isFailed, setIsFailed] = useState(false)

  const constraintsRef = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)

  // Transform x position to percentage (0-100)
  const progress = useTransform(x, [0, 200], [0, 100])

  // Background fill based on progress
  const backgroundWidth = useTransform(progress, [0, 100], ['0%', '100%'])

  const handleDragEnd = async (_: any, info: any) => {
    const threshold = 160 // 80% of 200px track width

    if (info.point.x >= threshold && !disabled && !isConfirming) {
      // Success - animate to end and confirm
      setIsConfirming(true)
      x.set(200)

      try {
        await onConfirm()
        setIsSuccess(true)

        // Reset after success animation
        setTimeout(() => {
          setIsSuccess(false)
          setIsConfirming(false)
          x.set(0)
        }, 2000)
      } catch (error) {
        // Error - shake and reset
        setIsFailed(true)
        setTimeout(() => {
          setIsFailed(false)
          setIsConfirming(false)
          x.set(0)
        }, 1000)
      }
    } else {
      // Reset to start
      x.set(0)
    }
  }

  return (
    <div className="relative w-full">
      {/* Track container */}
      <div
        ref={constraintsRef}
        className={`relative h-16 rounded-full bg-secondary overflow-hidden ${
          disabled ? 'opacity-50' : ''
        }`}
      >
        {/* Progress fill */}
        <motion.div
          style={{ width: backgroundWidth }}
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-primary/80"
        />

        {/* Label text */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-sm font-semibold text-foreground/60">
            {isConfirming ? 'Processing...' : isSuccess ? 'Success!' : isFailed ? 'Failed' : label}
          </span>
        </div>

        {/* Draggable thumb */}
        <motion.div
          drag={disabled || isConfirming ? false : 'x'}
          dragConstraints={constraintsRef}
          dragElastic={0.1}
          dragMomentum={false}
          onDragEnd={handleDragEnd}
          style={{ x }}
          animate={isFailed ? {
            x: [0, -10, 10, -10, 10, 0]
          } : undefined}
          transition={isFailed ? {
            duration: 0.5,
            ease: 'easeInOut'
          } : undefined}
          className={`absolute left-2 top-2 w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center cursor-grab active:cursor-grabbing ${
            disabled ? 'cursor-not-allowed' : ''
          }`}
        >
          {isConfirming ? (
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          ) : isSuccess ? (
            <Check className="w-6 h-6 text-green-500" />
          ) : (
            <ChevronRight className="w-6 h-6 text-primary" />
          )}
        </motion.div>
      </div>

      {/* Instruction text */}
      {!isConfirming && !isSuccess && (
        <p className="text-xs text-muted-foreground text-center mt-2">
          Satın almak için sağa kaydırın
        </p>
      )}
    </div>
  )
}
