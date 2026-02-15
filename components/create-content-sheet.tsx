"use client"

import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Image, Video, Radio } from 'lucide-react'

interface CreateContentSheetProps {
  isOpen: boolean
  onClose: () => void
}

export default function CreateContentSheet({ isOpen, onClose }: CreateContentSheetProps) {
  const router = useRouter()

  const options = [
    {
      icon: Video,
      title: 'Video Post',
      description: 'Create Reels-style video',
      gradient: 'from-purple-600 to-pink-500',
      action: () => {
        router.push('/upload/video')
        onClose()
      }
    },
    {
      icon: Image,
      title: 'Photo Post',
      description: 'Share photos with caption',
      gradient: 'from-blue-600 to-cyan-500',
      action: () => {
        // Keep existing modal
        onClose()
        // Trigger old create post modal
      }
    },
    {
      icon: Radio,
      title: 'Live Stream',
      description: 'Go live with products',
      gradient: 'from-red-600 to-orange-500',
      action: () => {
        router.push('/live/start')
        onClose()
      }
    }
  ]

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-background rounded-t-3xl p-6 z-50 safe-area-bottom"
          >
            {/* Handle */}
            <div className="bottom-sheet-handle" />

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-secondary tap-highlight-none"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Title */}
            <h2 className="text-2xl font-bold mb-6">Create Content</h2>

            {/* Options */}
            <div className="space-y-3 mb-6">
              {options.map((option, index) => (
                <button
                  key={index}
                  onClick={option.action}
                  disabled={false}
                  className="w-full p-4 rounded-2xl bg-gradient-to-r ${option.gradient} text-white flex items-center gap-4 tap-highlight-none active:scale-98 transition-transform disabled:opacity-50"
                  style={{
                    background: `linear-gradient(to right, var(--tw-gradient-stops))`,
                    backgroundImage: `linear-gradient(to right, ${option.gradient.includes('purple') ? 'rgb(147, 51, 234), rgb(236, 72, 153)' : option.gradient.includes('blue') ? 'rgb(37, 99, 235), rgb(6, 182, 212)' : 'rgb(220, 38, 38), rgb(249, 115, 22)'})`
                  }}
                >
                  <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <option.icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold flex items-center gap-2">
                      {option.title}
                      {(option as any).badge && (
                        <span className="text-xs px-2 py-0.5 bg-white/20 rounded-full">
                          {(option as any).badge}
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-white/80">{option.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
