"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Star, ThumbsUp, CheckCircle, Loader2, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Review {
  id: string
  rating: number
  title: string | null
  comment: string | null
  images: string[]
  is_verified_purchase: boolean
  helpful_count: number
  created_at: string
  users: {
    id: string
    name: string
    avatar_url: string | null
  }
}

interface ProductReviewsProps {
  productId: string
  averageRating?: number
  reviewCount?: number
}

export default function ProductReviews({ productId, averageRating = 0, reviewCount = 0 }: ProductReviewsProps) {
  const { data: session } = useSession()
  const userId = session?.user?.id

  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [showWriteReview, setShowWriteReview] = useState(false)
  const [sortBy, setSortBy] = useState('recent')
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)

  // Write review state
  const [newRating, setNewRating] = useState(5)
  const [newTitle, setNewTitle] = useState('')
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadReviews()
  }, [productId, sortBy])

  const loadReviews = async (loadMore = false) => {
    try {
      setLoading(!loadMore)
      const currentOffset = loadMore ? offset : 0

      const response = await fetch(`/api/reviews?productId=${productId}&limit=10&offset=${currentOffset}&sortBy=${sortBy}`)

      if (!response.ok) {
        console.error('Reviews API error:', response.status)
        setReviews([])
        return
      }

      const data = await response.json()

      if (loadMore) {
        setReviews([...reviews, ...(data.reviews || [])])
      } else {
        setReviews(data.reviews || [])
      }

      setHasMore(data.hasMore || false)
      setOffset(currentOffset + 10)
    } catch (error) {
      console.error('Load reviews error:', error)
      setReviews([])
    } finally {
      setLoading(false)
    }
  }

  const submitReview = async () => {
    if (!userId || !newComment.trim()) {
      alert('Lütfen yorum yazın!')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          userId,
          rating: newRating,
          title: newTitle.trim() || null,
          comment: newComment.trim()
        })
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.error || 'Yorum eklenemedi!')
        return
      }

      // Add new review to top
      setReviews([data.review, ...reviews])
      setShowWriteReview(false)
      setNewRating(5)
      setNewTitle('')
      setNewComment('')
      alert('✅ Yorumunuz eklendi!')
    } catch (error) {
      console.error('Submit review error:', error)
      alert('Bir hata oluştu!')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleHelpful = async (reviewId: string) => {
    if (!userId) {
      alert('Giriş yapmalısınız!')
      return
    }

    try {
      const response = await fetch('/api/reviews/helpful', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId, userId })
      })

      const data = await response.json()

      // Update review helpful count
      setReviews(reviews.map(review =>
        review.id === reviewId
          ? { ...review, helpful_count: review.helpful_count + (data.voted ? 1 : -1) }
          : review
      ))
    } catch (error) {
      console.error('Toggle helpful error:', error)
    }
  }

  const renderStars = (rating: number, size = 'w-5 h-5') => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <Star
            key={star}
            className={`${size} ${star <= rating ? 'fill-yellow-500 text-yellow-500' : 'text-gray-300'}`}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Overall Rating */}
      <div className="glass border border-border rounded-2xl p-8">
        <h2 className="text-3xl font-bold mb-6">Değerlendirmeler</h2>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Rating Summary */}
          <div className="flex-shrink-0 text-center">
            <div className="text-6xl font-bold text-primary mb-2">
              {averageRating.toFixed(1)}
            </div>
            {renderStars(Math.round(averageRating), 'w-8 h-8')}
            <p className="text-sm text-muted-foreground mt-2">{reviewCount} değerlendirme</p>
          </div>

          {/* Write Review Button */}
          <div className="flex-1 flex items-center justify-center md:justify-start">
            {userId ? (
              <button
                onClick={() => setShowWriteReview(!showWriteReview)}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity"
              >
                {showWriteReview ? 'İptal Et' : 'Yorum Yaz'}
              </button>
            ) : (
              <p className="text-muted-foreground">Yorum yapmak için giriş yapın</p>
            )}
          </div>
        </div>

        {/* Write Review Form */}
        <AnimatePresence>
          {showWriteReview && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6 pt-6 border-t border-border"
            >
              <div className="space-y-4">
                {/* Rating */}
                <div>
                  <label className="block font-semibold mb-2">Puanınız *</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        onClick={() => setNewRating(star)}
                        className="hover:scale-110 transition-transform"
                      >
                        <Star
                          className={`w-8 h-8 ${star <= newRating ? 'fill-yellow-500 text-yellow-500' : 'text-gray-300'}`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block font-semibold mb-2">Başlık</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Kısaca özetleyin..."
                    className="w-full px-4 py-3 glass border border-border rounded-xl focus:border-primary outline-none"
                    maxLength={200}
                  />
                </div>

                {/* Comment */}
                <div>
                  <label className="block font-semibold mb-2">Yorumunuz *</label>
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Ürün hakkında düşüncelerinizi paylaşın..."
                    className="w-full px-4 py-3 glass border border-border rounded-xl focus:border-primary outline-none min-h-[120px]"
                    required
                  />
                </div>

                {/* Submit */}
                <button
                  onClick={submitReview}
                  disabled={submitting || !newComment.trim()}
                  className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
                  {submitting ? 'Gönderiliyor...' : 'Yorumu Gönder'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sort & Filters */}
      <div className="flex gap-3">
        {['recent', 'helpful', 'rating'].map(sort => (
          <button
            key={sort}
            onClick={() => setSortBy(sort)}
            className={`px-4 py-2 rounded-xl font-medium transition-colors ${
              sortBy === sort
                ? 'bg-primary text-primary-foreground'
                : 'glass border border-border hover:border-primary'
            }`}
          >
            {sort === 'recent' && 'En Yeni'}
            {sort === 'helpful' && 'En Faydalı'}
            {sort === 'rating' && 'En Yüksek Puan'}
          </button>
        ))}
      </div>

      {/* Reviews List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : !reviews || reviews.length === 0 ? (
        <div className="text-center py-12 glass border border-border rounded-2xl">
          <p className="text-muted-foreground">Henüz değerlendirme yok. İlk yorumu siz yapın!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map(review => (
            <div key={review.id} className="glass border border-border rounded-2xl p-6">
              {/* User Info */}
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white font-bold">
                  {review.users.avatar_url ? (
                    <img src={review.users.avatar_url} alt={review.users.name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    review.users.name[0].toUpperCase()
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold">{review.users.name}</p>
                    {review.is_verified_purchase && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-green-500/10 text-green-600 text-xs rounded-full">
                        <CheckCircle className="w-3 h-3" />
                        Onaylı Alışveriş
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {new Date(review.created_at).toLocaleDateString('tr-TR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              {/* Rating */}
              <div className="mb-3">
                {renderStars(review.rating)}
              </div>

              {/* Title */}
              {review.title && (
                <h4 className="font-bold text-lg mb-2">{review.title}</h4>
              )}

              {/* Comment */}
              {review.comment && (
                <p className="text-muted-foreground mb-4">{review.comment}</p>
              )}

              {/* Images */}
              {review.images && review.images.length > 0 && (
                <div className="flex gap-2 mb-4">
                  {review.images.map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt={`Review ${idx + 1}`}
                      className="w-20 h-20 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                    />
                  ))}
                </div>
              )}

              {/* Helpful Button */}
              <button
                onClick={() => toggleHelpful(review.id)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <ThumbsUp className="w-4 h-4" />
                Faydalı ({review.helpful_count})
              </button>
            </div>
          ))}

          {/* Load More */}
          {hasMore && (
            <button
              onClick={() => loadReviews(true)}
              className="w-full px-6 py-3 glass border border-border rounded-xl font-semibold hover:border-primary transition-colors flex items-center justify-center gap-2"
            >
              Daha Fazla Göster
              <ChevronDown className="w-5 h-5" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
