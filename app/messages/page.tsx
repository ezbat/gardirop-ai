"use client"

import { Suspense } from "react"
import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { useSearchParams, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Send, Search, MoreVertical, Loader2, ArrowLeft } from "lucide-react"
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

function MessagesPageContent() {
  const { data: session } = useSession()
  const searchParams = useSearchParams()
  const router = useRouter()
  const userId = session?.user?.id
  const toUserId = searchParams.get('to')

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
    // toUserId varsa ve conversations yüklendiyse
    if (toUserId && !loading) {
      handleNewConversation(toUserId)
    }
  }, [toUserId, loading, conversations])

  useEffect(() => {
    if (selectedUser) {
      loadMessages(selectedUser)
    }
  }, [selectedUser])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length])

  const handleNewConversation = async (otherUserId: string) => {
    try {
      console.log('🔍 Opening conversation with:', otherUserId)
      
      // Önce mevcut conversation'ları kontrol et
      const existing = conversations.find(c => c.userId === otherUserId)
      
      if (!existing) {
        console.log('📝 Creating new conversation')
        // Kullanıcı bilgilerini al
        const { data: userData, error } = await supabase
          .from('users')
          .select('id, name, username, avatar_url')
          .eq('id', otherUserId)
          .single()

        if (error) {
          console.error('❌ User fetch error:', error)
          alert('Kullanıcı bulunamadı!')
          return
        }

        if (userData) {
          console.log('✅ User found:', userData.name)
          const newConv: Conversation = {
            userId: userData.id,
            userName: userData.username || userData.name,
            userAvatar: userData.avatar_url,
            lastMessage: 'Yeni sohbet',
            lastMessageTime: new Date().toISOString(),
            unreadCount: 0
          }
          setConversations(prev => [newConv, ...prev])
        }
      } else {
        console.log('✅ Existing conversation found')
      }
      
      // Kullanıcıyı seç
      setSelectedUser(otherUserId)
    } catch (error) {
      console.error('❌ Handle new conversation error:', error)
      alert('Sohbet açılamadı!')
    }
  }

  const loadConversations = async () => {
    if (!userId) return

    setLoading(true)
    try {
      console.log('📦 Loading conversations...')
      
      const { data: messagesData, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: false })

      if (error) throw error

      const conversationsMap = new Map<string, Conversation>()

      for (const msg of messagesData || []) {
        const otherUserId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id

        if (!conversationsMap.has(otherUserId)) {
          const { data: userData } = await supabase
            .from('users')
            .select('id, name, username, avatar_url')
            .eq('id', otherUserId)
            .single()

          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('sender_id', otherUserId)
            .eq('receiver_id', userId)
            .eq('is_read', false)

          conversationsMap.set(otherUserId, {
            userId: otherUserId,
            userName: userData?.username || userData?.name || 'Bilinmeyen',
            userAvatar: userData?.avatar_url || null,
            lastMessage: msg.content,
            lastMessageTime: msg.created_at,
            unreadCount: count || 0
          })
        }
      }

      const convArray = Array.from(conversationsMap.values())
      console.log('✅ Loaded conversations:', convArray.length)
      setConversations(convArray)
    } catch (error) {
      console.error('❌ Load conversations error:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = async (otherUserId: string) => {
    if (!userId) return

    try {
      console.log('📬 Loading messages with:', otherUserId)
      
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`)
        .order('created_at', { ascending: true })

      if (error) throw error

      console.log('✅ Loaded messages:', data?.length || 0)
      setMessages(data || [])

      // Okunmamış mesajları işaretle
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('sender_id', otherUserId)
        .eq('receiver_id', userId)
        .eq('is_read', false)
    } catch (error) {
      console.error('❌ Load messages error:', error)
    }
  }

  const sendMessage = async () => {
    if (!userId || !selectedUser || !newMessage.trim()) return

    try {
      console.log('📤 Sending message to:', selectedUser)
      
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: userId,
          receiver_id: selectedUser,
          content: newMessage.trim(),
          is_read: false
        })

      if (error) throw error

      console.log('✅ Message sent')
      setNewMessage("")
      await loadMessages(selectedUser)
      await loadConversations()
    } catch (error) {
      console.error('❌ Send message error:', error)
      alert('Mesaj gönderilemedi!')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const selectedConversation = conversations.find(c => c.userId === selectedUser)

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Giriş Yapmalısınız</h2>
          <a href="/api/auth/signin" className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold inline-block">Giriş Yap</a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <FloatingParticles />

      <section className="relative py-8 px-4">
        <div className="container mx-auto max-w-6xl">
          
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 mb-6 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Geri
          </button>

          <div className="glass border border-border rounded-2xl overflow-hidden" style={{ height: 'calc(100vh - 200px)' }}>
            <div className="grid grid-cols-12 h-full">
              
              {/* Conversations List */}
              <div className="col-span-12 md:col-span-4 border-r border-border">
                <div className="p-4 border-b border-border">
                  <h2 className="text-xl font-bold mb-4">Mesajlar</h2>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Ara..."
                      className="w-full pl-10 pr-4 py-2 glass border border-border rounded-xl outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="overflow-y-auto" style={{ height: 'calc(100% - 140px)' }}>
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  ) : conversations.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p className="text-sm">Henüz mesaj yok</p>
                      {toUserId && (
                        <p className="text-xs mt-2">Yeni sohbet başlatılıyor...</p>
                      )}
                    </div>
                  ) : (
                    conversations.map(conv => (
                      <button
                        key={conv.userId}
                        onClick={() => setSelectedUser(conv.userId)}
                        className={`w-full p-4 border-b border-border hover:bg-primary/5 transition-colors text-left ${
                          selectedUser === conv.userId ? 'bg-primary/10' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {conv.userAvatar ? (
                              <img src={conv.userAvatar} alt={conv.userName} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xl">👤</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <p className="font-semibold truncate">{conv.userName}</p>
                              {conv.unreadCount > 0 && (
                                <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-full">
                                  {conv.unreadCount}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">{conv.lastMessage}</p>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Chat Area */}
              <div className="col-span-12 md:col-span-8 flex flex-col">
                {selectedUser && selectedConversation ? (
                  <>
                    {/* Chat Header */}
                    <div className="p-4 border-b border-border flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                          {selectedConversation.userAvatar ? (
                            <img src={selectedConversation.userAvatar} alt={selectedConversation.userName} className="w-full h-full object-cover" />
                          ) : (
                            <span>👤</span>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold">{selectedConversation.userName}</p>
                          <p className="text-xs text-muted-foreground">Aktif</p>
                        </div>
                      </div>
                      <button className="p-2 hover:bg-primary/5 rounded-full">
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {messages.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <div className="text-6xl mb-4">💬</div>
                          <p>Henüz mesaj yok. İlk mesajı gönder!</p>
                        </div>
                      ) : (
                        messages.map(msg => (
                          <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex ${msg.sender_id === userId ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                              msg.sender_id === userId
                                ? 'bg-primary text-primary-foreground'
                                : 'glass border border-border'
                            }`}>
                              <p className="break-words">{msg.content}</p>
                              <p className={`text-xs mt-1 ${
                                msg.sender_id === userId ? 'text-primary-foreground/70' : 'text-muted-foreground'
                              }`}>
                                {new Date(msg.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </motion.div>
                        ))
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Message Input */}
                    <div className="p-4 border-t border-border">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyPress={handleKeyPress}
                          placeholder="Mesajınızı yazın..."
                          className="flex-1 px-4 py-3 glass border border-border rounded-xl outline-none focus:border-primary"
                        />
                        <button
                          onClick={sendMessage}
                          disabled={!newMessage.trim()}
                          className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-2"
                        >
                          <Send className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <div className="text-6xl mb-4">💬</div>
                      <p className="text-xl font-semibold mb-2">Mesajlarınız</p>
                      <p className="text-sm">
                        {loading ? 'Yükleniyor...' : 'Bir sohbet seçin veya yeni bir konuşma başlatın'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default function MessagesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    }>
      <MessagesPageContent />
    </Suspense>
  )
}
