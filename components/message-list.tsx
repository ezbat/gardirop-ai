"use client"

import { motion } from "framer-motion"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { Conversation, User } from "@/lib/storage"

interface MessageListProps {
  conversations: Conversation[]
  users: User[]
  currentUserId: string
  selectedUserId: string | null
  onSelectUser: (userId: string) => void
}

export default function MessageList({
  conversations,
  users,
  currentUserId,
  selectedUserId,
  onSelectUser
}: MessageListProps) {
  const getOtherUserId = (conversation: Conversation) => {
    return conversation.participants.find(id => id !== currentUserId) || ""
  }

  const getUserById = (userId: string) => {
    return users.find(u => u.id === userId)
  }

  const getUnreadCount = (conversation: Conversation) => {
    return conversation.unreadCount[currentUserId] || 0
  }

  const formatTime = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return "az önce"
    if (minutes < 60) return `${minutes}d önce`
    if (hours < 24) return `${hours}s önce`
    return `${days}g önce`
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6">
        <div className="text-6xl mb-4">💬</div>
        <h3 className="text-lg font-semibold mb-2">Henüz mesajın yok</h3>
        <p className="text-sm text-muted-foreground">
          Birisiyle sohbet başlat!
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-y-auto">
      {conversations.map((conversation) => {
        const otherUserId = getOtherUserId(conversation)
        const otherUser = getUserById(otherUserId)
        const unreadCount = getUnreadCount(conversation)
        const isSelected = selectedUserId === otherUserId

        if (!otherUser) return null

        return (
          <motion.button
            key={conversation.id}
            onClick={() => onSelectUser(otherUserId)}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className={`w-full flex items-center gap-3 p-4 border-b border-border hover:bg-secondary/50 transition-colors ${
              isSelected ? "bg-secondary/50" : ""
            }`}
          >
            {/* Avatar */}
            <div className="relative">
              <Avatar className="w-14 h-14 border-2 border-primary/20">
                <AvatarImage src={otherUser.avatar} alt={otherUser.name} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {otherUser.name[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {/* Online indicator */}
              <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-background rounded-full" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center justify-between mb-1">
                <h4 className={`font-semibold truncate ${unreadCount > 0 ? "text-foreground" : ""}`}>
                  {otherUser.name}
                </h4>
                <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                  {formatTime(conversation.lastMessageTime)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <p
                  className={`text-sm truncate ${
                    unreadCount > 0 ? "font-semibold text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {conversation.lastMessage}
                </p>
                {unreadCount > 0 && (
                  <span className="flex-shrink-0 ml-2 w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>
            </div>
          </motion.button>
        )
      })}
    </div>
  )
}