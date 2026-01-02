"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { motion } from "framer-motion"
import { Heart, MessageCircle, UserPlus, Sparkles, CheckCheck } from "lucide-react"
import FloatingParticles from "@/components/floating-particles"
import { supabase } from "@/lib/supabase"

interface Notification {
  id: string
  user_id: string
  from_user_id: string
  type: 'like' | 'comment' | 'follow' | 'outfit_saved'
  content: string
  is_read: boolean
  created_at: string
  from_user?: {
    id: string
    name: string
    avatar_url: string | null
  }
}

export default function NotificationsPage() {
  const { data: session } = useSession()
  const userId = session?.user?.id

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userId) {
      loadNotifications()
    }
  }, [userId])

 const loadNotifications = async () => {
  if (!userId) return

  setLoading(true)
  try {
    console.log('📥 Loading notifications for:', userId)

    const { data: notificationsData, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    console.log('📊 Notifications data:', notificationsData)
    console.log('📊 Error:', error)

    if (error) throw error

    if (!notificationsData || notificationsData.length === 0) {
      setNotifications([])
      return
    }

    // Her notification için from_user bilgisini çek
    const notificationsWithUsers = await Promise.all(
      notificationsData.map(async (notif) => {
        if (!notif.from_user_id) {
          return {
            ...notif,
            from_user: { id: 'unknown', name: 'Sistem', avatar_url: null }
          }
        }

        const { data: userData } = await supabase
          .from('users')
          .select('id, name, avatar_url')
          .eq('id', notif.from_user_id)
          .single()

        return {
          ...notif,
          from_user: userData || { id: notif.from_user_id, name: 'Bilinmeyen', avatar_url: null }
        }
      })
    )

    setNotifications(notificationsWithUsers)
    console.log('✅ Notifications loaded:', notificationsWithUsers.length)
  } catch (error) {
    console.error('💥 Load notifications error:', error)
  } finally {
    setLoading(false)
  }
}

  const markAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)

      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId ? { ...notif, is_read: true } : notif
        )
      )
    } catch (error) {
      console.error('Mark as read error:', error)
    }
  }

  const markAllAsRead = async () => {
    if (!userId) return

    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false)

      setNotifications(prev => prev.map(notif => ({ ...notif, is_read: true })))
      alert('Tüm bildirimler okundu olarak işaretlendi ✓')
    } catch (error) {
      console.error('Mark all as read error:', error)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="w-5 h-5 text-red-500" fill="currentColor" />
      case 'comment':
        return <MessageCircle className="w-5 h-5 text-blue-500" />
      case 'follow':
        return <UserPlus className="w-5 h-5 text-green-500" />
      case 'outfit_saved':
        return <Sparkles className="w-5 h-5 text-yellow-500" />
      default:
        return <Sparkles className="w-5 h-5" />
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
        <div className="container mx-auto max-w-2xl">
          
          {/* HEADER */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="font-serif text-4xl font-bold">Bildirimler</h1>
            
            {notifications.some(n => !n.is_read) && (
              <button
                onClick={markAllAsRead}
                className="px-4 py-2 glass border border-border rounded-xl hover:border-primary transition-colors flex items-center gap-2 text-sm font-semibold"
              >
                <CheckCheck className="w-4 h-4" />
                Tümünü Okundu İşaretle
              </button>
            )}
          </div>

          {/* NOTIFICATIONS LIST */}
          {notifications.length === 0 ? (
            <div className="text-center py-20 glass border border-border rounded-2xl">
              <div className="text-9xl mb-6">🔔</div>
              <h3 className="text-2xl font-bold mb-3">Henüz bildirim yok</h3>
              <p className="text-muted-foreground">
                Yeni aktiviteler burada görünecek
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notif, idx) => (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => !notif.is_read && markAsRead(notif.id)}
                  className={`glass border rounded-2xl p-4 hover:border-primary transition-colors cursor-pointer ${
                    !notif.is_read ? 'border-primary/50 bg-primary/5' : 'border-border'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    
                    {/* AVATAR */}
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-primary flex-shrink-0">
                      {notif.from_user?.avatar_url ? (
                        <img
                          src={notif.from_user.avatar_url}
                          alt={notif.from_user.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg">
                          {notif.from_user?.name?.[0]?.toUpperCase() || 'U'}
                        </div>
                      )}
                    </div>

                    {/* CONTENT */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 mb-1">
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIcon(notif.type)}
                        </div>
                        <p className="text-sm">
                          <span className="font-bold">{notif.from_user?.name}</span>
                          {' '}
                          {notif.content}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(notif.created_at).toLocaleDateString('tr-TR', {
                          day: 'numeric',
                          month: 'long',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>

                    {/* UNREAD DOT */}
                    {!notif.is_read && (
                      <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}