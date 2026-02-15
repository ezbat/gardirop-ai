"use client"

import { motion } from "framer-motion"
import { Bell } from "lucide-react"

interface NotificationIconProps {
  hasNotifications?: boolean
  count?: number
  size?: number
  onClick?: () => void
}

export default function NotificationIcon({
  hasNotifications = false,
  count = 0,
  size = 24,
  onClick
}: NotificationIconProps) {
  return (
    <button
      onClick={onClick}
      className="relative p-2 rounded-xl hover:bg-secondary/50 transition-colors"
    >
      {/* Glow effect when active */}
      {hasNotifications && (
        <motion.div
          className="absolute inset-0 rounded-xl"
          initial={{ opacity: 0 }}
          animate={{
            opacity: [0.3, 0.6, 0.3],
            scale: [1, 1.1, 1]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          style={{
            background: "radial-gradient(circle, rgba(var(--primary-rgb), 0.2) 0%, transparent 70%)",
            filter: "blur(8px)"
          }}
        />
      )}

      {/* Icon container */}
      <div className="relative">
        {/* Inactive state - thin outline */}
        {!hasNotifications && (
          <Bell
            className="text-muted-foreground transition-colors"
            size={size}
            strokeWidth={1.5}
          />
        )}

        {/* Active state - filled with glow */}
        {hasNotifications && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              type: "spring",
              stiffness: 200,
              damping: 10
            }}
          >
            <motion.div
              animate={{
                filter: [
                  "drop-shadow(0 0 2px rgba(var(--primary-rgb), 0.5))",
                  "drop-shadow(0 0 4px rgba(var(--primary-rgb), 0.8))",
                  "drop-shadow(0 0 2px rgba(var(--primary-rgb), 0.5))"
                ]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <Bell
                className="text-primary"
                size={size}
                strokeWidth={2}
                fill="currentColor"
              />
            </motion.div>
          </motion.div>
        )}

        {/* Notification count badge */}
        {count > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center"
          >
            <motion.span
              className="text-[10px] font-bold text-white px-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              {count > 99 ? "99+" : count}
            </motion.span>
          </motion.div>
        )}
      </div>
    </button>
  )
}
