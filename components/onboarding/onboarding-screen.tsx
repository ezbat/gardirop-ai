"use client"

import { motion } from 'framer-motion'

interface OnboardingScreenProps {
  id: number
  title: string
  description: string
  emoji: string
  gradient: string
  currentStep: number
  totalSteps: number
}

export default function OnboardingScreen({
  title,
  description,
  emoji,
  gradient,
  currentStep,
  totalSteps
}: OnboardingScreenProps) {
  return (
    <div className={`flex flex-col items-center justify-center h-full px-8 bg-gradient-to-br ${gradient} text-white`}>
      {/* Hero emoji animation */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{
          type: "spring",
          stiffness: 200,
          damping: 15,
          delay: 0.1
        }}
        className="mb-12"
      >
        <div className="text-[120px] leading-none select-none">
          {emoji}
        </div>
      </motion.div>

      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-3xl font-bold text-center mb-4 max-w-md"
      >
        {title}
      </motion.h1>

      {/* Description */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-lg text-center text-white/90 max-w-sm leading-relaxed"
      >
        {description}
      </motion.p>

      {/* Decorative elements */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="absolute top-20 left-10 w-20 h-20 rounded-full bg-white/10 blur-2xl"
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="absolute bottom-40 right-10 w-32 h-32 rounded-full bg-white/10 blur-3xl"
      />

      {/* Floating animation circles */}
      <motion.div
        animate={{
          y: [-10, 10, -10],
          rotate: [0, 5, 0]
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute top-1/4 right-1/4 w-16 h-16 rounded-full bg-white/5 backdrop-blur-sm border border-white/20"
      />
      <motion.div
        animate={{
          y: [10, -10, 10],
          rotate: [0, -5, 0]
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.5
        }}
        className="absolute bottom-1/3 left-1/4 w-12 h-12 rounded-full bg-white/5 backdrop-blur-sm border border-white/20"
      />
    </div>
  )
}
