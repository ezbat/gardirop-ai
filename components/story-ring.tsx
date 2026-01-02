"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { motion } from "framer-motion"
import { Plus } from "lucide-react"

interface StoryRingProps {
  userAvatar?: string
  userName?: string
  hasUnviewed?: boolean
  isOwn?: boolean
  onClick: () => void
}

export function StoryRing({ userAvatar, userName, hasUnviewed, isOwn, onClick }: StoryRingProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="flex flex-col items-center gap-1 min-w-fit"
    >
      {/* Ring */}
      <div className={`relative p-0.5 rounded-full ${
        hasUnviewed 
          ? "bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600" 
          : "bg-gray-300 dark:bg-gray-600"
      }`}>
        <div className="bg-background rounded-full p-0.5">
          <Avatar className="w-14 h-14 border-2 border-background">
            <AvatarImage src={userAvatar} alt={userName} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {userName?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
        
        {/* Plus Icon (Kendi story'n için) */}
        {isOwn && (
          <div className="absolute bottom-0 right-0 w-5 h-5 bg-primary rounded-full flex items-center justify-center border-2 border-background">
            <Plus className="w-3 h-3 text-primary-foreground" />
          </div>
        )}
      </div>
      
      {/* Name */}
      <span className="text-xs text-center line-clamp-1 max-w-[60px]">
        {isOwn ? "Senin" : userName}
      </span>
    </motion.button>
  )
}