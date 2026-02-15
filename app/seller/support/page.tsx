"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { MessageCircle, Send, Loader2, CheckCircle, Clock, XCircle } from "lucide-react"
import FloatingParticles from "@/components/floating-particles"

interface Message {
  id: string
  subject: string
  message: string
  status: 'pending' | 'in_progress' | 'resolved' | 'closed'
  admin_reply: string | null
  created_at: string
  updated_at: string
}

export default function SellerSupportPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const userId = session?.user?.id

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [showNewMessageForm, setShowNewMessageForm] = useState(false)

  const [formData, setFormData] = useState({
    subject: '',
    message: ''
  })

  useEffect(() => {
    if (userId) {
      loadMessages()
    }
  }, [userId])

  const loadMessages = async () => {
    try {
      const response = await fetch('/api/seller/support/messages', {
        headers: { 'x-user-id': userId! }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return

    setSubmitting(true)
    try {
      const response = await fetch('/api/seller/support/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.error || 'Mesaj gönderilemedi!')
        return
      }

      alert('✅ Mesajınız gönderildi! En kısa sürede yanıt vereceğiz.')
      setFormData({ subject: '', message: '' })
      setShowNewMessageForm(false)
      loadMessages()
    } catch (error) {
      console.error('Submit error:', error)
      alert('Mesaj gönderilemedi!')
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: { icon: Clock, text: 'Beklemede', color: 'bg-yellow-500/20 text-yellow-500' },
      in_progress: { icon: Loader2, text: 'İşlemde', color: 'bg-blue-500/20 text-blue-500' },
      resolved: { icon: CheckCircle, text: 'Çözüldü', color: 'bg-green-500/20 text-green-500' },
      closed: { icon: XCircle, text: 'Kapatıldı', color: 'bg-gray-500/20 text-gray-500' }
    }

    const badge = badges[status as keyof typeof badges] || badges.pending
    const Icon = badge.icon

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${badge.color}`}>
        <Icon className="w-3 h-3" />
        {badge.text}
      </span>
    )
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
      <section className="relative py-8 px-4">
        <div className="container mx-auto max-w-4xl">
          {/* Header */}
          <div className="text-center mb-8">
            <MessageCircle className="w-16 h-16 text-primary mx-auto mb-4" />
            <h1 className="font-serif text-4xl font-bold mb-2">Destek Merkezi</h1>
            <p className="text-muted-foreground">Admin ile iletişime geçin</p>
          </div>

          {/* New Message Button */}
          {!showNewMessageForm && (
            <button
              onClick={() => setShowNewMessageForm(true)}
              className="w-full mb-6 px-6 py-4 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <Send className="w-5 h-5" />
              Yeni Mesaj Gönder
            </button>
          )}

          {/* New Message Form */}
          {showNewMessageForm && (
            <div className="glass border border-border rounded-2xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Yeni Mesaj</h2>
                <button
                  onClick={() => setShowNewMessageForm(false)}
                  className="text-sm text-muted-foreground hover:text-primary"
                >
                  İptal
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Konu *</label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="Mesaj konusu..."
                    required
                    maxLength={200}
                    className="w-full px-4 py-2 glass border border-border rounded-xl outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Mesaj *</label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Mesajınızı yazın..."
                    required
                    rows={6}
                    className="w-full px-4 py-2 glass border border-border rounded-xl outline-none focus:border-primary resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  {submitting ? 'Gönderiliyor...' : 'Gönder'}
                </button>
              </form>
            </div>
          )}

          {/* Messages List */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold mb-4">Mesajlarım</h2>

            {messages.length === 0 ? (
              <div className="text-center py-12 glass border border-border rounded-2xl">
                <MessageCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Henüz mesajınız yok</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className="glass border border-border rounded-2xl p-6 space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-lg mb-1">{msg.subject}</h3>
                      <p className="text-sm text-muted-foreground">
                        {new Date(msg.created_at).toLocaleDateString('tr-TR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    {getStatusBadge(msg.status)}
                  </div>

                  {/* Original Message */}
                  <div className="glass border border-border rounded-xl p-4">
                    <p className="text-sm font-semibold text-primary mb-2">Sizin Mesajınız:</p>
                    <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                  </div>

                  {/* Admin Reply */}
                  {msg.admin_reply && (
                    <div className="glass border border-primary/50 rounded-xl p-4 bg-primary/5">
                      <p className="text-sm font-semibold text-primary mb-2">Admin Yanıtı:</p>
                      <p className="text-sm whitespace-pre-wrap">{msg.admin_reply}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(msg.updated_at).toLocaleDateString('tr-TR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
