'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useLanguage } from '@/lib/language-context'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import {
  ArrowLeft,
  Heart,
  Star,
  MapPin,
  MessageCircle,
  Share2,
  Loader2,
  Package,
  ShoppingBag,
  Check,
  Play,
  Pause,
  Volume2,
  VolumeX,
  ShieldCheck,
  Truck,
  Award,
  Users,
  Clock,
  ChevronRight,
  Calendar,
  Globe,
  Sparkles,
  Eye,
  TrendingUp,
  RotateCcw,
  ExternalLink,
} from 'lucide-react'

// ── OKLCH Color System (Brand Stage) ────────────────────────────────
const GOLD = 'oklch(0.78 0.14 85)'
const GOLD_LIGHT = 'oklch(0.88 0.10 85)'
const GOLD_BG = 'oklch(0.78 0.14 85 / 0.08)'
const GOLD_BG_HOVER = 'oklch(0.78 0.14 85 / 0.15)'
const SURFACE = 'oklch(0.14 0.005 285)'
const SURFACE_ELEVATED = 'oklch(0.18 0.008 285)'
const TEXT_PRIMARY = 'oklch(0.95 0.005 285)'
const TEXT_SECONDARY = 'oklch(0.65 0.01 285)'
const TEXT_MUTED = 'oklch(0.50 0.01 285)'
const BORDER = 'oklch(0.28 0.01 285)'
const BORDER_LIGHT = 'oklch(0.22 0.01 285)'
const GREEN = 'oklch(0.72 0.19 145)'
const BLUE = 'oklch(0.65 0.15 250)'
const PURPLE = 'oklch(0.55 0.2 300)'
const RED = 'oklch(0.63 0.24 25)'

// ── Interfaces ──────────────────────────────────────────────────────
interface Seller {
  id: string
  user_id: string
  shop_name: string
  shop_description: string | null
  logo_url: string | null
  banner_url: string | null
  address: string | null
  city: string | null
  country: string | null
  phone: string | null
  is_verified: boolean
  status: string
  created_at: string
}

interface Product {
  id: string
  title: string
  description: string | null
  price: number
  original_price: number | null
  category: string
  brand: string | null
  images: string[]
  stock_quantity: number
  created_at: string
}

// ── Helpers ─────────────────────────────────────────────────────────
function formatCount(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return n.toString()
}

function timeSince(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (diff < 30) return `${diff}d`
  if (diff < 365) return `${Math.floor(diff / 30)}mo`
  return `${Math.floor(diff / 365)}y`
}

function getSellerTier(productCount: number, followerCount: number): { name: string; color: string; bg: string } {
  if (productCount >= 50 && followerCount >= 500)
    return { name: 'Platinum', color: 'oklch(0.80 0.08 260)', bg: 'oklch(0.80 0.08 260 / 0.12)' }
  if (productCount >= 20 && followerCount >= 100)
    return { name: 'Gold', color: GOLD, bg: GOLD_BG }
  if (productCount >= 5)
    return { name: 'Silver', color: TEXT_SECONDARY, bg: 'oklch(0.65 0.01 285 / 0.12)' }
  return { name: 'Rising', color: GREEN, bg: 'oklch(0.72 0.19 145 / 0.12)' }
}

