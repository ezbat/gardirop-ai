"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Heart, MessageCircle, UserPlus, Sparkles, CheckCheck, Package, Truck, ShoppingBag, Star, RefreshCw, Trash2, Bell, AlertCircle, Loader2 } from "lucide-react"
import FloatingParticles from "@/components/floating-particles"

interface Notification {
  id: string
  user_id: string
  type: 'order' | 'message' | 'follow' | 'like' | 'comment' | 'review' | 'shipping' | 'refund' | 'system'
  title: string
  message: string
  link: string | null
  image_url: string | null
  is_read: boolean
  metadata: any
  created_at: string
  read_at: string | null
}

export default function NotificationsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const userId = session?.user?.id

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)

  useEffect(() => {
    if (userId) {
      loadNotifications()
    }
  }, [userId, showUnreadOnly])

  const loadNotifications = async () => {
    if (!userId) return

    try {
      setLoading(true)
      const response = await fetch(`/api/notifications?userId=${userId}&unreadOnly=${showUnreadOnly}`)
      const data = await response.json()

      if (response.ok) {
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
      }
    } catch (error) {
      console.error('Load notifications error:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    if (!userId) return

    try {
      const response = await fetch('/api/notifications/mark-read', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, notificationId })
      })

      if (response.ok) {
        setNotifications(prev =>
          prev.map(notif =>
            notif.id === notificationId ? { ...notif, is_read: true } : notif
          )
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Mark as read error:', error)
    }
  }

  const markAllAsRead = async () => {
    if (!userId) return

    try {
      const response = await fetch('/api/notifications/mark-read', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, markAll: true })
      })

      if (response.ok) {
        setNotifications(prev => prev.map(notif => ({ ...notif, is_read: true })))
        setUnreadCount(0)
      }
    } catch (error) {
      console.error('Mark all as read error:', error)
    }
  }

  const deleteNotification = async (notificationId: string) => {
    if (!userId) return

    try {
      const response = await fetch(`/api/notifications/delete?userId=${userId}&notificationId=${notificationId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId))
      }
    } catch (error) {
      console.error('Delete notification error:', error)
    }
  }

  const deleteAllNotifications = async () => {
    if (!userId || !confirm('Tüm bildirimleri silmek istediğinizden emin misiniz?')) return

    try {
      const response = await fetch(`/api/notifications/delete?userId=${userId}&deleteAll=true`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setNotifications([])
        setUnreadCount(0)
      }
    } catch (error) {
      console.error('Delete all notifications error:', error)
    }
  }

  const handleNotificationClick = (notif: Notification) => {
    if (!notif.is_read) {
      markAsRead(notif.id)
    }

    if (notif.link) {
      router.push(notif.link)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'order':
        return <ShoppingBag className="w-5 h-5 text-blue-500" />
      case 'shipping':
        return <Truck className="w-5 h-5 text-green-500" />
      case 'message':
        return <MessageCircle className="w-5 h-5 text-purple-500" />
      case 'follow':
        return <UserPlus className="w-5 h-5 text-pink-500" />
      case 'like':
        return <Heart className="w-5 h-5 text-red-500" fill="currentColor" />
      case 'comment':
        return <MessageCircle className="w-5 h-5 text-blue-500" />
      case 'review':
        return <Star className="w-5 h-5 text-yellow-500" />
      case 'refund':
        return <RefreshCw className="w-5 h-5 text-orange-500" />
      case 'system':
        return <AlertCircle className="w-5 h-5 text-gray-500" />
      default:
        return <Bell className="w-5 h-5 text-primary" />
    }
  }

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Bell className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">Bildirimler</h2>
          <p className="text-muted-foreground">Bildirimleri görmek için giriş yapın</p>
        </div>
      </div>
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
        <div className="container mx-auto max-w-2xl">

          {/* HEADER */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-serif text-4xl font-bold">Bildirimler</h1>
              {unreadCount > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  {unreadCount} okunmamış bildirim
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowUnreadOnly(!showUnreadOnly)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                  showUnreadOnly
                    ? 'bg-primary text-primary-foreground'
                    : 'glass border border-border hover:border-primary'
                }`}
              >
                {showUnreadOnly ? 'Tümünü Göster' : 'Okunmamışlar'}
              </button>

              {notifications.length > 0 && (
                <button
                  onClick={deleteAllNotifications}
                  className="p-2 glass border border-border rounded-xl hover:border-red-500 hover:text-red-500 transition-colors"
                  title="Tümünü Sil"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* ACTIONS */}
          {notifications.some(n => !n.is_read) && (
            <div className="mb-6">
              <button
                onClick={markAllAsRead}
                className="w-full px-4 py-3 glass border border-border rounded-xl hover:border-primary transition-colors flex items-center justify-center gap-2 text-sm font-semibold"
              >
                <CheckCheck className="w-4 h-4" />
                Tümünü Okundu İşaretle
              </button>
            </div>
          )}

          {/* NOTIFICATIONS LIST */}
          {notifications.length === 0 ? (
            <div className="text-center py-20 glass border border-border rounded-2xl">
              <div className="text-9xl mb-6">🔔</div>
              <h3 className="text-2xl font-bold mb-3">
                {showUnreadOnly ? 'Okunmamış bildirim yok' : 'Henüz bildirim yok'}
              </h3>
              <p className="text-muted-foreground">
                Yeni aktiviteler burada görünecek
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {notifications.map((notif, idx) => (
                  <motion.div
                    key={notif.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`glass border rounded-2xl p-4 transition-all group ${
                      !notif.is_read ? 'border-primary/50 bg-primary/5' : 'border-border'
                    } ${notif.link ? 'cursor-pointer hover:border-primary' : ''}`}
                  >
                    <div className="flex items-start gap-3">

                      {/* ICON */}
                      <div className="w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center flex-shrink-0">
                        {getNotificationIcon(notif.type)}
                      </div>

                      {/* CONTENT */}
                      <div
                        className="flex-1 min-w-0"
                        onClick={() => handleNotificationClick(notif)}
                      >
                        <h3 className="font-bold mb-1">{notif.title}</h3>
                        <p className="text-sm text-muted-foreground mb-2">{notif.message}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(notif.created_at).toLocaleDateString('tr-TR', {
                            day: 'numeric',
                            month: 'long',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>

                      {/* ACTIONS */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!notif.is_read && (
                          <div className="w-2 h-2 rounded-full bg-primary" />
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteNotification(notif.id)
                          }}
                          className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-500/10 rounded-lg transition-all"
                          title="Sil"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </div>

                    {/* IMAGE (if exists) */}
                    {notif.image_url && (
                      <div className="mt-3 ml-13">
                        <img
                          src={notif.image_url}
                          alt={notif.title}
                          className="w-full max-w-xs rounded-lg border border-border"
                        />
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
