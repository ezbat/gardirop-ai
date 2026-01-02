"use client"

import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { ArrowLeft, Send, MoreVertical, Image as ImageIcon, Heart, Info } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import MessageBubble from "@/components/message-bubble"
import {
  getMessages,
  sendMessage,
  markMessagesAsRead,
  generateId,
  type Message,
  type User
} from "@/lib/storage"

interface ChatWindowProps {
  currentUserId: string
  currentUserName: string
  currentUserAvatar: string
  otherUser: User
  onBack: () => void
}

export default function ChatWindow({
  currentUserId,
  currentUserName,
  currentUserAvatar,
  otherUser,
  onBack
}: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadMessages()
    // Mesajları okundu olarak işaretle
    markMessagesAsRead(currentUserId, otherUser.id)
  }, [otherUser.id])

  useEffect(() => {
    // Yeni mesaj geldiğinde scroll to bottom
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const loadMessages = async () => {
    setLoading(true)
    try {
      const msgs = await getMessages(currentUserId, otherUser.id)
      setMessages(msgs)
    } catch (error) {
      console.error("Failed to load messages:", error)
    }
    setLoading(false)
  }

  const handleSend = async () => {
    if (!newMessage.trim()) return

    const message: Message = {
      id: generateId(),
      senderId: currentUserId,
      senderName: currentUserName,
      senderAvatar: currentUserAvatar,
      receiverId: otherUser.id,
      content: newMessage.trim(),
      createdAt: Date.now(),
      read: false
    }

    try {
      await sendMessage(message)
      setMessages([...messages, message])
      setNewMessage("")
    } catch (error) {
      console.error("Failed to send message:", error)
      alert("Mesaj gönderilemedi")
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border glass sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-secondary/50 rounded-full transition-colors md:hidden"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <Avatar className="w-10 h-10 border-2 border-primary/20">
            <AvatarImage src={otherUser.avatar} alt={otherUser.name} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {otherUser.name[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div>
            <h3 className="font-semibold">{otherUser.name}</h3>
            <p className="text-xs text-muted-foreground">
              {otherUser.username || "Aktif"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-secondary/50 rounded-full transition-colors">
            <Info className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent"
            />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-6xl mb-4">💬</div>
            <h3 className="text-lg font-semibold mb-2">Henüz mesaj yok</h3>
            <p className="text-sm text-muted-foreground">
              {otherUser.name} ile ilk mesajını gönder!
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                content={msg.content}
                timestamp={msg.createdAt}
                isSent={msg.senderId === currentUserId}
                isRead={msg.read}
                senderAvatar={msg.senderId === currentUserId ? currentUserAvatar : otherUser.avatar}
                senderName={msg.senderId === currentUserId ? currentUserName : otherUser.name}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-border glass">
        <div className="flex items-end gap-2">
          <button className="p-2 hover:bg-secondary/50 rounded-full transition-colors">
            <ImageIcon className="w-5 h-5 text-muted-foreground" />
          </button>

          <div className="flex-1 relative">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Mesaj yaz..."
              rows={1}
              className="w-full px-4 py-3 glass border border-border rounded-2xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none max-h-32"
            />
          </div>

          <button className="p-2 hover:bg-secondary/50 rounded-full transition-colors">
            <Heart className="w-5 h-5 text-muted-foreground" />
          </button>

          <button
            onClick={handleSend}
            disabled={!newMessage.trim()}
            className="p-3 bg-primary text-primary-foreground rounded-full hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}