// ── Main Component ──────────────────────────────────────────────────
export default function BrandStagePage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const { t } = useLanguage()
  const sellerId = (params.sellerId || params.id) as string
  const userId = session?.user?.id

  // State
  const [seller, setSeller] = useState<Seller | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [activeTab, setActiveTab] = useState<'discover' | 'collections' | 'about'>('discover')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [heroVisible, setHeroVisible] = useState(true)
  const [scrollY, setScrollY] = useState(0)

  const heroRef = useRef<HTMLDivElement>(null)

  // ── Data Loading ────────────────────────────────────────────────
  useEffect(() => {
    if (sellerId) loadShopData()
  }, [sellerId])

  useEffect(() => {
    if (userId && sellerId) checkFollowStatus()
  }, [userId, sellerId])

  // Parallax scroll effect for hero
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY)
      if (heroRef.current) {
        const rect = heroRef.current.getBoundingClientRect()
        setHeroVisible(rect.bottom > 0)
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const loadShopData = async () => {
    try {
      const { data: sellerData, error: sellerError } = await supabase
        .from('sellers')
        .select('*')
        .eq('id', sellerId)
        .single()

      if (sellerError) throw sellerError
      setSeller(sellerData)

      const { data: productsData } = await supabase
        .from('products')
        .select('*')
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false })

      setProducts(productsData || [])

      const { count } = await supabase
        .from('store_followers')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', sellerId)

      setFollowerCount(count || 0)
    } catch (error) {
      console.error('Load shop error:', error)
      router.push('/store')
    } finally {
      setLoading(false)
    }
  }

  const checkFollowStatus = async () => {
    try {
      const { data } = await supabase
        .from('store_followers')
        .select('id')
        .eq('user_id', userId!)
        .eq('seller_id', sellerId)
        .single()
      setIsFollowing(!!data)
    } catch { /* not following */ }
  }

  const handleFollow = async () => {
    if (!userId) { router.push('/auth/signin'); return }
    setFollowLoading(true)
    try {
      if (isFollowing) {
        await supabase.from('store_followers').delete().eq('user_id', userId).eq('seller_id', sellerId)
        setIsFollowing(false)
        setFollowerCount(p => p - 1)
      } else {
        await supabase.from('store_followers').insert({ user_id: userId, seller_id: sellerId })
        setIsFollowing(true)
        setFollowerCount(p => p + 1)
      }
    } catch (e) {
      console.error('Follow error:', e)
    } finally {
      setFollowLoading(false)
    }
  }

  const handleMessage = async () => {
    if (!userId) { router.push('/auth/signin'); return }
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sellerId, productId: null })
      })
      const data = await res.json()
      if (data.conversation) router.push(`/chat/${data.conversation.id}`)
    } catch (e) {
      console.error('Message error:', e)
    }
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: seller?.shop_name, url: window.location.href })
    } else {
      navigator.clipboard.writeText(window.location.href)
    }
  }

  // ── Derived Data ────────────────────────────────────────────────
  const categories = ['all', ...Array.from(new Set(products.map(p => p.category)))]
  const filteredProducts = selectedCategory === 'all'
    ? products
    : products.filter(p => p.category === selectedCategory)

  const memberSince = seller ? new Date(seller.created_at).getFullYear() : ''
  const tier = getSellerTier(products.length, followerCount)

  // Mock stats (realistic ranges)
  const avgRating = 4.3 + Math.random() * 0.6
  const reviewCount = Math.max(products.length * 3, 12) + Math.floor(Math.random() * 20)
  const responseTime = '< 2h'
  const returnRate = (2 + Math.random() * 4).toFixed(1)

  // ── Loading ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'oklch(0.10 0.02 285)',
        gap: 16,
      }}>
        <div style={{
          width: 48, height: 48,
          border: `3px solid oklch(0.78 0.14 85 / 0.2)`,
          borderTopColor: GOLD,
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <span style={{ color: TEXT_SECONDARY, fontSize: 14 }}>Loading brand experience...</span>
      </div>
    )
  }

  if (!seller) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'oklch(0.10 0.02 285)',
        color: TEXT_PRIMARY,
      }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>{(t as any)('shopNotFound') || 'Shop not found'}</h2>
          <button
            onClick={() => router.push('/store')}
            style={{
              padding: '10px 24px', borderRadius: 12,
              background: GOLD, color: '#000', fontWeight: 600,
              border: 'none', cursor: 'pointer',
            }}
          >
            {(t as any)('backToStore') || 'Back to Store'}
          </button>
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════
  return (
    <div style={{ minHeight: '100vh', background: 'oklch(0.10 0.02 285)', paddingBottom: 100 }}>
      {/* ── Sticky Top Bar (appears on scroll) ───────────────────── */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: heroVisible ? 'transparent' : 'oklch(0.10 0.02 285 / 0.92)',
        backdropFilter: heroVisible ? 'none' : 'blur(20px)',
        borderBottom: heroVisible ? 'none' : `1px solid ${BORDER_LIGHT}`,
        transition: 'all 0.3s ease',
      }}>
        <button
          onClick={() => router.back()}
          style={{
            width: 40, height: 40, borderRadius: '50%',
            background: heroVisible ? 'oklch(0 0 0 / 0.4)' : 'oklch(1 0 0 / 0.06)',
            backdropFilter: 'blur(8px)',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <ArrowLeft size={20} style={{ color: '#fff' }} />
        </button>

        {/* Show shop name when scrolled past hero */}
        {!heroVisible && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            animation: 'count-fade-in 0.3s ease',
          }}>
            {seller.logo_url ? (
              <img
                src={seller.logo_url}
                alt={seller.shop_name}
                style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: GOLD_BG,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <ShoppingBag size={14} style={{ color: GOLD }} />
              </div>
            )}
            <span style={{ color: TEXT_PRIMARY, fontWeight: 600, fontSize: 15 }}>
              {seller.shop_name}
            </span>
            {seller.is_verified && (
              <span style={{
                width: 16, height: 16, borderRadius: '50%',
                background: BLUE, display: 'inline-flex',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Check size={10} style={{ color: '#fff' }} />
              </span>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleShare}
            style={{
              width: 40, height: 40, borderRadius: '50%',
              background: heroVisible ? 'oklch(0 0 0 / 0.4)' : 'oklch(1 0 0 / 0.06)',
              backdropFilter: 'blur(8px)',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Share2 size={18} style={{ color: '#fff' }} />
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          HERO AREA - Brand Stage
      ═══════════════════════════════════════════════════════════ */}
      <div
        ref={heroRef}
        style={{
          position: 'relative',
          height: 380,
          overflow: 'hidden',
        }}
      >
        {/* Background - Banner or Gradient */}
        <div style={{
          position: 'absolute',
          inset: 0,
          transform: `translateY(${scrollY * 0.3}px)`,
          transition: 'transform 0.05s linear',
        }}>
          {seller.banner_url ? (
            <img
              src={seller.banner_url}
              alt=""
              style={{
                width: '100%', height: '120%', objectFit: 'cover',
                filter: 'brightness(0.5) saturate(1.2)',
              }}
            />
          ) : (
            <div style={{
              width: '100%', height: '120%',
              background: `
                radial-gradient(ellipse 80% 60% at 30% 40%, oklch(0.20 0.08 85 / 0.6), transparent),
                radial-gradient(ellipse 60% 50% at 80% 60%, oklch(0.15 0.06 300 / 0.4), transparent),
                linear-gradient(160deg, oklch(0.12 0.04 280), oklch(0.08 0.02 260))
              `,
            }} />
          )}
        </div>

        {/* Gradient overlay */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: `
            linear-gradient(to bottom,
              oklch(0.10 0.02 285 / 0) 0%,
              oklch(0.10 0.02 285 / 0.3) 50%,
              oklch(0.10 0.02 285 / 0.95) 85%,
              oklch(0.10 0.02 285) 100%
            )
          `,
        }} />

        {/* Hero Content */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '0 20px 24px',
        }}>
          <div style={{ maxWidth: 800, margin: '0 auto' }}>
            {/* Tier Badge */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 12px',
              borderRadius: 20,
              background: tier.bg,
              marginBottom: 12,
            }}>
              <Award size={12} style={{ color: tier.color }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: tier.color, letterSpacing: 1, textTransform: 'uppercase' }}>
                {tier.name} {(t as any)('seller') || 'Seller'}
              </span>
            </div>

            {/* Shop Name + Verified */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <h1 style={{
                fontSize: 32,
                fontWeight: 800,
                color: TEXT_PRIMARY,
                margin: 0,
                lineHeight: 1.2,
                letterSpacing: -0.5,
              }}>
                {seller.shop_name}
              </h1>
              {seller.is_verified && (
                <span style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: BLUE,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Check size={14} style={{ color: '#fff' }} />
                </span>
              )}
            </div>

            {/* Description / Slogan */}
            {seller.shop_description && (
              <p style={{
                color: TEXT_SECONDARY,
                fontSize: 14,
                lineHeight: 1.6,
                margin: '0 0 16px',
                maxWidth: 500,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}>
                {seller.shop_description}
              </p>
            )}

            {/* Location + Member Since */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              {(seller.city || seller.country) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <MapPin size={13} style={{ color: TEXT_MUTED }} />
                  <span style={{ fontSize: 12, color: TEXT_MUTED }}>
                    {[seller.city, seller.country].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Calendar size={13} style={{ color: TEXT_MUTED }} />
                <span style={{ fontSize: 12, color: TEXT_MUTED }}>
                  {(t as any)('memberSince') || 'Since'} {memberSince}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          BRAND IDENTITY CARD (Glassmorphism)
      ═══════════════════════════════════════════════════════════ */}
      <div style={{ maxWidth: 800, margin: '-40px auto 0', padding: '0 16px', position: 'relative', zIndex: 10 }}>
        <div style={{
          background: 'oklch(0.14 0.01 285 / 0.8)',
          backdropFilter: 'blur(24px) saturate(180%)',
          borderRadius: 20,
          border: `1px solid oklch(1 0 0 / 0.08)`,
          padding: 20,
        }}>
          {/* Top Row: Avatar + Stats + Actions */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            {/* Avatar */}
            <div style={{
              width: 72, height: 72, borderRadius: 18, overflow: 'hidden',
              border: `2px solid oklch(1 0 0 / 0.1)`,
              flexShrink: 0,
              background: SURFACE_ELEVATED,
            }}>
              {seller.logo_url ? (
                <img src={seller.logo_url} alt={seller.shop_name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{
                  width: '100%', height: '100%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: `linear-gradient(135deg, ${GOLD_BG}, oklch(0.55 0.2 300 / 0.1))`,
                }}>
                  <ShoppingBag size={28} style={{ color: GOLD }} />
                </div>
              )}
            </div>

            {/* Stats Row */}
            <div style={{ flex: 1 }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 4,
                textAlign: 'center',
                marginBottom: 14,
              }}>
                {[
                  { value: products.length, label: (t as any)('products') || 'Products' },
                  { value: formatCount(followerCount), label: (t as any)('followers') || 'Followers' },
                  { value: avgRating.toFixed(1), label: (t as any)('rating') || 'Rating' },
                  { value: `${returnRate}%`, label: (t as any)('returnRate') || 'Returns' },
                ].map((stat, i) => (
                  <div key={i}>
                    <div style={{
                      fontSize: 18, fontWeight: 700, color: TEXT_PRIMARY,
                      lineHeight: 1.2,
                    }}>
                      {stat.value}
                    </div>
                    <div style={{ fontSize: 10, color: TEXT_MUTED, marginTop: 2 }}>
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleFollow}
                  disabled={followLoading}
                  style={{
                    flex: 1,
                    height: 38,
                    borderRadius: 10,
                    border: isFollowing ? `1px solid ${GOLD}` : 'none',
                    background: isFollowing ? 'transparent' : `linear-gradient(135deg, ${GOLD}, oklch(0.70 0.16 70))`,
                    color: isFollowing ? GOLD : '#000',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    transition: 'all 0.2s',
                  }}
                >
                  {followLoading ? (
                    <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} />
                  ) : (
                    <Heart size={14} fill={isFollowing ? GOLD : 'none'} />
                  )}
                  {isFollowing
                    ? ((t as any)('following') || 'Following')
                    : ((t as any)('follow') || 'Follow')
                  }
                </button>

                <button
                  onClick={handleMessage}
                  style={{
                    flex: 1,
                    height: 38,
                    borderRadius: 10,
                    border: `1px solid ${BORDER}`,
                    background: 'transparent',
                    color: TEXT_PRIMARY,
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <MessageCircle size={14} />
                  {(t as any)('message') || 'Message'}
                </button>
              </div>
            </div>
          </div>

          {/* Trust Badges Row */}
          <div style={{
            display: 'flex',
            gap: 12,
            marginTop: 16,
            overflowX: 'auto',
            paddingBottom: 2,
          }}>
            {[
              { icon: <ShieldCheck size={13} style={{ color: GREEN }} />, label: (t as any)('buyerProtection') || 'Buyer Protection' },
              { icon: <Truck size={13} style={{ color: BLUE }} />, label: (t as any)('fastShipping') || 'Fast Shipping' },
              { icon: <RotateCcw size={13} style={{ color: GOLD }} />, label: (t as any)('easyReturns') || 'Easy Returns' },
              { icon: <Clock size={13} style={{ color: PURPLE }} />, label: `${responseTime} ${(t as any)('responseTime') || 'Response'}` },
            ].map((badge, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 10px',
                borderRadius: 8,
                background: 'oklch(1 0 0 / 0.04)',
                border: `1px solid oklch(1 0 0 / 0.06)`,
                flexShrink: 0,
                whiteSpace: 'nowrap',
              }}>
                {badge.icon}
                <span style={{ fontSize: 10, color: TEXT_SECONDARY, fontWeight: 500 }}>
                  {badge.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          TAB NAVIGATION
      ═══════════════════════════════════════════════════════════ */}
      <div style={{
        maxWidth: 800,
        margin: '24px auto 0',
        padding: '0 16px',
      }}>
        <div style={{
          display: 'flex',
          background: 'oklch(1 0 0 / 0.04)',
          borderRadius: 14,
          padding: 4,
          gap: 4,
        }}>
          {[
            { id: 'discover' as const, label: (t as any)('storeDiscover') || 'Discover', icon: <Sparkles size={14} /> },
            { id: 'collections' as const, label: (t as any)('storeCollections') || 'Collections', icon: <Package size={14} /> },
            { id: 'about' as const, label: (t as any)('storeAbout') || 'About', icon: <Globe size={14} /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: '10px 0',
                borderRadius: 10,
                border: 'none',
                background: activeTab === tab.id
                  ? `linear-gradient(135deg, ${GOLD}, oklch(0.70 0.16 70))`
                  : 'transparent',
                color: activeTab === tab.id ? '#000' : TEXT_SECONDARY,
                fontWeight: activeTab === tab.id ? 700 : 500,
                fontSize: 13,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                transition: 'all 0.2s',
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          TAB CONTENT
      ═══════════════════════════════════════════════════════════ */}
      <div style={{ maxWidth: 800, margin: '20px auto 0', padding: '0 16px' }}>

        {/* ── DISCOVER TAB ────────────────────────────────────── */}
        {activeTab === 'discover' && (
          <div>
            {/* Category Pills */}
            <div style={{
              display: 'flex',
              gap: 8,
              overflowX: 'auto',
              paddingBottom: 6,
              marginBottom: 16,
            }}>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    padding: '7px 16px',
                    borderRadius: 20,
                    border: selectedCategory === cat ? 'none' : `1px solid ${BORDER}`,
                    background: selectedCategory === cat
                      ? `linear-gradient(135deg, ${GOLD}, oklch(0.70 0.16 70))`
                      : 'transparent',
                    color: selectedCategory === cat ? '#000' : TEXT_SECONDARY,
                    fontWeight: selectedCategory === cat ? 700 : 500,
                    fontSize: 12,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    textTransform: 'capitalize',
                    transition: 'all 0.2s',
                  }}
                >
                  {cat === 'all' ? ((t as any)('all') || 'All') : cat}
                </button>
              ))}
            </div>

            {/* Products Count */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}>
              <span style={{ fontSize: 12, color: TEXT_MUTED }}>
                {filteredProducts.length} {(t as any)('products') || 'Products'}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <TrendingUp size={12} style={{ color: GREEN }} />
                <span style={{ fontSize: 11, color: GREEN, fontWeight: 600 }}>
                  {(t as any)('trending') || 'Trending'}
                </span>
              </div>
            </div>

            {/* Product Grid - Instagram-explore hybrid */}
            {filteredProducts.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '60px 20px',
                borderRadius: 20,
                background: 'oklch(1 0 0 / 0.03)',
                border: `1px solid oklch(1 0 0 / 0.06)`,
              }}>
                <Package size={48} style={{ color: TEXT_MUTED, marginBottom: 12 }} />
                <p style={{ color: TEXT_SECONDARY, fontSize: 15, fontWeight: 600, margin: 0 }}>
                  {(t as any)('noProductsYet') || 'No products yet'}
                </p>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 10,
              }}>
                {filteredProducts.map((product, i) => {
                  const discount = product.original_price && product.original_price > product.price
                    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
                    : 0
                  // Every 5th item spans full width (feature card)
                  const isFeature = i % 5 === 0 && i > 0

                  return (
                    <Link
                      key={product.id}
                      href={`/store/${product.id}`}
                      style={{
                        textDecoration: 'none',
                        gridColumn: isFeature ? '1 / -1' : undefined,
                      }}
                    >
                      <div
                        style={{
                          borderRadius: 16,
                          overflow: 'hidden',
                          background: SURFACE_ELEVATED,
                          border: `1px solid oklch(1 0 0 / 0.06)`,
                          transition: 'transform 0.2s, border-color 0.2s',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.transform = 'translateY(-2px)'
                          e.currentTarget.style.borderColor = 'oklch(1 0 0 / 0.12)'
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.transform = 'translateY(0)'
                          e.currentTarget.style.borderColor = 'oklch(1 0 0 / 0.06)'
                        }}
                      >
                        {/* Image */}
                        <div style={{
                          position: 'relative',
                          aspectRatio: isFeature ? '2 / 1' : '3 / 4',
                          overflow: 'hidden',
                          background: 'oklch(0.12 0.02 280)',
                        }}>
                          {product.images?.[0] && (
                            <img
                              src={product.images[0]}
                              alt={product.title}
                              style={{
                                width: '100%', height: '100%', objectFit: 'cover',
                                transition: 'transform 0.4s',
                              }}
                              onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
                              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                            />
                          )}

                          {/* Discount Badge */}
                          {discount > 0 && (
                            <span style={{
                              position: 'absolute', top: 8, left: 8,
                              background: RED, color: '#fff',
                              fontSize: 10, fontWeight: 700,
                              padding: '3px 8px', borderRadius: 20,
                            }}>
                              -{discount}%
                            </span>
                          )}

                          {/* New Badge */}
                          {i < 3 && (
                            <span style={{
                              position: 'absolute', top: 8, right: 8,
                              background: GREEN, color: '#fff',
                              fontSize: 9, fontWeight: 700,
                              padding: '3px 8px', borderRadius: 20,
                              textTransform: 'uppercase',
                              letterSpacing: 0.5,
                            }}>
                              {(t as any)('new') || 'NEW'}
                            </span>
                          )}

                          {/* Stock warning */}
                          {product.stock_quantity > 0 && product.stock_quantity < 5 && (
                            <div style={{
                              position: 'absolute', bottom: 0, left: 0, right: 0,
                              background: 'oklch(0.63 0.24 25 / 0.85)',
                              padding: '4px 0',
                              textAlign: 'center',
                            }}>
                              <span style={{ fontSize: 10, fontWeight: 700, color: '#fff' }}>
                                {(t as any)('onlyXLeft') || `Only ${product.stock_quantity} left!`}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div style={{ padding: isFeature ? '12px 16px 14px' : '10px 12px 12px' }}>
                          {product.brand && (
                            <span style={{
                              fontSize: 9, fontWeight: 700,
                              textTransform: 'uppercase', letterSpacing: 1,
                              color: GOLD,
                            }}>
                              {product.brand}
                            </span>
                          )}
                          <h3 style={{
                            fontSize: isFeature ? 14 : 12,
                            fontWeight: 600,
                            color: TEXT_PRIMARY,
                            margin: '3px 0 6px',
                            lineHeight: 1.3,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}>
                            {product.title}
                          </h3>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                            <span style={{
                              fontSize: isFeature ? 17 : 15,
                              fontWeight: 700, color: GOLD,
                            }}>
                              {product.price.toFixed(2)} &euro;
                            </span>
                            {product.original_price && product.original_price > product.price && (
                              <span style={{
                                fontSize: 11,
                                color: TEXT_MUTED,
                                textDecoration: 'line-through',
                              }}>
                                {product.original_price.toFixed(2)} &euro;
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── COLLECTIONS TAB ─────────────────────────────────── */}
        {activeTab === 'collections' && (
          <div>
            {/* Group by category */}
            {categories.filter(c => c !== 'all').length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '60px 20px',
                borderRadius: 20,
                background: 'oklch(1 0 0 / 0.03)',
                border: `1px solid oklch(1 0 0 / 0.06)`,
              }}>
                <Package size={48} style={{ color: TEXT_MUTED, marginBottom: 12 }} />
                <p style={{ color: TEXT_SECONDARY, fontSize: 15, fontWeight: 600 }}>
                  {(t as any)('noCollectionsYet') || 'No collections yet'}
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                {categories.filter(c => c !== 'all').map(cat => {
                  const catProducts = products.filter(p => p.category === cat)
                  if (catProducts.length === 0) return null
                  return (
                    <div key={cat}>
                      {/* Collection Header */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 12,
                      }}>
                        <div>
                          <h3 style={{
                            fontSize: 18, fontWeight: 700, color: TEXT_PRIMARY,
                            margin: 0, textTransform: 'capitalize',
                          }}>
                            {cat}
                          </h3>
                          <span style={{ fontSize: 12, color: TEXT_MUTED }}>
                            {catProducts.length} {(t as any)('items') || 'items'}
                          </span>
                        </div>
                        <button
                          onClick={() => { setSelectedCategory(cat); setActiveTab('discover') }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            background: 'none', border: 'none',
                            color: GOLD, fontSize: 12, fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          {(t as any)('viewAll') || 'View All'}
                          <ChevronRight size={14} />
                        </button>
                      </div>

                      {/* Horizontal scroll */}
                      <div style={{
                        display: 'flex',
                        gap: 12,
                        overflowX: 'auto',
                        paddingBottom: 4,
                        scrollSnapType: 'x mandatory',
                      }}>
                        {catProducts.slice(0, 8).map(product => (
                          <Link
                            key={product.id}
                            href={`/store/${product.id}`}
                            style={{ textDecoration: 'none', flexShrink: 0, scrollSnapAlign: 'start' }}
                          >
                            <div style={{
                              width: 150,
                              borderRadius: 14,
                              overflow: 'hidden',
                              background: SURFACE_ELEVATED,
                              border: `1px solid oklch(1 0 0 / 0.06)`,
                              transition: 'transform 0.2s',
                              cursor: 'pointer',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
                            onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
                            >
                              <div style={{
                                aspectRatio: '3 / 4',
                                overflow: 'hidden',
                                background: 'oklch(0.12 0.02 280)',
                              }}>
                                {product.images?.[0] && (
                                  <img
                                    src={product.images[0]}
                                    alt={product.title}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  />
                                )}
                              </div>
                              <div style={{ padding: '8px 10px 10px' }}>
                                <h4 style={{
                                  fontSize: 11, fontWeight: 600, color: TEXT_PRIMARY,
                                  margin: '0 0 4px',
                                  display: '-webkit-box',
                                  WebkitLineClamp: 1,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                }}>
                                  {product.title}
                                </h4>
                                <span style={{ fontSize: 13, fontWeight: 700, color: GOLD }}>
                                  {product.price.toFixed(2)} &euro;
                                </span>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── ABOUT TAB ───────────────────────────────────────── */}
        {activeTab === 'about' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Store Story */}
            <div style={{
              borderRadius: 20,
              overflow: 'hidden',
              background: SURFACE_ELEVATED,
              border: `1px solid oklch(1 0 0 / 0.06)`,
            }}>
              {/* Story Header Image */}
              <div style={{
                height: 140,
                background: seller.banner_url
                  ? `url(${seller.banner_url}) center/cover`
                  : `linear-gradient(135deg, oklch(0.15 0.06 85), oklch(0.12 0.04 300))`,
                position: 'relative',
              }}>
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(to bottom, transparent, oklch(0.18 0.008 285))',
                }} />
                <div style={{
                  position: 'absolute', bottom: 16, left: 20,
                }}>
                  <h3 style={{
                    fontSize: 20, fontWeight: 700, color: TEXT_PRIMARY, margin: 0,
                  }}>
                    {(t as any)('ourStory') || 'Our Story'}
                  </h3>
                </div>
              </div>

              <div style={{ padding: '16px 20px 20px' }}>
                <p style={{
                  color: TEXT_SECONDARY,
                  fontSize: 14,
                  lineHeight: 1.8,
                  margin: 0,
                }}>
                  {seller.shop_description || ((t as any)('noStoryYet') || 'This brand hasn\'t shared their story yet. Follow them to stay updated!')}
                </p>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 10,
            }}>
              {[
                {
                  icon: <Star size={20} style={{ color: 'oklch(0.82 0.17 85)' }} />,
                  value: avgRating.toFixed(1),
                  label: (t as any)('averageRating') || 'Avg Rating',
                  sub: `${reviewCount} ${(t as any)('reviews') || 'reviews'}`,
                  bg: 'oklch(0.82 0.17 85 / 0.08)',
                },
                {
                  icon: <Clock size={20} style={{ color: PURPLE }} />,
                  value: responseTime,
                  label: (t as any)('avgResponseTime') || 'Avg Response',
                  sub: (t as any)('fastResponder') || 'Fast Responder',
                  bg: 'oklch(0.55 0.2 300 / 0.08)',
                },
                {
                  icon: <Truck size={20} style={{ color: BLUE }} />,
                  value: '3-5',
                  label: (t as any)('deliveryDays') || 'Delivery (days)',
                  sub: (t as any)('reliableShipping') || 'Reliable',
                  bg: 'oklch(0.65 0.15 250 / 0.08)',
                },
                {
                  icon: <RotateCcw size={20} style={{ color: GREEN }} />,
                  value: `${returnRate}%`,
                  label: (t as any)('returnRate') || 'Return Rate',
                  sub: (t as any)('lowReturns') || 'Low Returns',
                  bg: 'oklch(0.72 0.19 145 / 0.08)',
                },
              ].map((stat, i) => (
                <div key={i} style={{
                  borderRadius: 16,
                  padding: 16,
                  background: SURFACE_ELEVATED,
                  border: `1px solid oklch(1 0 0 / 0.06)`,
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 12,
                    background: stat.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 10,
                  }}>
                    {stat.icon}
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: TEXT_PRIMARY }}>
                    {stat.value}
                  </div>
                  <div style={{ fontSize: 12, color: TEXT_SECONDARY, fontWeight: 500, marginTop: 2 }}>
                    {stat.label}
                  </div>
                  <div style={{ fontSize: 10, color: TEXT_MUTED, marginTop: 2 }}>
                    {stat.sub}
                  </div>
                </div>
              ))}
            </div>

            {/* Trust & Policies */}
            <div style={{
              borderRadius: 20,
              padding: 20,
              background: SURFACE_ELEVATED,
              border: `1px solid oklch(1 0 0 / 0.06)`,
            }}>
              <h3 style={{
                fontSize: 16, fontWeight: 700, color: TEXT_PRIMARY,
                margin: '0 0 16px',
              }}>
                {(t as any)('trustAndPolicies') || 'Trust & Policies'}
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  {
                    icon: <ShieldCheck size={18} style={{ color: GREEN }} />,
                    title: (t as any)('buyerProtection') || 'Buyer Protection',
                    desc: (t as any)('buyerProtectionDesc') || '100% money-back guarantee if item not as described',
                  },
                  {
                    icon: <RotateCcw size={18} style={{ color: GOLD }} />,
                    title: (t as any)('returnPolicyShort') || '14-Day Returns',
                    desc: (t as any)('returnPolicyBrief') || 'Free returns within 14 days of delivery',
                  },
                  {
                    icon: <Truck size={18} style={{ color: BLUE }} />,
                    title: (t as any)('shippingPolicyShort') || 'Shipping',
                    desc: (t as any)('shippingPolicyBrief') || 'Free shipping on orders over 50€',
                  },
                  {
                    icon: <Award size={18} style={{ color: PURPLE }} />,
                    title: (t as any)('qualityGuarantee') || 'Quality Guarantee',
                    desc: (t as any)('qualityGuaranteeDesc') || 'All products verified for authenticity',
                  },
                ].map((policy, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    gap: 12,
                    alignItems: 'flex-start',
                    padding: '12px 14px',
                    borderRadius: 12,
                    background: 'oklch(1 0 0 / 0.03)',
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: 'oklch(1 0 0 / 0.04)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {policy.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: TEXT_PRIMARY }}>
                        {policy.title}
                      </div>
                      <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 2, lineHeight: 1.4 }}>
                        {policy.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Contact Info */}
            {(seller.city || seller.country) && (
              <div style={{
                borderRadius: 20,
                padding: 20,
                background: SURFACE_ELEVATED,
                border: `1px solid oklch(1 0 0 / 0.06)`,
              }}>
                <h3 style={{
                  fontSize: 16, fontWeight: 700, color: TEXT_PRIMARY,
                  margin: '0 0 16px',
                }}>
                  {(t as any)('contactInfo') || 'Contact'}
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(seller.city || seller.country) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <MapPin size={16} style={{ color: TEXT_MUTED }} />
                      <span style={{ fontSize: 13, color: TEXT_SECONDARY }}>
                        {[seller.city, seller.country].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Calendar size={16} style={{ color: TEXT_MUTED }} />
                    <span style={{ fontSize: 13, color: TEXT_SECONDARY }}>
                      {(t as any)('memberSince') || 'Member since'} {memberSince}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleMessage}
                  style={{
                    width: '100%',
                    marginTop: 16,
                    height: 44,
                    borderRadius: 12,
                    border: `1px solid ${BORDER}`,
                    background: 'transparent',
                    color: TEXT_PRIMARY,
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = GOLD_BG)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <MessageCircle size={16} />
                  {(t as any)('contactSeller') || 'Contact Seller'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════
          GLOBAL STYLES
      ═══════════════════════════════════════════════════════════ */}
      <style jsx global>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes count-fade-in {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        /* Hide scrollbar */
        div::-webkit-scrollbar {
          height: 3px;
        }
        div::-webkit-scrollbar-track {
          background: transparent;
        }
        div::-webkit-scrollbar-thumb {
          background: oklch(0.25 0.01 285);
          border-radius: 3px;
        }
        @media (min-width: 640px) {
          /* 3-column grid on tablet+ for discover */
        }
      `}</style>
    </div>
  )
}
