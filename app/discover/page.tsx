"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Search, UserPlus, UserCheck, Users } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import LuxuryButton from "@/components/luxury-button"
import FloatingParticles from "@/components/floating-particles"
import {
  type User,
  getAllSocialPosts,
  getUser,
  updateUser,
  createOrUpdateUser,
  createNotification,
  generateId,
} from "@/lib/storage"

export default function DiscoverPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const userId = session?.user?.id

  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<User | null>(null)

  useEffect(() => {
    if (userId) {
      loadUsers()
    }
  }, [userId])

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = users.filter((user) =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredUsers(filtered)
    } else {
      setFilteredUsers(users)
    }
  }, [searchQuery, users])

  const loadUsers = async () => {
    if (!userId || !session?.user) return

    try {
      // Mevcut kullanıcının DB'de olduğundan emin ol
      await createOrUpdateUser({
        id: userId,
        name: session.user.name || "User",
        email: session.user.email || "",
        avatar: session.user.image || "",
        followers: [],
        following: [],
        createdAt: Date.now(),
      })

      const currentUserData = await getUser(userId)
      setCurrentUser(currentUserData || null)

      // Sosyal paylaşımlardan tüm kullanıcıları çek
      const posts = await getAllSocialPosts()
      const uniqueUsers = new Map<string, User>()

      for (const post of posts) {
        if (post.userId !== userId && !uniqueUsers.has(post.userId)) {
          let user = await getUser(post.userId)
          if (!user) {
            // Kullanıcı yoksa oluştur
            user = {
              id: post.userId,
              name: post.userName,
              email: "",
              avatar: post.userAvatar,
              followers: [],
              following: [],
              createdAt: Date.now(),
            }
            await createOrUpdateUser(user)
          }
          uniqueUsers.set(post.userId, user)
        }
      }

      setUsers(Array.from(uniqueUsers.values()))
      setFilteredUsers(Array.from(uniqueUsers.values()))
    } catch (error) {
      console.error("Failed to load users:", error)
    }
    setIsLoading(false)
  }

  const isFollowing = (targetUserId: string) => {
    return currentUser?.following.includes(targetUserId) || false
  }

  const handleFollow = async (targetUser: User) => {
    if (!userId || !currentUser || !session?.user) return

    const isCurrentlyFollowing = isFollowing(targetUser.id)

    // Mevcut kullanıcının takip listesini güncelle
    const updatedFollowing = isCurrentlyFollowing
      ? currentUser.following.filter((id) => id !== targetUser.id)
      : [...currentUser.following, targetUser.id]

    const updatedCurrentUser = {
      ...currentUser,
      following: updatedFollowing,
    }

    // Hedef kullanıcının takipçi listesini güncelle
    const updatedFollowers = isCurrentlyFollowing
      ? targetUser.followers.filter((id) => id !== userId)
      : [...targetUser.followers, userId]

    const updatedTargetUser = {
      ...targetUser,
      followers: updatedFollowers,
    }

    await updateUser(updatedCurrentUser)
    await updateUser(updatedTargetUser)

    setCurrentUser(updatedCurrentUser)
    setUsers((prev) =>
      prev.map((u) => (u.id === targetUser.id ? updatedTargetUser : u))
    )

    // Takip bildirimi oluştur (takip edince)
    if (!isCurrentlyFollowing) {
      await createNotification({
        id: generateId(),
        userId: targetUser.id,
        type: "follow",
        fromUserId: userId,
        fromUserName: session.user.name || "Kullanıcı",
        fromUserAvatar: session.user.image || "",
        content: "seni takip etmeye başladı",
        createdAt: Date.now(),
        read: false,
      })
    }
  }

  const getUserPostCount = (targetUserId: string) => {
    // Gerçek post sayısı burada hesaplanabilir
    return Math.floor(Math.random() * 20) + 1
  }

  if (isLoading) {
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

      <section className="relative pt-8 pb-16 px-4">
        <div className="container mx-auto max-w-4xl">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h1 className="font-serif text-4xl md:text-5xl font-bold mb-4">
              <span className="text-foreground">Kullanıcı </span>
              <span className="text-primary">Keşfet</span>
            </h1>
            <p className="text-muted-foreground">İlham almak için yeni insanlar keşfet</p>
          </motion.div>

          {/* Arama */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Kullanıcı ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 text-lg"
              />
            </div>
          </motion.div>

          {/* İstatistikler */}
          {currentUser && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-3 gap-4 mb-8"
            >
              <div className="p-4 rounded-xl glass border border-primary/20 text-center">
                <div className="text-2xl font-bold text-primary">{currentUser.following.length}</div>
                <div className="text-xs text-muted-foreground">Takip</div>
              </div>
              <div className="p-4 rounded-xl glass border border-primary/20 text-center">
                <div className="text-2xl font-bold text-primary">{currentUser.followers.length}</div>
                <div className="text-xs text-muted-foreground">Takipçi</div>
              </div>
              <div className="p-4 rounded-xl glass border border-primary/20 text-center">
                <div className="text-2xl font-bold text-primary">{filteredUsers.length}</div>
                <div className="text-xs text-muted-foreground">Kullanıcı</div>
              </div>
            </motion.div>
          )}

          {/* Kullanıcı Listesi */}
          {filteredUsers.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-20"
            >
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Users className="w-12 h-12 text-primary" />
              </div>
              <h2 className="font-serif text-2xl font-bold mb-3">
                {searchQuery ? "Kullanıcı Bulunamadı" : "Henüz Kullanıcı Yok"}
              </h2>
              <p className="text-muted-foreground">
                {searchQuery ? "Farklı bir arama deneyin" : "İlk paylaşımı yaparak başlayın!"}
              </p>
            </motion.div>
          ) : (
            <div className="space-y-4">
              {filteredUsers.map((user, index) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 rounded-2xl glass border border-border/50 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {/* Avatar - Tıklanabilir */}
                    <button
                      onClick={() => router.push(`/profile/${user.id}`)}
                      className="flex-shrink-0"
                    >
                      <Avatar className="w-16 h-16 border-2 border-primary/20 hover:border-primary transition-colors cursor-pointer">
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
                          {user.name[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </button>

                    {/* Kullanıcı Bilgileri - Tıklanabilir */}
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => router.push(`/profile/${user.id}`)}
                        className="font-semibold text-lg hover:text-primary transition-colors text-left block"
                      >
                        {user.name}
                      </button>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span>{user.followers.length} takipçi</span>
                        <span>•</span>
                        <span>{getUserPostCount(user.id)} paylaşım</span>
                      </div>
                    </div>

                    {/* Takip Et Butonu */}
                    <LuxuryButton
                      onClick={() => handleFollow(user)}
                      variant={isFollowing(user.id) ? "outline" : "default"}
                      size="sm"
                      className="gap-2"
                    >
                      {isFollowing(user.id) ? (
                        <>
                          <UserCheck className="w-4 h-4" />
                          <span className="hidden sm:inline">Takiptesin</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4" />
                          <span className="hidden sm:inline">Takip Et</span>
                        </>
                      )}
                    </LuxuryButton>
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