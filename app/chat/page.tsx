"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { MessageCircle, Loader2, Package, Store } from "lucide-react"
import FloatingParticles from "@/components/floating-particles"
import Link from "next/link"

interface Conversation {
  id: string
  product_id: string | null
  last_message: string
  last_message_at: string
  customer_unread_count: number
  seller_unread_count: number
  customer?: {
    id: string
    name: string
    username: string
    avatar_url: string | null
  }
  seller?: {
    id: string
    shop_name: string
    logo_url: string | null
    user_id: string
  }
  product?: {
    id: string
    title: string
    images: string[]
  }
}

export default function ChatListPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const userId = session?.user?.id

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [userType, setUserType] = useState<'customer' | 'seller'>('customer')
  const [activeTab, setActiveTab] = useState<'customer' | 'seller'>('customer')

  useEffect(() => {
    if (userId) {
      loadConversations()
    }
  }, [userId, activeTab])

  const loadConversations = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/conversations?type=${activeTab}`)
      const data = await res.json()

      setConversations(data.conversations || [])
      setUserType(data.userType || 'customer')
    } catch (error) {
      console.error('Load conversations error:', error)
    } finally {
      setLoading(false)
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
          <p className="text-muted-foreground mb-4">Mesajları görüntülemek için giriş yapmalısınız</p>
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
    <div className="min-h-screen relative overflow-hidden py-8 px-4">
      <FloatingParticles />

      <div className="container mx-auto max-w-4xl relative">
        {/* Header */}
        <div className="text-center mb-8">
          <MessageCircle className="w-16 h-16 text-primary mx-auto mb-4" />
          <h1 className="font-serif text-4xl font-bold mb-2">Mesajlar</h1>
          <p className="text-muted-foreground">Satıcılar ve müşterilerle sohbet edin</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('customer')}
            className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-colors ${
              activeTab === 'customer'
                ? 'bg-primary text-primary-foreground'
                : 'glass border border-border hover:border-primary'
            }`}
          >
            Müşteri Olarak
          </button>
          <button
            onClick={() => setActiveTab('seller')}
            className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-colors ${
              activeTab === 'seller'
                ? 'bg-primary text-primary-foreground'
                : 'glass border border-border hover:border-primary'
            }`}
          >
            Satıcı Olarak
          </button>
        </div>

        {/* Conversations List */}
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-12 glass border border-border rounded-2xl">
            <MessageCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Henüz mesajınız yok</p>
          </div>
        ) : (
          <div className="space-y-3">
            {conversations.map((conv) => {
              const otherParty = activeTab === 'customer' ? conv.seller : conv.customer
              const unreadCount = activeTab === 'customer' ? conv.customer_unread_count : conv.seller_unread_count

              return (
                <Link
                  key={conv.id}
                  href={`/chat/${conv.id}`}
                  className="block glass border border-border rounded-2xl p-4 hover:border-primary transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {/* Avatar/Logo */}
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {activeTab === 'customer' ? (
                        <Store className="w-6 h-6 text-primary" />
                      ) : (
                        <MessageCircle className="w-6 h-6 text-primary" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Name */}
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold truncate">
                          {activeTab === 'customer' ? conv.seller?.shop_name : conv.customer?.name}
                        </h3>
                        <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                          {formatTime(conv.last_message_at)}
                        </span>
                      </div>

                      {/* Product */}
                      {conv.product && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                          <Package className="w-3 h-3" />
                          <span className="truncate">{conv.product.title}</span>
                        </div>
                      )}

                      {/* Last Message */}
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground truncate flex-1">
                          {conv.last_message}
                        </p>
                        {unreadCount > 0 && (
                          <span className="flex-shrink-0 ml-2 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
