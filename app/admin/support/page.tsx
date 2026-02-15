"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { MessageCircle, Loader2, Clock, CheckCircle, Send } from "lucide-react"
import FloatingParticles from "@/components/floating-particles"

interface Message {
  id: string
  subject: string
  message: string
  status: 'pending' | 'in_progress' | 'resolved' | 'closed'
  admin_reply: string | null
  created_at: string
  updated_at: string
  seller: {
    id: string
    shop_name: string
    phone: string
  }
}

export default function AdminSupportPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [userId, setUserId] = useState<string>('')

  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState<Message[]>([])
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [replyText, setReplyText] = useState('')
  const [replying, setReplying] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    // Always use m3000 as admin user for now to avoid localStorage tracking prevention issues
    setUserId('m3000')
    loadMessages('m3000')
  }, [])

  const loadMessages = async (adminId?: string) => {
    const id = adminId || userId
    if (!id) return

    try {
      const response = await fetch('/api/admin/support/messages', {
        headers: { 'x-user-id': id }
      })
      const data = await response.json()

      if (response.ok) {
        setMessages(data.messages || [])
      }
    } catch (error) {
      console.error('Load messages error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleReply = async (messageId: string, newStatus: string) => {
    if (!replyText.trim()) {
      alert('Lütfen bir yanıt yazın!')
      return
    }

    setReplying(true)
    try {
      const response = await fetch('/api/admin/support/messages', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId!
        },
        body: JSON.stringify({
          messageId,
          adminReply: replyText,
          status: newStatus
        })
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.error || 'Yanıt gönderilemedi!')
        return
      }

      alert('✅ Yanıt gönderildi!')
      setReplyText('')
      setSelectedMessage(null)
      loadMessages()
    } catch (error) {
      console.error('Reply error:', error)
      alert('Yanıt gönderilemedi!')
    } finally {
      setReplying(false)
    }
  }

  const filteredMessages = messages.filter(msg => {
    if (statusFilter === 'all') return true
    return msg.status === statusFilter
  })

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
      <section className="relative py-8 px-4">
        <div className="container mx-auto max-w-6xl">
          {/* Header */}
          <div className="text-center mb-8">
            <MessageCircle className="w-16 h-16 text-primary mx-auto mb-4" />
            <h1 className="font-serif text-4xl font-bold mb-2">Satıcı Destek Merkezi</h1>
            <p className="text-muted-foreground">Satıcı mesajlarını yönetin</p>
          </div>

          {/* Filters */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {[
              { value: 'all', label: 'Tümü' },
              { value: 'pending', label: 'Bekleyen' },
              { value: 'in_progress', label: 'İşlemde' },
              { value: 'resolved', label: 'Çözüldü' },
              { value: 'closed', label: 'Kapatıldı' }
            ].map(filter => (
              <button
                key={filter.value}
                onClick={() => setStatusFilter(filter.value)}
                className={`px-4 py-2 rounded-xl font-semibold text-sm whitespace-nowrap transition-colors ${
                  statusFilter === filter.value
                    ? 'bg-primary text-primary-foreground'
                    : 'glass border border-border hover:border-primary'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {/* Messages Grid */}
          {filteredMessages.length === 0 ? (
            <div className="text-center py-20 glass border border-border rounded-2xl">
              <MessageCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-3">Mesaj Yok</h3>
              <p className="text-muted-foreground">Bu filtrede mesaj bulunmuyor</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredMessages.map((msg) => (
                <div key={msg.id} className="glass border border-border rounded-2xl p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-lg">{msg.subject}</h3>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          msg.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' :
                          msg.status === 'in_progress' ? 'bg-blue-500/20 text-blue-500' :
                          msg.status === 'resolved' ? 'bg-green-500/20 text-green-500' :
                          'bg-gray-500/20 text-gray-500'
                        }`}>
                          {msg.status === 'pending' ? 'Bekliyor' :
                           msg.status === 'in_progress' ? 'İşlemde' :
                           msg.status === 'resolved' ? 'Çözüldü' : 'Kapatıldı'}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Satıcı: <span className="font-semibold">{msg.seller.shop_name}</span> •
                        Tel: {msg.seller.phone}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(msg.created_at).toLocaleDateString('tr-TR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Message */}
                  <div className="glass border border-border rounded-xl p-4 mb-4">
                    <p className="text-sm font-semibold mb-2">Mesaj:</p>
                    <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                  </div>

                  {/* Admin Reply */}
                  {msg.admin_reply ? (
                    <div className="glass border border-green-500/50 rounded-xl p-4 bg-green-500/5 mb-4">
                      <p className="text-sm font-semibold text-green-500 mb-2">Yanıtınız:</p>
                      <p className="text-sm whitespace-pre-wrap">{msg.admin_reply}</p>
                    </div>
                  ) : selectedMessage?.id === msg.id ? (
                    <div className="space-y-3">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Yanıtınızı yazın..."
                        rows={4}
                        className="w-full px-4 py-2 glass border border-border rounded-xl outline-none focus:border-primary resize-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReply(msg.id, 'resolved')}
                          disabled={replying}
                          className="flex-1 px-4 py-2 bg-green-500 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {replying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                          Yanıtla & Çöz
                        </button>
                        <button
                          onClick={() => handleReply(msg.id, 'in_progress')}
                          disabled={replying}
                          className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {replying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          Yanıtla & İşlemde
                        </button>
                        <button
                          onClick={() => setSelectedMessage(null)}
                          className="px-4 py-2 glass border border-border rounded-xl font-semibold hover:border-primary transition-colors"
                        >
                          İptal
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setSelectedMessage(msg)}
                      className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      Yanıtla
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
