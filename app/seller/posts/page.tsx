'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ImagePlus, Trash2, Eye, Heart, MessageCircle, BarChart3,
  Loader2, Plus, Search, Megaphone, TrendingUp,
} from 'lucide-react'

// ── Seller dark theme tokens ─────────────────────────────────────
const BG       = '#0B0D14'
const SURFACE  = '#111520'
const ELEVATED = '#1A1E2E'
const BORDER   = '#252A3C'
const TEXT1    = '#F1F1F4'
const TEXT2    = '#9BA3B5'
const ACCENT   = '#D97706'

interface SellerPost {
  id: string
  caption: string
  image_url: string
  video_url: string | null
  is_video: boolean
  post_type: string
  linked_product_ids: string[]
  hashtags: string[]
  is_promoted: boolean
  likes_count: number
  comments_count: number
  view_count: number
  engagement_score: number
  created_at: string
}

export default function SellerPostsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [posts, setPosts] = useState<SellerPost[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/seller/posts?limit=50')
      const data = await res.json()
      if (data.success) {
        setPosts(data.posts || [])
        setTotal(data.total || 0)
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id: string) => {
    if (!confirm('Diesen Beitrag wirklich löschen?')) return
    setDeleting(id)
    try {
      const res = await fetch(`/api/seller/posts/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setPosts(prev => prev.filter(p => p.id !== id))
        setTotal(prev => prev - 1)
      }
    } catch (e) { console.error(e) }
    finally { setDeleting(null) }
  }

  const filtered = search
    ? posts.filter(p =>
        p.caption.toLowerCase().includes(search.toLowerCase()) ||
        p.hashtags.some(t => t.includes(search.toLowerCase()))
      )
    : posts

  // KPI calculations
  const totalLikes = posts.reduce((s, p) => s + p.likes_count, 0)
  const totalViews = posts.reduce((s, p) => s + (p.view_count || 0), 0)
  const totalComments = posts.reduce((s, p) => s + p.comments_count, 0)
  const promoted = posts.filter(p => p.is_promoted).length

  return (
    <div style={{ minHeight: '100vh', background: BG, color: TEXT1 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800 }}>Beiträge</h1>
            <p style={{ color: TEXT2, fontSize: 14, marginTop: 4 }}>
              {total} Beiträge insgesamt
            </p>
          </div>
          <Link
            href="/seller/posts/create"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 20px', borderRadius: 10, fontWeight: 700, fontSize: 14,
              background: ACCENT, color: '#fff', textDecoration: 'none',
            }}
          >
            <Plus style={{ width: 16, height: 16 }} /> Neuer Beitrag
          </Link>
        </div>

        {/* KPI Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Beiträge', value: total, icon: ImagePlus },
            { label: 'Aufrufe', value: totalViews, icon: Eye },
            { label: 'Likes', value: totalLikes, icon: Heart },
            { label: 'Beworben', value: promoted, icon: Megaphone },
          ].map(kpi => (
            <div key={kpi.label} style={{
              background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12,
              padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, background: `${ACCENT}18`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <kpi.icon style={{ width: 18, height: 18, color: ACCENT }} />
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800 }}>{kpi.value.toLocaleString('de-DE')}</div>
                <div style={{ fontSize: 11, color: TEXT2, fontWeight: 600 }}>{kpi.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 20 }}>
          <Search style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: TEXT2 }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Beiträge durchsuchen..."
            style={{
              width: '100%', padding: '10px 14px 10px 40px', borderRadius: 10,
              background: SURFACE, border: `1px solid ${BORDER}`, color: TEXT1,
              fontSize: 14, outline: 'none',
            }}
          />
        </div>

        {/* Posts Grid */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
            <Loader2 style={{ width: 32, height: 32, color: ACCENT, animation: 'spin 1s linear infinite' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '80px 20px',
            background: SURFACE, borderRadius: 16, border: `1px solid ${BORDER}`,
          }}>
            <ImagePlus style={{ width: 48, height: 48, color: TEXT2, margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Noch keine Beiträge</h3>
            <p style={{ color: TEXT2, fontSize: 14, marginBottom: 20 }}>
              Erstelle deinen ersten Beitrag, um dein Geschäft zu bewerben.
            </p>
            <Link
              href="/seller/posts/create"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '10px 20px', borderRadius: 10, fontWeight: 700,
                background: ACCENT, color: '#fff', textDecoration: 'none', fontSize: 14,
              }}
            >
              <Plus style={{ width: 14, height: 14 }} /> Ersten Beitrag erstellen
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            {filtered.map(post => (
              <div key={post.id} style={{
                background: SURFACE, borderRadius: 14, border: `1px solid ${BORDER}`,
                overflow: 'hidden', position: 'relative',
              }}>
                {/* Image */}
                <div style={{ position: 'relative', aspectRatio: '4/3' }}>
                  <img
                    src={post.image_url}
                    alt={post.caption}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  {post.is_promoted && (
                    <div style={{
                      position: 'absolute', top: 8, left: 8,
                      background: ACCENT, color: '#fff', fontSize: 10, fontWeight: 700,
                      padding: '3px 8px', borderRadius: 6,
                    }}>
                      BEWORBEN
                    </div>
                  )}
                  {post.is_video && (
                    <div style={{
                      position: 'absolute', top: 8, right: 8,
                      background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: 10, fontWeight: 700,
                      padding: '3px 8px', borderRadius: 6,
                    }}>
                      VIDEO
                    </div>
                  )}
                </div>

                {/* Content */}
                <div style={{ padding: '14px 16px' }}>
                  <p style={{
                    fontSize: 13, color: TEXT1, marginBottom: 10,
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>
                    {post.caption || 'Kein Text'}
                  </p>

                  {/* Stats row */}
                  <div style={{ display: 'flex', gap: 14, marginBottom: 12 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: TEXT2 }}>
                      <Eye style={{ width: 13, height: 13 }} /> {post.view_count || 0}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: TEXT2 }}>
                      <Heart style={{ width: 13, height: 13 }} /> {post.likes_count}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: TEXT2 }}>
                      <MessageCircle style={{ width: 13, height: 13 }} /> {post.comments_count}
                    </span>
                  </div>

                  {/* Hashtags */}
                  {post.hashtags.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                      {post.hashtags.slice(0, 3).map(tag => (
                        <span key={tag} style={{
                          fontSize: 11, fontWeight: 600, color: ACCENT,
                          background: `${ACCENT}14`, padding: '2px 8px', borderRadius: 6,
                        }}>
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => handleDelete(post.id)}
                      disabled={deleting === post.id}
                      style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        padding: '8px 0', borderRadius: 8, fontSize: 12, fontWeight: 600,
                        background: 'rgba(239,68,68,0.12)', color: '#EF4444',
                        border: 'none', cursor: 'pointer', opacity: deleting === post.id ? 0.5 : 1,
                      }}
                    >
                      <Trash2 style={{ width: 13, height: 13 }} /> Löschen
                    </button>
                  </div>

                  <div style={{ fontSize: 11, color: TEXT2, marginTop: 10 }}>
                    {new Date(post.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
