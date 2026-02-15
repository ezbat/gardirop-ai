"use client"

import { usePathname, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { Compass, MessageCircle, PlusCircle, User } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import CreatePostModal from './create-post-modal'
import CreateContentSheet from './create-content-sheet'
import NotificationIcon from './notification-icon'
import { supabase } from '@/lib/supabase'

export default function MobileBottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const [showCreatePost, setShowCreatePost] = useState(false)
  const [showCreateSheet, setShowCreateSheet] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (session?.user?.id) {
      loadUnreadCount()

      const channel = supabase
        .channel('mobile-nav-notifications')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${session.user.id}`
          },
          () => {
            loadUnreadCount()
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [session?.user?.id])

  const loadUnreadCount = async () => {
    if (!session?.user?.id) return

    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', session.user.id)
      .eq('is_read', false)

    setUnreadCount(count || 0)
  }

  const navItems = [
    {
      icon: Compass,
      label: 'Entdecken',
      href: '/explore',
      active: pathname === '/explore',
    },
    {
      icon: MessageCircle,
      label: 'Nachrichten',
      href: '/messages',
      active: pathname?.startsWith('/messages'),
      requiresAuth: true,
    },
    {
      icon: PlusCircle,
      label: '',
      onClick: () => setShowCreateSheet(true),
      active: false,
      requiresAuth: true,
      isCenter: true,
    },
    {
      icon: 'notification', // Special marker for notification icon
      label: 'Mitteilungen',
      href: '/notifications',
      active: pathname === '/notifications',
      badge: unreadCount,
      requiresAuth: true,
    },
    {
      icon: User,
      label: 'Profil',
      href: '/profile',
      active: pathname?.startsWith('/profile'),
      requiresAuth: true,
    },
  ]

  const handleNavClick = (item: typeof navItems[0]) => {
    if (item.requiresAuth && !session) {
      router.push('/auth/signin')
      return
    }

    if (item.onClick) {
      item.onClick()
    } else if (item.href) {
      router.push(item.href)
    }
  }

  // Hide on onboarding and explore pages (full-screen experiences)
  if (pathname === '/onboarding' || pathname === '/explore') {
    return null
  }

  return (
    <>
      {/* Mobile Bottom Navigation - TikTok Style */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur-xl border-t border-border/50">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item, index) => {
            const Icon = item.icon
            const isActive = item.active

            if (item.isCenter) {
              return (
                <button
                  key={index}
                  onClick={() => handleNavClick(item)}
                  className="relative flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground shadow-lg active:scale-90 transition-transform"
                >
                  <Icon className="w-6 h-6" strokeWidth={2.5} />
                </button>
              )
            }

            // Special handling for notification icon
            if (item.icon === 'notification') {
              return (
                <div
                  key={index}
                  className="relative flex flex-col items-center justify-center flex-1 h-full"
                >
                  <NotificationIcon
                    hasNotifications={unreadCount > 0}
                    count={unreadCount}
                    size={24}
                    onClick={() => handleNavClick(item)}
                  />
                  {item.label && (
                    <span
                      className={`text-[10px] font-medium transition-colors mt-1 ${
                        isActive ? 'text-primary font-semibold' : 'text-muted-foreground'
                      }`}
                    >
                      {item.label}
                    </span>
                  )}
                </div>
              )
            }

            return (
              <button
                key={index}
                onClick={() => handleNavClick(item)}
                className="relative flex flex-col items-center justify-center flex-1 h-full active:scale-95 transition-all"
              >
                <div className="relative mb-1">
                  <Icon
                    className={`w-6 h-6 transition-colors ${
                      isActive ? 'text-primary' : 'text-muted-foreground'
                    }`}
                    strokeWidth={isActive ? 2.5 : 2}
                  />

                  {item.badge && item.badge > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-500 border-2 border-background"
                    />
                  )}
                </div>

                {item.label && (
                  <span
                    className={`text-[10px] font-medium transition-colors ${
                      isActive ? 'text-primary font-semibold' : 'text-muted-foreground'
                    }`}
                  >
                    {item.label}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Safe area for iPhone */}
        <div className="h-[env(safe-area-inset-bottom)] bg-background"></div>
      </div>

      {/* Create Content Sheet (New) */}
      <CreateContentSheet
        isOpen={showCreateSheet}
        onClose={() => setShowCreateSheet(false)}
      />

      {/* Create Post Modal (Old - for photo posts) */}
      <AnimatePresence>
        {showCreatePost && (
          <CreatePostModal isOpen={showCreatePost} onClose={() => setShowCreatePost(false)} />
        )}
      </AnimatePresence>
    </>
  )
}
