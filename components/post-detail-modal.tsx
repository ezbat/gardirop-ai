"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Heart, MessageCircle, Send, Bookmark, MoreHorizontal } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { SocialPost } from "@/lib/storage"

interface PostDetailModalProps {
  isOpen: boolean
  onClose: () => void
  post: SocialPost
  currentUserId: string
}

export default function PostDetailModal({
  isOpen,
  onClose,
  post,
  currentUserId
}: PostDetailModalProps) {
  const [isLiked, setIsLiked] = useState(post.likedBy.includes(currentUserId))
  const [isSaved, setIsSaved] = useState(false)
  const [comment, setComment] = useState("")
  const [localLikes, setLocalLikes] = useState(post.likes)

  const handleLike = () => {
    setIsLiked(!isLiked)
    setLocalLikes(isLiked ? localLikes - 1 : localLikes + 1)
  }

  const handleSave = () => {
    setIsSaved(!isSaved)
  }

  const handleComment = () => {
    if (!comment.trim()) return
    alert(`Yorum gönderildi: ${comment}`)
    setComment("")
  }

  const formatTime = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor(diff / (1000 * 60))

    if (days > 0) return `${days} gün önce`
    if (hours > 0) return `${hours} saat önce`
    if (minutes > 0) return `${minutes} dakika önce`
    return "Az önce"
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="relative w-full max-w-5xl h-[90vh] glass border border-border rounded-2xl overflow-hidden flex flex-col md:flex-row"
        >
          {/* Sol Taraf - Görsel */}
          <div className="flex-1 bg-black flex items-center justify-center relative">
            <div className="text-9xl">👔</div>
            
            {/* Close Button - Mobile */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors md:hidden"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>

          {/* Sağ Taraf - Detaylar */}
          <div className="w-full md:w-96 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10 border-2 border-primary/20">
                  <AvatarImage src={post.userAvatar} alt={post.userName} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {post.userName[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-sm">{post.userName}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-secondary/50 rounded-full transition-colors">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-secondary/50 rounded-full transition-colors hidden md:block"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Comments Section */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* Caption */}
              <div className="flex gap-3 mb-4">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={post.userAvatar} alt={post.userName} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {post.userName[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm">
                    <span className="font-semibold mr-2">{post.userName}</span>
                    {post.caption}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatTime(post.createdAt)}
                  </p>
                </div>
              </div>

              {/* Comments */}
              {post.comments.length > 0 ? (
                <div className="space-y-4">
                  {post.comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={comment.userAvatar} alt={comment.userName} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {comment.userName[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm">
                          <span className="font-semibold mr-2">{comment.userName}</span>
                          {comment.content}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatTime(comment.createdAt)}
                        </p>
                      </div>
                      <button className="p-1">
                        <Heart className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MessageCircle className="w-12 h-12 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Henüz yorum yok</p>
                  <p className="text-xs text-muted-foreground">İlk yorumu sen yap!</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="border-t border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-4">
                  <button onClick={handleLike} className="hover:opacity-70 transition-opacity">
                    <Heart className={`w-6 h-6 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                  </button>
                  <button className="hover:opacity-70 transition-opacity">
                    <MessageCircle className="w-6 h-6" />
                  </button>
                  <button className="hover:opacity-70 transition-opacity">
                    <Send className="w-6 h-6" />
                  </button>
                </div>
                <button onClick={handleSave} className="hover:opacity-70 transition-opacity">
                  <Bookmark className={`w-6 h-6 ${isSaved ? 'fill-current' : ''}`} />
                </button>
              </div>

              {/* Likes Count */}
              <p className="font-semibold text-sm mb-2">{localLikes} beğeni</p>

              {/* Time */}
              <p className="text-xs text-muted-foreground mb-3">
                {formatTime(post.createdAt)}
              </p>

              {/* Comment Input */}
              <div className="flex items-center gap-2 pt-3 border-t border-border">
                <input
                  type="text"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Yorum ekle..."
                  className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
                  onKeyPress={(e) => e.key === "Enter" && handleComment()}
                />
                <button
                  onClick={handleComment}
                  disabled={!comment.trim()}
                  className="text-sm font-semibold text-primary disabled:opacity-50 hover:opacity-70 transition-opacity"
                >
                  Paylaş
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}