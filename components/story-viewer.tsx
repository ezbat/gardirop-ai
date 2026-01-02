"use client"

import { useState, useEffect, useRef } from "react"
import { X, Heart, Send, Pause, Play, MoreVertical, Trash2 } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { markStoryAsViewed, deleteStory, sendMessage, generateId, type Story } from "@/lib/storage"

interface StoryViewerProps {
  isOpen: boolean
  onClose: () => void
  stories: Story[]
  initialIndex: number
  currentUserId: string
  currentUserName: string
  currentUserAvatar: string
  onStoryComplete?: () => void
}

export default function StoryViewer({ 
  isOpen, 
  onClose, 
  stories, 
  initialIndex,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  onStoryComplete
}: StoryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [progress, setProgress] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [reaction, setReaction] = useState("")
  const [showMenu, setShowMenu] = useState(false)
  const [isLiked, setIsLiked] = useState(false)
  const progressInterval = useRef<NodeJS.Timeout | null>(null)

  const currentStory = stories[currentIndex]
  const isOwnStory = currentStory?.userId === currentUserId
  const STORY_DURATION = 5000

  useEffect(() => {
    if (!isOpen || !currentStory) return

    if (!currentStory.viewedBy.includes(currentUserId)) {
      markStoryAsViewed(currentStory.id, currentUserId)
    }

    startProgress()

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current)
      }
    }
  }, [currentIndex, isOpen, isPaused])

  const startProgress = () => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current)
    }

    setProgress(0)

    if (!isPaused) {
      progressInterval.current = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            handleNext()
            return 0
          }
          return prev + (100 / (STORY_DURATION / 100))
        })
      }, 100)
    }
  }

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setProgress(0)
      setIsLiked(false)
    } else {
      handleClose()
    }
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
      setProgress(0)
      setIsLiked(false)
    }
  }

  const handlePause = () => {
    setIsPaused(!isPaused)
  }

  const handleClose = () => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current)
    }
    setCurrentIndex(initialIndex)
    setProgress(0)
    setIsLiked(false)
    setReaction("")
    if (onStoryComplete) onStoryComplete()
    onClose()
  }

  const handleDelete = async () => {
    if (!isOwnStory) return
    
    if (confirm("Story'nizi silmek istediğinize emin misiniz?")) {
      try {
        await deleteStory(currentStory.id)
        if (stories.length === 1) {
          handleClose()
        } else {
          handleNext()
        }
        if (onStoryComplete) onStoryComplete()
      } catch (error) {
        console.error("Failed to delete story:", error)
      }
    }
    setShowMenu(false)
  }

  const handleLike = () => {
    setIsLiked(!isLiked)
  }

  const sendReaction = async () => {
    if (!reaction.trim() || isOwnStory) return
    
    try {
      const message = {
        id: generateId(),
        senderId: currentUserId,
        senderName: currentUserName,
        senderAvatar: currentUserAvatar,
        receiverId: currentStory.userId,
        content: `Story'ne tepki: ${reaction}`,
        createdAt: Date.now(),
        read: false
      }
      
      await sendMessage(message)
      alert("Tepki gönderildi! ✅")
      setReaction("")
    } catch (error) {
      console.error("Failed to send reaction:", error)
      alert("Tepki gönderilemedi ❌")
    }
  }

  if (!isOpen || !currentStory) return null

  return (
    <div className="fixed inset-0 z-[9999] bg-black">
      {/* Progress Bars */}
      <div className="absolute top-0 left-0 right-0 z-[100] flex gap-1 p-2 pointer-events-none">
        {stories.map((_, idx) => (
          <div key={idx} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-100"
              style={{
                width: idx === currentIndex 
                  ? `${progress}%` 
                  : idx < currentIndex 
                    ? "100%" 
                    : "0%"
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-4 left-0 right-0 z-[100] px-4 mt-4 pointer-events-none">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 pointer-events-auto">
            <Avatar className="w-10 h-10 border-2 border-white">
              <AvatarImage src={currentStory.userAvatar} alt={currentStory.userName} />
              <AvatarFallback className="bg-primary text-white">
                {currentStory.userName[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-white font-semibold text-sm">{currentStory.userName}</p>
              <p className="text-white/70 text-xs">
                {Math.floor((Date.now() - currentStory.createdAt) / (1000 * 60))}d önce
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              onClick={handlePause}
              className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"
            >
              {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
            </button>

            {isOwnStory && (
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>

                {showMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-[90]" 
                      onClick={() => setShowMenu(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 glass rounded-xl border border-border shadow-xl z-[100]">
                      <button
                        onClick={handleDelete}
                        className="w-full flex items-center gap-2 px-4 py-3 text-red-500 hover:bg-red-500/10 transition-colors rounded-xl"
                      >
                        <Trash2 className="w-4 h-4" />
                        Sil
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            <button
              onClick={handleClose}
              className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Story Content */}
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Navigation Areas - KÜÇÜLTÜLDÜ! Sadece kenarlar */}
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="absolute left-0 top-20 bottom-20 w-20 z-10"
        />
        <button
          onClick={handleNext}
          className="absolute right-0 top-20 bottom-20 w-20 z-10"
        />

        {/* Image */}
        {currentStory.type === "photo" && currentStory.imageUrl && (
          <img
            src={currentStory.imageUrl}
            alt="Story"
            className="max-w-full max-h-full object-contain pointer-events-none"
          />
        )}

        {currentStory.type === "outfit" && (
          <div className="text-center pointer-events-none">
            <div className="text-9xl mb-4">👔</div>
            <p className="text-white text-xl font-bold">Kombin Story</p>
          </div>
        )}

        {/* Caption */}
        {currentStory.caption && (
          <div className="absolute bottom-32 left-4 right-4 pointer-events-none">
            <p className="text-white text-center font-medium drop-shadow-lg">
              {currentStory.caption}
            </p>
          </div>
        )}
      </div>

      {/* Reply Box */}
      {!isOwnStory && (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent z-[100]">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={reaction}
              onChange={(e) => setReaction(e.target.value)}
              placeholder="Mesaj gönder..."
              className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-full text-white placeholder:text-white/50 focus:outline-none focus:border-white/40"
              onKeyPress={(e) => e.key === "Enter" && sendReaction()}
            />
            <button
              onClick={sendReaction}
              disabled={!reaction.trim()}
              className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors disabled:opacity-50"
            >
              <Send className="w-5 h-5 text-white" />
            </button>
            <button 
              onClick={handleLike}
              className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            >
              <Heart className={`w-5 h-5 transition-all ${isLiked ? 'fill-red-500 text-red-500 scale-110' : 'text-white'}`} />
            </button>
          </div>
        </div>
      )}

      {/* View Count */}
      {isOwnStory && (
        <div className="absolute bottom-6 left-6 z-[100] pointer-events-none">
          <div className="flex items-center gap-2 text-white">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-sm font-bold">{currentStory.viewedBy.length}</span>
            </div>
            <span className="text-sm">görüntülenme</span>
          </div>
        </div>
      )}
    </div>
  )
}