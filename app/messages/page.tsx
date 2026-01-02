"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { motion } from "framer-motion"
import { Send, Search, MoreVertical } from "lucide-react"
import FloatingParticles from "@/components/floating-particles"
import { supabase } from "@/lib/supabase"

interface Message {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  is_read: boolean
  created_at: string
}

interface Conversation {
  userId: string
  userName: string
  userAvatar: string | null
  lastMessage: string
  lastMessageTime: string
  unreadCount: number
}

export default function MessagesPage() {
  const { data: session } = useSession()
  const userId = session?.user?.id

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (userId) {
      loadConversations()
    }
  }, [userId])

  useEffect(() => {
    if (selectedUser) {
      loadMessages(selectedUser)
      // Auto scroll to bottom
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [selectedUser, messages.length])

  const loadConversations = async () => {
    if (!userId) return

    setLoading(true)
    try {
      // Tüm mesajları çek
      const { data: messagesData, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Konuşmaları grupla
      const conversationsMap = new Map<string, Conversation>()

      for (const msg of messagesData || []) {
        const otherUserId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id
        
        if (!conversationsMap.has(otherUserId)) {
          // User bilgisini çek
          const { data: userData } = await supabase
            .from('users')
            .select('id, name, avatar_url')
            .eq('id', otherUserId)
            .single()

          // Okunmamış mesaj sayısı
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('sender_id', otherUserId)
            .eq('receiver_id', userId)
            .eq('is_read', false)

          conversationsMap.set(otherUserId, {
            userId: otherUserId,
            userName: userData?.name || 'Bilinmeyen',
            userAvatar: userData?.avatar_url || null,
            lastMessage: msg.content,
            lastMessageTime: msg.created_at,
            unreadCount: count || 0
          })
        }
      }

      setConversations(Array.from(conversationsMap.values()))
      console.log('✅ Conversations loaded:', conversationsMap.size)
    } catch (error) {
      console.error('Load conversations error:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = async (otherUserId: string) => {
    if (!userId) return

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`)
        .order('created_at', { ascending: true })

      if (error) throw error

      setMessages(data || [])

      // Okunmamışları okundu işaretle
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('sender_id', otherUserId)
        .eq('receiver_id', userId)
        .eq('is_read', false)

      console.log('✅ Messages loaded:', data?.length || 0)
    } catch (error) {
      console.error('Load messages error:', error)
    }
  }

  const sendMessage = async () => {
    if (!userId || !selectedUser || !newMessage.trim()) return

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: userId,
          receiver_id: selectedUser,
          content: newMessage,
          is_read: false
        })

      if (error) throw error

      setNewMessage("")
      loadMessages(selectedUser)
      loadConversations()
    } catch (error) {
      console.error('Send message error:', error)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 rounded-full border-2 border-primary border-t-transparent"
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <FloatingParticles />

      <section className="relative py-8 px-4">
        <div className="container mx-auto max-w-6xl">
          <h1 className="font-serif text-4xl font-bold mb-8">Mesajlar</h1>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* CONVERSATIONS LIST */}
            <div className="md:col-span-1 glass border border-border rounded-2xl overflow-hidden h-[600px] flex flex-col">
              <div className="p-4 border-b border-border">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Ara..."
                    className="w-full pl-10 pr-4 py-2 glass border border-border rounded-xl outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {conversations.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="text-6xl mb-4">💬</div>
                    <p className="text-muted-foreground">Henüz mesaj yok</p>
                  </div>
                ) : (
                  conversations.map((conv) => (
                    <button
                      key={conv.userId}
                      onClick={() => setSelectedUser(conv.userId)}
                      className={`w-full p-4 flex items-center gap-3 hover:bg-secondary transition-colors border-b border-border ${
                        selectedUser === conv.userId ? 'bg-primary/10' : ''
                      }`}
                    >
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-primary flex-shrink-0">
                        {conv.userAvatar ? (
                          <img src={conv.userAvatar} alt={conv.userName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white font-bold">
                            {conv.userName[0]?.toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-bold truncate">{conv.userName}</p>
                          {conv.unreadCount > 0 && (
                            <span className="w-5 h-5 rounded-full bg-primary text-white text-xs flex items-center justify-center flex-shrink-0">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{conv.lastMessage}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* CHAT AREA */}
            <div className="md:col-span-2 glass border border-border rounded-2xl overflow-hidden h-[600px] flex flex-col">
              {selectedUser ? (
                <>
                  {/* CHAT HEADER */}
                  <div className="p-4 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-primary">
                        {conversations.find(c => c.userId === selectedUser)?.userAvatar ? (
                          <img src={conversations.find(c => c.userId === selectedUser)?.userAvatar || ''} alt="User" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white font-bold">
                            {conversations.find(c => c.userId === selectedUser)?.userName[0]?.toUpperCase()}
                          </div>
                        )}
                      </div>
                      <p className="font-bold">{conversations.find(c => c.userId === selectedUser)?.userName}</p>
                    </div>
                    <button className="p-2 hover:bg-secondary rounded-lg transition-colors">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </div>

                  {/* MESSAGES */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((msg) => {
                      const isMe = msg.sender_id === userId
                      return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                            isMe ? 'bg-primary text-primary-foreground' : 'glass border border-border'
                          }`}>
                            <p className="text-sm">{msg.content}</p>
                            <p className={`text-xs mt-1 ${isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                              {new Date(msg.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* MESSAGE INPUT */}
                  <div className="p-4 border-t border-border">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Mesaj yaz..."
                        className="flex-1 px-4 py-2 glass border border-border rounded-xl outline-none focus:border-primary"
                      />
                      <button
                        onClick={sendMessage}
                        disabled={!newMessage.trim()}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-9xl mb-4">💬</div>
                    <h3 className="text-2xl font-bold mb-2">Mesajlarınız</h3>
                    <p className="text-muted-foreground">Bir konuşma seçin</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}