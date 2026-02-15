"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { useParams, useRouter } from "next/navigation"
import { Send, ArrowLeft, Loader2, Image as ImageIcon, Package } from "lucide-react"
import FloatingParticles from "@/components/floating-particles"
import Link from "next/link"

interface Message {
  id: string
  sender_id: string
  sender_type: 'customer' | 'seller'
  message: string
  is_read: boolean
  created_at: string
}

interface QuickQuestion {
  id: string
  question_text: string
  category: string
}

export default function ChatPage() {
  const { data: session } = useSession()
  const params = useParams()
  const router = useRouter()
  const conversationId = params.id as string
  const userId = session?.user?.id

  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [quickQuestions, setQuickQuestions] = useState<QuickQuestion[]>([])
  const [showQuickQuestions, setShowQuickQuestions] = useState(true)
  const [conversationInfo, setConversationInfo] = useState<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (userId && conversationId) {
      loadConversation()
      loadMessages()
      loadQuickQuestions()
    }
  }, [userId, conversationId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Auto-refresh messages every 3 seconds
  useEffect(() => {
    if (!userId || !conversationId) return

    const interval = setInterval(() => {
      loadMessages()
    }, 3000)

    return () => clearInterval(interval)
  }, [userId, conversationId])

  const loadConversation = async () => {
    try {
      const res = await fetch(`/api/conversations`)
      const data = await res.json()

      const conv = data.conversations?.find((c: any) => c.id === conversationId)
      if (conv) {
        setConversationInfo(conv)
      }
    } catch (error) {
      console.error('Load conversation error:', error)
    }
  }

  const loadMessages = async () => {
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`)
      if (!res.ok) {
        throw new Error('Failed to load messages')
      }

      const data = await res.json()
      setMessages(data.messages || [])
    } catch (error) {
      console.error('Load messages error:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadQuickQuestions = async () => {
    try {
      const res = await fetch('/api/quick-questions')
      const data = await res.json()
      setQuickQuestions(data.questions || [])
    } catch (error) {
      console.error('Load quick questions error:', error)
    }
  }

  const sendMessage = async (messageText?: string) => {
    const textToSend = messageText || newMessage

    if (!textToSend.trim()) return

    setSending(true)
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: textToSend })
      })

      if (!res.ok) {
        throw new Error('Failed to send message')
      }

      setNewMessage("")
      setShowQuickQuestions(false)
      await loadMessages()
    } catch (error) {
      console.error('Send message error:', error)
      alert('Mesaj gönderilemedi!')
    } finally {
      setSending(false)
    }
  }

  const handleQuickQuestion = (question: string) => {
    setNewMessage(question)
    setShowQuickQuestions(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <FloatingParticles />

      <div className="relative h-screen flex flex-col">
        {/* Header */}
        <div className="glass border-b border-border p-4">
          <div className="container mx-auto max-w-4xl flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="flex-1">
              <h1 className="font-bold text-lg">
                {conversationInfo?.seller?.shop_name || conversationInfo?.customer?.name || 'Mesajlar'}
              </h1>
              {conversationInfo?.product && (
                <Link
                  href={`/store/${conversationInfo.product.id}`}
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  <Package className="w-3 h-3" />
                  {conversationInfo.product.title}
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="container mx-auto max-w-4xl space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Henüz mesaj yok. Sohbete başlayın!</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMine = msg.sender_id === userId

                return (
                  <div
                    key={msg.id}
                    className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] px-4 py-3 rounded-2xl ${
                        isMine
                          ? 'bg-primary text-primary-foreground'
                          : 'glass border border-border'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                      <p className={`text-xs mt-1 ${isMine ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        {new Date(msg.created_at).toLocaleTimeString('tr-TR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Quick Questions */}
        {showQuickQuestions && quickQuestions.length > 0 && messages.length === 0 && (
          <div className="border-t border-border p-4 glass">
            <div className="container mx-auto max-w-4xl">
              <p className="text-sm text-muted-foreground mb-3">Hızlı sorular:</p>
              <div className="flex flex-wrap gap-2">
                {quickQuestions.slice(0, 6).map((q) => (
                  <button
                    key={q.id}
                    onClick={() => handleQuickQuestion(q.question_text)}
                    className="px-3 py-2 text-sm glass border border-border rounded-xl hover:border-primary transition-colors"
                  >
                    {q.question_text}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Input */}
        <div className="glass border-t border-border p-4">
          <div className="container mx-auto max-w-4xl">
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !sending && sendMessage()}
                placeholder="Mesajınızı yazın..."
                className="flex-1 px-4 py-3 glass border border-border rounded-xl outline-none focus:border-primary"
              />
              <button
                onClick={() => sendMessage()}
                disabled={sending || !newMessage.trim()}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
              >
                {sending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
