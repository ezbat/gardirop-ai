"use client"

import { motion } from "framer-motion"
import { Heart, MessageCircle } from "lucide-react"
import type { SocialPost } from "@/lib/storage"

interface ExploreGridProps {
  posts: SocialPost[]
  onPostClick: (post: SocialPost) => void
}

export default function ExploreGrid({ posts, onPostClick }: ExploreGridProps) {
  if (posts.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-9xl mb-6">🔍</div>
        <h3 className="text-2xl font-bold mb-3">Henüz paylaşım yok</h3>
        <p className="text-muted-foreground">
          İlk kombinini paylaş ve keşfedilmeye başla!
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-1">
      {posts.map((post, index) => (
        <motion.button
          key={post.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.02 }}
          onClick={() => onPostClick(post)}
          className="aspect-square bg-gradient-to-br from-primary/5 to-primary/10 rounded-sm overflow-hidden relative group cursor-pointer"
        >
          {/* Post Content */}
          <div className="absolute inset-0 flex items-center justify-center text-6xl md:text-7xl">
            👔
          </div>

          {/* Hover Overlay - Instagram tarzı */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
            <div className="flex items-center gap-6 text-white">
              {/* Likes */}
              <div className="flex items-center gap-2">
                <Heart className="w-7 h-7 fill-white" />
                <span className="font-bold text-lg">{post.likes}</span>
              </div>

              {/* Comments */}
              <div className="flex items-center gap-2">
                <MessageCircle className="w-7 h-7 fill-white" />
                <span className="font-bold text-lg">{post.comments.length}</span>
              </div>
            </div>
          </div>
        </motion.button>
      ))}
    </div>
  )
}