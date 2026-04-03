'use client'

/**
 * CommunityFeed — Social-commerce feed preview on homepage.
 *
 * Shows 4-6 recent seller posts in a masonry-ish card layout.
 * This is what makes the homepage feel like a social platform
 * rather than a product catalog.
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, useReducedMotion } from 'framer-motion'
import { Heart, MessageCircle, BadgeCheck, Play, ArrowRight, Megaphone } from 'lucide-react'

interface FeedPost {
  id: string
  caption: string
  image_url: string | null
  video_url: string | null
  is_video: boolean
  likes_count: number
  comments_count: number
  seller_name: string
  seller_logo: string | null
  seller_verified: boolean
  is_promoted: boolean
  created_at: string
}

export function CommunityFeed() {
  const prefersReduced = useReducedMotion()
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/feed?limit=6&filter=trending')
      .then(r => r.json())
      .then(d => {
        if (d.success && d.posts?.length) {
          setPosts(d.posts.slice(0, 6).map((p: any) => ({
            id: p.id,
            caption: p.caption || '',
            image_url: p.image_url,
            video_url: p.video_url,
            is_video: p.is_video || false,
            likes_count: p.likes_count || 0,
            comments_count: p.comments_count || 0,
            seller_name: p.seller?.shop_name || p.user?.name || 'Seller',
            seller_logo: p.seller?.logo_url || p.user?.image || null,
            seller_verified: p.seller?.is_verified || false,
            is_promoted: p.is_promoted || false,
            created_at: p.created_at,
          })))
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (!loading && posts.length === 0) return null

  return (
    <section
      className="py-12 relative overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #0B0D14 0%, #0E1118 100%)' }}
    >
      {/* Subtle ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse, rgba(217,119,6,0.04) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-10">
        {/* Header */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex -space-x-1.5">
                {['#D97706', '#EC4899', '#6366F1'].map((c, i) => (
                  <div key={i} className="w-4 h-4 rounded-full border-2"
                    style={{ background: c, borderColor: '#0B0D14' }} />
                ))}
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.15em]"
                style={{ color: 'rgba(255,255,255,0.55)' }}>
                Community
              </span>
            </div>
            <h2 className="text-lg font-bold" style={{ color: '#FFFFFF' }}>
              Frisch aus der Community
            </h2>
            <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Posts und Inspirationen von unseren Sellern
            </p>
          </div>
          <Link
            href="/explore"
            className="flex items-center gap-1.5 text-xs font-semibold transition-opacity hover:opacity-70"
            style={{ color: '#D97706' }}
          >
            Alle ansehen <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Posts grid — masonry-like with varied heights */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i}
                className="rounded-2xl animate-pulse"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  height: i % 3 === 0 ? 320 : 260,
                }}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {posts.map((post, i) => {
              // Vary card heights for visual rhythm
              const isTall = i % 3 === 0
              return (
                <motion.div
                  key={post.id}
                  initial={prefersReduced ? {} : { opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-20px' }}
                  transition={{ duration: 0.3, delay: i * 0.06 }}
                >
                  <Link
                    href="/explore"
                    className="group relative block rounded-2xl overflow-hidden
                      transition-all duration-300 hover:scale-[1.02]
                      hover:shadow-[0_0_40px_rgba(217,119,6,0.06)]"
                    style={{
                      height: isTall ? 340 : 260,
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.05)',
                    }}
                  >
                    {/* Image */}
                    {post.image_url && (
                      <Image
                        src={post.image_url}
                        alt={post.caption?.slice(0, 40) || 'Post'}
                        fill
                        sizes="(max-width: 768px) 50vw, 33vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                      />
                    )}

                    {/* Promoted badge */}
                    {post.is_promoted && (
                      <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold text-white/80"
                        style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}>
                        <Megaphone className="w-2.5 h-2.5" />
                        Gesponsert
                      </div>
                    )}

                    {/* Video indicator */}
                    {post.is_video && (
                      <div className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center"
                        style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}>
                        <Play className="w-3.5 h-3.5 fill-white" style={{ color: '#FFF' }} />
                      </div>
                    )}

                    {/* Bottom overlay */}
                    <div className="absolute inset-x-0 bottom-0 p-3"
                      style={{
                        background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)',
                      }}
                    >
                      {/* Seller info */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0"
                          style={{ background: 'rgba(255,255,255,0.1)' }}>
                          {post.seller_logo ? (
                            <Image src={post.seller_logo} alt="" width={24} height={24}
                              className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[9px] font-bold text-white">
                              {post.seller_name?.charAt(0) || 'S'}
                            </div>
                          )}
                        </div>
                        <span className="text-[11px] font-semibold text-white/80 line-clamp-1">
                          {post.seller_name}
                        </span>
                        {post.seller_verified && (
                          <BadgeCheck className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#3B82F6' }} />
                        )}
                      </div>

                      {/* Engagement */}
                      <div className="flex items-center gap-3 text-[10px]" style={{ color: 'rgba(255,255,255,0.65)' }}>
                        <span className="flex items-center gap-1">
                          <Heart className="w-3 h-3" /> {post.likes_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="w-3 h-3" /> {post.comments_count}
                        </span>
                      </div>
                    </div>

                    {/* No-image fallback */}
                    {!post.image_url && (
                      <div className="absolute inset-0 flex items-center justify-center p-4">
                        <p className="text-sm text-center line-clamp-4" style={{ color: 'rgba(255,255,255,0.65)' }}>
                          {post.caption || 'Neuer Beitrag'}
                        </p>
                      </div>
                    )}
                  </Link>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
