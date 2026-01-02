"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Check, CheckCheck } from "lucide-react"

interface MessageBubbleProps {
  content: string
  timestamp: number
  isSent: boolean
  isRead: boolean
  senderAvatar?: string
  senderName?: string
}

export default function MessageBubble({
  content,
  timestamp,
  isSent,
  isRead,
  senderAvatar,
  senderName
}: MessageBubbleProps) {
  const formatTime = (time: number) => {
    const date = new Date(time)
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
  }

  return (
    <div className={`flex gap-2 mb-4 ${isSent ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar (sadece alınan mesajlarda) */}
      {!isSent && (
        <Avatar className="w-8 h-8">
          <AvatarImage src={senderAvatar} alt={senderName} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs">
            {senderName?.[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}

      {/* Mesaj Baloncuğu */}
      <div className={`max-w-[70%] ${isSent ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div
          className={`px-4 py-2 rounded-2xl ${
            isSent
              ? 'bg-primary text-primary-foreground rounded-br-md'
              : 'glass border border-border rounded-bl-md'
          }`}
        >
          <p className="text-sm break-words">{content}</p>
        </div>

        {/* Zaman ve Okundu */}
        <div className="flex items-center gap-1 px-2">
          <span className="text-xs text-muted-foreground">{formatTime(timestamp)}</span>
          {isSent && (
            <span className="text-xs">
              {isRead ? (
                <CheckCheck className="w-3 h-3 text-blue-500" />
              ) : (
                <Check className="w-3 h-3 text-muted-foreground" />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}