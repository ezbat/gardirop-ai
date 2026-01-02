"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { motion } from "framer-motion"
import { Search, Users, UserPlus } from "lucide-react"
import Link from "next/link"
import FloatingParticles from "@/components/floating-particles"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import FollowButton from "@/components/follow-button"
import { getAllUsers, type User } from "@/lib/storage"

export default function SearchPage() {
  const { data: session } = useSession()
  const userId = session?.user?.id

  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUsers()
  }, [])

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredUsers(users.filter(u => u.id !== userId))
    } else {
      const query = searchQuery.toLowerCase()
      setFilteredUsers(
        users.filter(
          u =>
            u.id !== userId &&
            (u.name.toLowerCase().includes(query) ||
              u.email.toLowerCase().includes(query))
        )
      )
    }
  }, [searchQuery, users, userId])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const allUsers = await getAllUsers()
      setUsers(allUsers)
      setFilteredUsers(allUsers.filter(u => u.id !== userId))
    } catch (error) {
      console.error("Failed to load users:", error)
    }
    setLoading(false)
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
          <div className="mb-8">
            <h1 className="font-serif text-4xl font-bold mb-2 flex items-center gap-3">
              <Search className="w-10 h-10 text-primary" />
              Kullanici Ara
            </h1>
            <p className="text-muted-foreground">Insanlari bul ve takip et</p>
          </div>

          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Isim veya email ara..."
                className="w-full pl-12 pr-4 py-3 glass border border-border rounded-xl outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {filteredUsers.length} kullanici bulundu
            </p>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="text-center py-20 glass border border-border rounded-2xl">
              <div className="text-9xl mb-6">👥</div>
              <h3 className="text-2xl font-bold mb-3">Kullanici bulunamadi</h3>
              <p className="text-muted-foreground">
                {searchQuery ? "Farkli bir arama dene" : "Henuz baska kullanici yok"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredUsers.map((user) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass border border-border rounded-xl p-4 hover:border-primary transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <Link
                      href={`/profile/${user.id}`}
                      className="flex items-center gap-4 flex-1"
                    >
                      <Avatar className="w-16 h-16 border-2 border-primary/20">
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xl">
                          {user.name[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1">
                        <h3 className="font-bold text-lg">{user.name}</h3>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        <div className="flex gap-4 mt-2 text-sm">
                          <span className="text-muted-foreground">
                            <strong className="text-foreground">
                              {user.followers?.length || 0}
                            </strong>{" "}
                            Takipci
                          </span>
                          <span className="text-muted-foreground">
                            <strong className="text-foreground">
                              {user.following?.length || 0}
                            </strong>{" "}
                            Takip
                          </span>
                        </div>
                      </div>
                    </Link>

                    {userId && (
                      <FollowButton
                        currentUserId={userId}
                        targetUserId={user.id}
                      />
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