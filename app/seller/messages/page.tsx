"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { MessageCircle, Loader2, Package, ArrowLeft, Send, Clock } from "lucide-react"
import FloatingParticles from "@/components/floating-particles"
import Link from "next/link"

interface Conversation {
  id: string
  product_id: string | null
  last_message: string
  last_message_at: string
  seller_unread_count: number
  customer?: {
    id: string
    name: string
    username: string
    avatar_url: string | null
    email: string
  }
  product?: {
    id: string
    title: string
    images: string[]
  }
}

interface Message {
  id: string
  sender_type: 'customer' | 'seller'
  message: string
  created_at: string
  is_read: boolean
}

export default function SellerMessagesPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const userId = session?.user?.id

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (userId) {
      loadConversations()
    }
  }, [userId])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (selectedConversation) {
      loadMessages(selectedConversation.id)
      interval = setInterval(() => loadMessages(selectedConversation.id), 3000)
    }
    return () => clearInterval(interval)
  }, [selectedConversation])

  const loadConversations = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/conversations?type=seller`)
      const data = await res.json()

      if (res.ok) {
        setConversations(data.conversations || [])
      }
    } catch (error) {
      console.error('Load conversations error:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = async (conversationId: string) => {
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`)
      if (!res.ok) return

      const data = await res.json()
      setMessages(data.messages || [])

      // Refresh conversations to update unread count
      loadConversations()
    } catch (error) {
      console.error('Load messages error:', error)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return

    try {
      setSending(true)
      const res = await fetch(`/api/conversations/${selectedConversation.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newMessage.trim() })
      })

      if (res.ok) {
        setNewMessage("")
        loadMessages(selectedConversation.id)
      } else {
        alert('Mesaj gönderilemedi!')
      }
    } catch (error) {
      console.error('Send message error:', error)
      alert('Bir hata oluştu!')
    } finally {
      setSending(false)
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))

    if (hours < 24) {
      return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    } else {
      return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
    }
  }

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Giriş yapmalısınız</p>
          <Link
            href="/auth/signin"
            className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity inline-block"
          >
            Giriş Yap
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <FloatingParticles />

      <section className="relative py-8 px-4">
        <div className="container mx-auto max-w-7xl">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Link
              href="/seller/dashboard"
              className="p-2 hover:bg-primary/10 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div>
              <h1 className="font-serif text-3xl font-bold">Müşteri Mesajları</h1>
              <p className="text-muted-foreground">Müşterilerinizle iletişim kurun</p>
            </div>
          </div>

          {/* Main Content */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Conversations List */}
            <div className="glass border border-border rounded-2xl p-4 h-[calc(100vh-250px)] overflow-y-auto">
              <h2 className="font-bold mb-4 flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-primary" />
                Sohbetler
              </h2>

              {loading ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-12">
                  <MessageCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Henüz mesaj yok</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {conversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedConversation(conv)}
                      className={`w-full text-left p-3 rounded-xl transition-colors ${
                        selectedConversation?.id === conv.id
                          ? 'bg-primary/20 border border-primary'
                          : 'hover:bg-primary/5 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold truncate">
                          {conv.customer?.name || conv.customer?.email}
                        </h3>
                        <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                          {formatTime(conv.last_message_at)}
                        </span>
                      </div>

                      {conv.product && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                          <Package className="w-3 h-3" />
                          <span className="truncate">{conv.product.title}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground truncate flex-1">
                          {conv.last_message}
                        </p>
                        {conv.seller_unread_count > 0 && (
                          <span className="flex-shrink-0 ml-2 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                            {conv.seller_unread_count}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Chat Area */}
            <div className="lg:col-span-2 glass border border-border rounded-2xl flex flex-col h-[calc(100vh-250px)]">
              {selectedConversation ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b border-border">
                    <h2 className="font-bold">
                      {selectedConversation.customer?.name || selectedConversation.customer?.email}
                    </h2>
                    {selectedConversation.product && (
                      <Link
                        href={`/store/${selectedConversation.product.id}`}
                        className="text-sm text-primary hover:underline flex items-center gap-1 mt-1"
                      >
                        <Package className="w-3 h-3" />
                        {selectedConversation.product.title}
                      </Link>
                    )}
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sender_type === 'seller' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] p-3 rounded-2xl ${
                            msg.sender_type === 'seller'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-secondary'
                          }`}
                        >
                          <p className="break-words">{msg.message}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <Clock className="w-3 h-3 opacity-70" />
                            <span className="text-xs opacity-70">
                              {formatTime(msg.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Message Input */}
                  <div className="p-4 border-t border-border">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && !sending && sendMessage()}
                        placeholder="Mesajınızı yazın..."
                        className="flex-1 px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <button
                        onClick={sendMessage}
                        disabled={!newMessage.trim() || sending}
                        className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <MessageCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Bir sohbet seçin</p>
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
