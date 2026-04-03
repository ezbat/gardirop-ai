"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Heart, Send, Loader2, Trash2 } from "lucide-react"

interface Comment {
  id: string
  userId: string
  body: string
  userName: string
  userImage: string | null
  createdAt: string
}

interface Post {
  id: string
  user_id: string
  caption: string
  image_url: string
  likes_count: number
  comments_count: number
  created_at: string
  user?: {
    id: string
    name: string
    avatar_url: string | null
  }
  liked_by_user?: boolean
}

interface PostDetailModalProps {
  post: Post | null
  isOpen: boolean
  onClose: () => void
  onLikeToggle?: (postId: string, liked: boolean) => void
  onDelete?: (postId: string) => void
}

export default function PostDetailModal({ post, isOpen, onClose, onLikeToggle, onDelete }: PostDetailModalProps) {
  const { data: session } = useSession()
  const userId = session?.user?.id
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState("")
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const commentsEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen && post) {
      loadComments()
    }
  }, [isOpen, post])

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [comments.length])

  const loadComments = async () => {
    if (!post) return
    setLoading(true)
    try {
      const res = await fetch(`/api/posts/${post.id}/comments`)
      const data = await res.json()
      if (data.success) {
        setComments(data.comments || [])
      }
    } catch (error) {
      console.error('Load comments error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitComment = async () => {
    if (!userId || !post || !newComment.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/posts/${post.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: newComment.trim() }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setNewComment("")
      await loadComments()
    } catch (error) {
      console.error('Submit comment error:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmitComment()
    }
  }

  const handleLike = async () => {
    if (!userId || !post) return
    try {
      const res = await fetch(`/api/posts/${post.id}/like`, { method: 'POST' })
      const data = await res.json()
      if (data.success && onLikeToggle) {
        onLikeToggle(post.id, data.liked)
      }
    } catch (error) {
      console.error('Toggle like error:', error)
    }
  }

  const handleDelete = () => {
    if (!post || !onDelete) return
    onDelete(post.id)
  }

  if (!isOpen || !post) return null

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-4xl h-[90vh] glass border border-border rounded-2xl overflow-hidden flex flex-col md:flex-row">
          <div className="md:w-1/2 bg-black flex items-center justify-center">
            <img src={post.image_url} alt={post.caption} className="w-full h-full object-contain" />
          </div>
          <div className="md:w-1/2 flex flex-col">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-primary">
                  {post.user?.avatar_url ? (<img src={post.user.avatar_url} alt={post.user.name} className="w-full h-full object-cover" />) : (<div className="w-full h-full flex items-center justify-center text-white font-bold">{post.user?.name?.[0]?.toUpperCase() || 'U'}</div>)}
                </div>
                <div>
                  <p className="font-bold">{post.user?.name || 'Unknown'}</p>
                  <p className="text-xs text-muted-foreground">{new Date(post.created_at).toLocaleDateString('tr-TR')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {userId === post.user_id && onDelete && (<button onClick={handleDelete} className="w-10 h-10 rounded-full hover:bg-red-500/10 hover:text-red-500 flex items-center justify-center transition-colors" title="Sil"><Trash2 className="w-5 h-5" /></button>)}
                <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-secondary flex items-center justify-center transition-colors"><X className="w-5 h-5" /></button>
              </div>
            </div>
            {post.caption && (<div className="p-4 border-b border-border"><p className="text-sm"><span className="font-bold mr-2">{post.user?.name}</span>{post.caption}</p></div>)}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loading ? (<div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>) : comments.length === 0 ? (<div className="text-center py-8 text-muted-foreground"><p>Noch keine Kommentare. Schreibe den ersten!</p></div>) : (comments.map((comment) => (<div key={comment.id} className="flex gap-3"><div className="w-8 h-8 rounded-full overflow-hidden bg-primary/10 flex-shrink-0">{comment.userImage ? (<img src={comment.userImage} alt={comment.userName} className="w-full h-full object-cover" />) : (<div className="w-full h-full flex items-center justify-center text-xs">{comment.userName?.[0]?.toUpperCase() || 'U'}</div>)}</div><div className="flex-1"><p className="text-sm"><span className="font-bold mr-2">{comment.userName}</span>{comment.body}</p><p className="text-xs text-muted-foreground mt-1">{new Date(comment.createdAt).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</p></div></div>)))}
              <div ref={commentsEndRef} />
            </div>
            <div className="border-t border-border">
              <div className="p-4 flex items-center gap-4">
                <button onClick={handleLike} className="flex items-center gap-2 hover:text-red-500 transition-colors"><Heart className="w-6 h-6" fill={post.liked_by_user ? "currentColor" : "none"} color={post.liked_by_user ? "#ef4444" : "currentColor"} /><span className="font-semibold">{post.likes_count}</span></button>
              </div>
              <div className="p-4 pt-0 flex gap-2">
                <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyPress={handleKeyPress} placeholder="Kommentar schreiben..." className="flex-1 px-4 py-2 glass border border-border rounded-xl outline-none focus:border-primary" disabled={submitting || !userId} />
                <button onClick={handleSubmitComment} disabled={submitting || !newComment.trim() || !userId} className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity">{submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}</button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}