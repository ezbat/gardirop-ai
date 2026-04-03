'use client'

/**
 * SellerContentBlock — Storefront social-commerce content section.
 *
 * Shows a seller's recent posts below the product grid.
 * Commerce-supporting: product tags are clickable, content supports commerce.
 * Premium, not cluttered. Max 6 posts in a clean grid.
 */

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Heart, MessageCircle, ShoppingBag, Play, ArrowRight } from 'lucide-react'

interface ContentPost {
  id: string
  caption: string
  image_url: string | null
  is_video: boolean
  likes_count: number
  comments_count: number
  linked_product_ids: string[]
  created_at: string
}

interface SellerContentBlockProps {
  sellerId: string
  sellerSlug: string
  accentColor: string
}

export function SellerContentBlock({ sellerId, sellerSlug, accentColor }: SellerContentBlockProps) {
  const [posts, setPosts] = useState<ContentPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/feed?seller=${sellerId}&limit=6&filter=new`)
      .then(r => r.json())
      .then(d => {
        if (d.success && d.posts?.length) {
          setPosts(d.posts.slice(0, 6).map((p: any) => ({
            id: p.id,
            caption: p.caption || '',
            image_url: p.image_url,
            is_video: p.is_video || false,
            likes_count: p.likes_count || 0,
            comments_count: p.comments_count || 0,
            linked_product_ids: p.linked_product_ids || [],
            created_at: p.created_at,
          })))
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [sellerId])

  // Don't render if no posts
  if (!loading && posts.length === 0) return null

  return (
    <section className="py-10 sm:py-14" style={{ background: '#0E0E10' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Section header */}
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white">
              Neueste Beiträge
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Inspiration & Updates
            </p>
          </div>
          <Link
            href="/explore"
            className="flex items-center gap-1 text-xs font-semibold transition-opacity hover:opacity-70"
            style={{ color: accentColor }}
          >
            Alle <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Posts grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl animate-pulse"
                style={{ background: 'rgba(255,255,255,0.04)', aspectRatio: '4/5' }}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {posts.map((post) => (
              <Link
                key={post.id}
                href="/explore"
                className="group relative block rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02]"
                style={{
                  aspectRatio: '4/5',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                {/* Image */}
                {post.image_url && (
                  <Image
                    src={post.image_url}
                    alt={post.caption?.slice(0, 40) || 'Beitrag'}
                    fill
                    sizes="(max-width: 640px) 50vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                )}

                {/* Video indicator */}
                {post.is_video && (
                  <div
                    className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}
                  >
                    <Play className="w-3 h-3 fill-white text-white" />
                  </div>
                )}

                {/* Product tag indicator */}
                {post.linked_product_ids.length > 0 && (
                  <div
                    className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold text-white"
                    style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}
                  >
                    <ShoppingBag className="w-3 h-3" />
                    {post.linked_product_ids.length}
                  </div>
                )}

                {/* Bottom overlay */}
                <div
                  className="absolute inset-x-0 bottom-0 p-3"
                  style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)' }}
                >
                  {/* Caption preview */}
                  {post.caption && (
                    <p className="text-[11px] text-white/70 line-clamp-2 mb-2">
                      {post.caption}
                    </p>
                  )}

                  {/* Engagement */}
                  <div className="flex items-center gap-3 text-[10px]" style={{ color: 'rgba(255,255,255,0.6)' }}>
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
                    <p className="text-sm text-center line-clamp-4" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      {post.caption || 'Neuer Beitrag'}
                    </p>
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
