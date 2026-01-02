"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { UserPlus, UserMinus, Check } from "lucide-react"
import { followUser, unfollowUser, isFollowing } from "@/lib/storage"

interface FollowButtonProps {
  currentUserId: string
  targetUserId: string
  variant?: "default" | "small"
}

export default function FollowButton({ currentUserId, targetUserId, variant = "default" }: FollowButtonProps) {
  const [following, setFollowing] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    checkFollowStatus()
  }, [currentUserId, targetUserId])

  const checkFollowStatus = async () => {
    const status = await isFollowing(currentUserId, targetUserId)
    setFollowing(status)
  }

  const handleFollow = async () => {
    setLoading(true)
    try {
      if (following) {
        await unfollowUser(currentUserId, targetUserId)
        setFollowing(false)
      } else {
        await followUser(currentUserId, targetUserId)
        setFollowing(true)
      }
    } catch (error) {
      console.error("Follow error:", error)
    }
    setLoading(false)
  }

  if (currentUserId === targetUserId) return null

  if (variant === "small") {
    return (
      <motion.button
        onClick={handleFollow}
        disabled={loading}
        whileTap={{ scale: 0.95 }}
        className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
          following
            ? "bg-secondary text-foreground hover:bg-secondary/80"
            : "bg-primary text-primary-foreground hover:opacity-90"
        }`}
      >
        {following ? "Takiptesin" : "Takip Et"}
      </motion.button>
    )
  }

  return (
    <motion.button
      onClick={handleFollow}
      disabled={loading}
      whileTap={{ scale: 0.95 }}
      className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold transition-colors ${
        following
          ? "bg-secondary text-foreground hover:bg-secondary/80"
          : "bg-primary text-primary-foreground hover:opacity-90"
      }`}
    >
      {loading ? (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-5 h-5 border-2 border-current border-t-transparent rounded-full"
        />
      ) : following ? (
        <>
          <Check className="w-5 h-5" />
          <span>Takiptesin</span>
        </>
      ) : (
        <>
          <UserPlus className="w-5 h-5" />
          <span>Takip Et</span>
        </>
      )}
    </motion.button>
  )
}