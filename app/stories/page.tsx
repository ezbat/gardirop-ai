"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { motion } from "framer-motion"
import { Plus, Search } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import FloatingParticles from "@/components/floating-particles"
import AddStoryModal from "@/components/add-story-modal"
import StoryViewer from "@/components/story-viewer"
import { getStoryGroups, cleanExpiredStories, type StoryGroup, type Story } from "@/lib/storage"

export default function StoriesPage() {
  const { data: session } = useSession()
  const userId = session?.user?.id
  
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([])
  const [filteredGroups, setFilteredGroups] = useState<StoryGroup[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isViewerOpen, setIsViewerOpen] = useState(false)
  const [selectedStories, setSelectedStories] = useState<Story[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    if (userId) {
      loadStories()
    }
  }, [userId])

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredGroups(storyGroups)
    } else {
      const filtered = storyGroups.filter(group =>
        group.userName.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredGroups(filtered)
    }
  }, [searchQuery, storyGroups])

  const loadStories = async () => {
    if (!userId) return
    
    setLoading(true)
    try {
      await cleanExpiredStories()
      const groups = await getStoryGroups(userId)
      setStoryGroups(groups)
      setFilteredGroups(groups)
    } catch (error) {
      console.error("Failed to load stories:", error)
    }
    setLoading(false)
  }

  const handleStoryClick = (group: StoryGroup, storyIndex: number = 0) => {
    setSelectedStories(group.stories)
    setSelectedIndex(storyIndex)
    setIsViewerOpen(true)
  }

  const handleAddStory = () => {
    setIsAddModalOpen(true)
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

      <section className="relative py-6 px-4">
        <div className="container mx-auto max-w-4xl">
          {/* Header */}
          <div className="mb-6">
            <h1 className="font-serif text-3xl font-bold mb-4">Hikayeler</h1>
            
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Kullanıcı ara..."
                className="w-full pl-12 pr-4 py-3 glass border border-border rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
            </div>
          </div>

          {/* Story Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {/* Kendi Story Ekleme Kartı */}
            <button
              onClick={handleAddStory}
              className="group relative aspect-[3/4] rounded-2xl overflow-hidden bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-dashed border-primary/30 hover:border-primary hover:from-primary/20 hover:to-primary/10 transition-all"
            >
              <div className="absolute inset-0 flex flex-col items-center justify-center p-3">
                <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center mb-2 group-hover:scale-110 transition-transform shadow-lg">
                  <Plus className="w-7 h-7 text-primary-foreground" />
                </div>
                <p className="text-sm font-semibold text-center">Story<br/>Ekle</p>
              </div>
            </button>

            {/* Story Kartları */}
            {filteredGroups.map((group) => {
              const isOwn = group.userId === userId
              
              return (
                <button
                  key={group.userId}
                  onClick={() => handleStoryClick(group)}
                  className="group relative aspect-[3/4] rounded-2xl overflow-hidden shadow-lg hover:scale-105 transition-transform"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/30 via-pink-500/30 to-orange-500/30" />
                  
                  {group.stories[0].type === "photo" && group.stories[0].imageUrl && (
                    <img
                      src={group.stories[0].imageUrl}
                      alt={group.userName}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  )}

                  {group.stories[0].type === "outfit" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-amber-500/20 to-orange-500/20">
                      <span className="text-7xl">👔</span>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70" />

                  <div className="absolute top-3 left-3">
                    <div className={`p-0.5 rounded-full ${group.hasUnviewed ? 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600' : 'bg-gray-500'}`}>
                      <div className="p-0.5 rounded-full bg-background">
                        <Avatar className="w-11 h-11 border-2 border-background">
                          <AvatarImage src={group.userAvatar} alt={group.userName} />
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                            {group.userName[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    </div>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-white text-sm font-semibold drop-shadow-lg truncate">
                      {isOwn ? "Senin Hikayeniz" : group.userName}
                    </p>
                    <p className="text-white/80 text-xs drop-shadow-lg">
                      {group.stories.length} hikaye
                    </p>
                  </div>

                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                </button>
              )
            })}
          </div>

          {/* Empty State */}
          {filteredGroups.length === 0 && !searchQuery && (
            <div className="text-center py-20">
              <div className="text-9xl mb-6">📸</div>
              <h3 className="text-2xl font-bold mb-3">Henüz hikaye yok</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                İlk hikayeni sen paylaş! 24 saat içinde kaybolan anları arkadaşlarınla paylaş.
              </p>
              <button
                onClick={handleAddStory}
                className="px-8 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity inline-flex items-center gap-2 shadow-lg"
              >
                <Plus className="w-5 h-5" />
                İlk Hikayeni Ekle
              </button>
            </div>
          )}

          {/* Search Empty State */}
          {filteredGroups.length === 0 && searchQuery && (
            <div className="text-center py-20">
              <Search className="w-20 h-20 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Kullanıcı bulunamadı</h3>
              <p className="text-muted-foreground">"{searchQuery}" için sonuç yok</p>
            </div>
          )}
        </div>
      </section>

      {/* Modals */}
      {userId && (
        <>
          <AddStoryModal
            isOpen={isAddModalOpen}
            onClose={() => setIsAddModalOpen(false)}
            userId={userId}
            userName={session?.user?.name || "User"}
            userAvatar={session?.user?.image || ""}
            onSuccess={loadStories}
          />

          <StoryViewer
            isOpen={isViewerOpen}
            onClose={() => setIsViewerOpen(false)}
            stories={selectedStories}
            initialIndex={selectedIndex}
            currentUserId={userId}
            currentUserName={session?.user?.name || "User"}
            currentUserAvatar={session?.user?.image || ""}
            onStoryComplete={loadStories}
          />
        </>
      )}
    </div>
  )
}