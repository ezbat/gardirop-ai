"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { SocialPost } from "@/lib/storage"

interface FeedPostProps {
  post: SocialPost
  currentUserId: string
  onLike: (postId: string) => void
  onComment: (postId: string, comment: string) => void
  onSave: (postId: string) => void
}

export default function FeedPost({ post, currentUserId, onLike, onComment, onSave }: FeedPostProps) {
  const [isLiked, setIsLiked] = useState(post.likedBy.includes(currentUserId))
  const [isSaved, setIsSaved] = useState(false)
  const [localLikes, setLocalLikes] = useState(post.likes)
  const [comment, setComment] = useState("")
  const [showAllComments, setShowAllComments] = useState(false)
  const [showHeartAnimation, setShowHeartAnimation] = useState(false)

  const handleLike = () => {
    setIsLiked(!isLiked)
    setLocalLikes(isLiked ? localLikes - 1 : localLikes + 1)
    onLike(post.id)
  }

  const handleDoubleClick = () => {
    if (!isLiked) {
      setIsLiked(true)
      setLocalLikes(localLikes + 1)
      onLike(post.id)
      setShowHeartAnimation(true)
      setTimeout(() => setShowHeartAnimation(false), 1000)
    }
  }

  const handleComment = () => {
    if (!comment.trim()) return
    onComment(post.id, comment)
    setComment("")
  }

  const handleSave = () => {
    setIsSaved(!isSaved)
    onSave(post.id)
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

  return (
    <div className="glass border border-border rounded-2xl overflow-hidden mb-4">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10 border-2 border-primary/20">
            <AvatarImage src={post.userAvatar} alt={post.userName} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {post.userName[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-sm">{post.userName}</p>
            <p className="text-xs text-muted-foreground">{formatTime(post.createdAt)}</p>
          </div>
        </div>

        <button className="p-2 hover:bg-secondary/50 rounded-full transition-colors">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Image */}
      <div 
        className="relative aspect-square bg-gradient-to-br from-primary/5 to-primary/10 cursor-pointer"
        onDoubleClick={handleDoubleClick}
      >
        <div className="absolute inset-0 flex items-center justify-center text-9xl">
          👔
        </div>

        {/* Double Tap Heart Animation */}
        {showHeartAnimation && (
          <motion.div
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <Heart className="w-32 h-32 fill-white text-white drop-shadow-2xl" />
          </motion.div>
        )}
      </div>

      {/* Actions */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <button onClick={handleLike} className="hover:opacity-70 transition-opacity">
              <motion.div whileTap={{ scale: 0.8 }}>
                <Heart 
                  className={`w-7 h-7 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} 
                />
              </motion.div>
            </button>
            <button className="hover:opacity-70 transition-opacity">
              <MessageCircle className="w-7 h-7" />
            </button>
            <button className="hover:opacity-70 transition-opacity">
              <Send className="w-7 h-7" />
            </button>
          </div>
          <button onClick={handleSave} className="hover:opacity-70 transition-opacity">
            <Bookmark className={`w-6 h-6 ${isSaved ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Likes Count */}
        <p className="font-semibold text-sm mb-2">{localLikes} beğeni</p>

        {/* Caption */}
        <div className="mb-2">
          <p className="text-sm">
            <span className="font-semibold mr-2">{post.userName}</span>
            {post.caption}
          </p>
        </div>

        {/* Comments */}
        {post.comments.length > 0 && (
          <div className="mb-2">
            {!showAllComments && post.comments.length > 2 && (
              <button
                onClick={() => setShowAllComments(true)}
                className="text-sm text-muted-foreground mb-2 hover:opacity-70"
              >
                Tüm {post.comments.length} yorumu gör
              </button>
            )}

            {(showAllComments ? post.comments : post.comments.slice(0, 2)).map((c) => (
              <div key={c.id} className="text-sm mb-1">
                <span className="font-semibold mr-2">{c.userName}</span>
                {c.content}
              </div>
            ))}
          </div>
        )}

        {/* Add Comment */}
        <div className="flex items-center gap-2 pt-2 border-t border-border">
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Yorum ekle..."
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground py-2"
            onKeyPress={(e) => e.key === "Enter" && handleComment()}
          />
          {comment.trim() && (
            <button
              onClick={handleComment}
              className="text-sm font-semibold text-primary hover:opacity-70 transition-opacity"
            >
              Paylaş
            </button>
          )}
        </div>
      </div>
    </div>
  )
}