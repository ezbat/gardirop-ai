"use client"

import { Suspense } from "react"
import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { useSearchParams, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Send, Search, ArrowLeft, Loader2, MessageCircle, Image as ImageIcon, Smile, MoreVertical, Check, CheckCheck } from "lucide-react"
import FloatingParticles from "@/components/floating-particles"
import { supabase } from "@/lib/supabase"
import { useLanguage } from "@/lib/language-context"

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
  const { t } = useLanguage()
  const searchParams = useSearchParams()
  const router = useRouter()
  const userId = session?.user?.id
  const toUserId = searchParams.get('to')

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [showMobileList, setShowMobileList] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const processedToUserRef = useRef<string | null>(null)

  useEffect(() => {
    if (userId) {
      loadConversations()
    }
  }, [userId])

  useEffect(() => {
    if (toUserId && !loading && processedToUserRef.current !== toUserId) {
      processedToUserRef.current = toUserId
      handleNewConversation(toUserId)
    }
  }, [toUserId, loading])

  useEffect(() => {
    if (selectedUser) {
      loadMessages(selectedUser)
      setShowMobileList(false)
    }
  }, [selectedUser])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length])

  const handleNewConversation = async (otherUserId: string) => {
    try {
      const existing = conversations.find(c => c.userId === otherUserId)

      if (!existing) {
        const { data: userData, error } = await supabase
          .from('users')
          .select('id, name, username, avatar_url')
          .eq('id', otherUserId)
          .single()

        if (error) {
          console.error('User fetch error:', error)
          alert(t('userNotFound') || 'Kullanıcı bulunamadı!')
          return
        }

        if (userData) {
          const newConv: Conversation = {
            userId: userData.id,
            userName: userData.name || userData.username || 'User',
            userAvatar: userData.avatar_url,
            lastMessage: t('newChat') || 'Yeni sohbet',
            lastMessageTime: new Date().toISOString(),
            unreadCount: 0
          }
          setConversations(prev => {
            if (prev.find(c => c.userId === otherUserId)) {
              return prev
            }
            return [newConv, ...prev]
          })
        }
      }

      setSelectedUser(otherUserId)
    } catch (error) {
      console.error('Handle new conversation error:', error)
      alert(t('chatOpenError') || 'Sohbet açılamadı!')
    }
  }

  const loadConversations = async () => {
    if (!userId) return

    setLoading(true)
    try {
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
            userName: userData?.name || userData?.username || 'User',
            userAvatar: userData?.avatar_url || null,
            lastMessage: msg.content,
            lastMessageTime: msg.created_at,
            unreadCount: count || 0
          })
        }
      }

      const convArray = Array.from(conversationsMap.values())
      setConversations(convArray)
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

      // Mark as read
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('sender_id', otherUserId)
        .eq('receiver_id', userId)
        .eq('is_read', false)

      // Update conversation unread count
      setConversations(prev =>
        prev.map(c => c.userId === otherUserId ? { ...c, unreadCount: 0 } : c)
      )
    } catch (error) {
      console.error('Load messages error:', error)
    }
  }

  const sendMessage = async () => {
    if (!userId || !selectedUser || !newMessage.trim()) return

    setSending(true)
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: userId,
          receiver_id: selectedUser,
          content: newMessage.trim(),
          is_read: false
        })

      if (error) throw error

      setNewMessage("")
      await loadMessages(selectedUser)
      await loadConversations()
    } catch (error) {
      console.error('Send message error:', error)
      alert(t('messageSendError') || 'Mesaj gönderilemedi!')
    } finally {
      setSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const filteredConversations = conversations.filter(c =>
    c.userName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const selectedConversation = conversations.find(c => c.userId === selectedUser)

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <FloatingParticles />
        <div className="text-center glass border border-border rounded-2xl p-8">
          <MessageCircle className="w-16 h-16 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">{t('loginRequired') || 'Giriş Yapmalısınız'}</h2>
          <p className="text-muted-foreground mb-6">{t('loginToMessage') || 'Mesajlaşmak için giriş yapın'}</p>
          <a href="/auth/signin" className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold inline-block hover:opacity-90 transition-opacity">
            {t('login') || 'Giriş Yap'}
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <FloatingParticles />

      <section className="relative py-4 md:py-8 px-2 md:px-4">
        <div className="container mx-auto max-w-7xl">

          {/* Header with Back Button */}
          <div className="mb-4 md:mb-6 flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">{t('back') || 'Geri'}</span>
            </button>
            <h1 className="text-2xl md:text-3xl font-bold">{t('messages') || 'Mesajlar'}</h1>
          </div>

          {/* Messages Container */}
          <div className="glass border border-border rounded-2xl overflow-hidden" style={{ height: 'calc(100vh - 180px)', minHeight: '500px' }}>
            <div className="grid grid-cols-1 lg:grid-cols-12 h-full">

              {/* Conversations List */}
              <div className={`${showMobileList ? 'block' : 'hidden'} lg:block lg:col-span-4 xl:col-span-3 border-r border-border h-full flex flex-col`}>
                {/* Search Header */}
                <div className="p-3 md:p-4 border-b border-border flex-shrink-0">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t('searchConversations') || 'Sohbet ara...'}
                      className="w-full pl-10 pr-4 py-2.5 glass border border-border rounded-xl outline-none focus:border-primary text-sm transition-colors"
                    />
                  </div>
                </div>

                {/* Conversations */}
                <div className="overflow-y-auto flex-1">
                  {loading ? (
                    <div className="flex justify-center items-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  ) : filteredConversations.length === 0 ? (
                    <div className="text-center py-12 px-4">
                      <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">
                        {searchQuery ? (t('noConversationsFound') || 'Sohbet bulunamadı') : (t('noMessages') || 'Henüz mesaj yok')}
                      </p>
                      {toUserId && !searchQuery && (
                        <p className="text-xs text-muted-foreground mt-2">{t('startingChat') || 'Yeni sohbet başlatılıyor...'}</p>
                      )}
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {filteredConversations.map(conv => (
                        <motion.button
                          key={conv.userId}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          onClick={() => setSelectedUser(conv.userId)}
                          className={`w-full p-3 md:p-4 hover:bg-primary/5 transition-colors text-left relative ${
                            selectedUser === conv.userId ? 'bg-primary/10 border-l-4 border-l-primary' : ''
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {/* Avatar */}
                            <div className="relative flex-shrink-0">
                              <div className="w-11 h-11 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center overflow-hidden">
                                {conv.userAvatar ? (
                                  <img src={conv.userAvatar} alt={conv.userName} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-lg text-white font-bold">{conv.userName.charAt(0).toUpperCase()}</span>
                                )}
                              </div>
                              {/* Online indicator */}
                              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background"></div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <p className="font-semibold truncate text-sm md:text-base">{conv.userName}</p>
                                <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                                  {new Date(conv.lastMessageTime).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs md:text-sm text-muted-foreground truncate flex-1">{conv.lastMessage}</p>
                                {conv.unreadCount > 0 && (
                                  <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                                    {conv.unreadCount}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Chat Area */}
              <div className={`${showMobileList ? 'hidden' : 'block'} lg:block lg:col-span-8 xl:col-span-9 flex flex-col h-full`}>
                {selectedUser && selectedConversation ? (
                  <>
                    {/* Chat Header */}
                    <div className="p-3 md:p-4 border-b border-border flex items-center justify-between flex-shrink-0">
                      <div className="flex items-center gap-3">
                        {/* Mobile back button */}
                        <button
                          onClick={() => setShowMobileList(true)}
                          className="lg:hidden p-2 hover:bg-primary/5 rounded-full transition-colors"
                        >
                          <ArrowLeft className="w-5 h-5" />
                        </button>

                        <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {selectedConversation.userAvatar ? (
                            <img src={selectedConversation.userAvatar} alt={selectedConversation.userName} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-white font-bold">{selectedConversation.userName.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm md:text-base truncate">{selectedConversation.userName}</p>
                          <p className="text-xs text-green-500 flex items-center gap-1">
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            {t('online') || 'Çevrimiçi'}
                          </p>
                        </div>
                      </div>
                      <button className="p-2 hover:bg-primary/5 rounded-full transition-colors">
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3">
                      {messages.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-center py-8">
                          <div>
                            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                              <MessageCircle className="w-8 h-8 md:w-10 md:h-10 text-primary" />
                            </div>
                            <p className="text-muted-foreground text-sm md:text-base">{t('noMessagesYet') || 'Henüz mesaj yok'}</p>
                            <p className="text-xs text-muted-foreground mt-2">{t('sendFirstMessage') || 'İlk mesajı gönderin!'}</p>
                          </div>
                        </div>
                      ) : (
                        <>
                          {messages.map((msg, index) => {
                            const isOwn = msg.sender_id === userId
                            const showDate = index === 0 ||
                              new Date(messages[index - 1].created_at).toDateString() !== new Date(msg.created_at).toDateString()

                            return (
                              <div key={msg.id}>
                                {/* Date separator */}
                                {showDate && (
                                  <div className="flex items-center justify-center my-4">
                                    <span className="px-3 py-1 glass text-xs text-muted-foreground rounded-full">
                                      {new Date(msg.created_at).toLocaleDateString('de-DE', {
                                        weekday: 'short',
                                        day: 'numeric',
                                        month: 'short'
                                      })}
                                    </span>
                                  </div>
                                )}

                                <motion.div
                                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                                >
                                  <div className={`max-w-[85%] md:max-w-[70%] ${isOwn ? 'order-2' : 'order-1'}`}>
                                    <div className={`px-3 md:px-4 py-2 md:py-2.5 rounded-2xl ${
                                      isOwn
                                        ? 'bg-gradient-to-br from-primary to-purple-500 text-white rounded-br-md'
                                        : 'glass border border-border rounded-bl-md'
                                    }`}>
                                      <p className="break-words text-sm md:text-base leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                    </div>
                                    <div className={`flex items-center gap-1 mt-1 px-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                                      <span className={`text-xs ${isOwn ? 'text-primary/70' : 'text-muted-foreground'}`}>
                                        {new Date(msg.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                      {isOwn && (
                                        msg.is_read ?
                                          <CheckCheck className="w-3 h-3 text-primary" /> :
                                          <Check className="w-3 h-3 text-muted-foreground" />
                                      )}
                                    </div>
                                  </div>
                                </motion.div>
                              </div>
                            )
                          })}
                          <div ref={messagesEndRef} />
                        </>
                      )}
                    </div>

                    {/* Message Input */}
                    <div className="p-3 md:p-4 border-t border-border flex-shrink-0">
                      <div className="flex items-end gap-2">
                        <div className="flex-1 relative">
                          <textarea
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder={t('typeMessage') || 'Mesajınızı yazın...'}
                            rows={1}
                            className="w-full px-3 md:px-4 py-2.5 md:py-3 glass border border-border rounded-xl outline-none focus:border-primary resize-none text-sm md:text-base"
                            style={{ minHeight: '44px', maxHeight: '120px' }}
                            onInput={(e) => {
                              const target = e.target as HTMLTextAreaElement
                              target.style.height = 'auto'
                              target.style.height = Math.min(target.scrollHeight, 120) + 'px'
                            }}
                          />
                        </div>
                        <button
                          onClick={sendMessage}
                          disabled={!newMessage.trim() || sending}
                          className="p-3 bg-gradient-to-br from-primary to-purple-500 text-white rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center flex-shrink-0"
                          style={{ minWidth: '44px', minHeight: '44px' }}
                        >
                          {sending ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <Send className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center p-4">
                    <div className="text-center max-w-sm">
                      <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                        <MessageCircle className="w-10 h-10 md:w-12 md:h-12 text-primary" />
                      </div>
                      <h3 className="text-xl md:text-2xl font-bold mb-3">{t('yourMessages') || 'Mesajlarınız'}</h3>
                      <p className="text-sm md:text-base text-muted-foreground">
                        {loading ? (t('loading') || 'Yükleniyor...') : (t('selectChat') || 'Bir sohbet seçin veya yeni konuşma başlatın')}
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
