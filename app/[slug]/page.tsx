/**
 * Premium Storefront — wearo.com/{slug}
 *
 * Server-rendered seller storefront. The crown jewel of WEARO.
 * This is what creators put in their bio. It must feel premium.
 *
 * Architecture:
 *  - Server component for initial data + SEO metadata
 *  - Client island for interactive product grid (search/filter/sort)
 *  - Dark theme by default (WEARO brand identity)
 *  - Bio-link ready: clean URL, OG tags, share affordance
 */

import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { resolveSellerBySlug, getStorefrontSettings } from '@/lib/storefront'
import { supabaseAdmin } from '@/lib/supabase-admin'
import StorefrontClient from './storefront-client'

// ─── Types ──────────────────────────────────────────────────────────────────────

interface SellerData {
  id: string
  shopName: string
  shopSlug: string
  shopDescription: string | null
  logoUrl: string | null
  bannerUrl: string | null
  city: string | null
  country: string | null
  isVerified: boolean
  memberSince: string
  followerCount: number
}

interface PageProps {
  params: Promise<{ slug: string }>
}

// ─── Data fetching ──────────────────────────────────────────────────────────────

async function getSellerData(slug: string): Promise<SellerData | null> {
  const seller = await resolveSellerBySlug(slug)
  if (!seller) return null

  return {
    id: seller.id,
    shopName: seller.shop_name,
    shopSlug: seller.shop_slug ?? slug,
    shopDescription: seller.shop_description,
    logoUrl: seller.logo_url,
    bannerUrl: seller.banner_url,
    city: seller.city,
    country: seller.country,
    isVerified: seller.is_verified ?? false,
    memberSince: seller.created_at,
    followerCount: seller.follower_count ?? 0,
  }
}

async function getProductCount(sellerId: string): Promise<number> {
  const { count } = await supabaseAdmin
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('seller_id', sellerId)
    .eq('moderation_status', 'approved')
    .eq('status', 'active')
    .gt('stock_quantity', 0)

  return count ?? 0
}

// ─── Metadata (SSR — OG tags for bio-link sharing) ──────────────────────────────

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const seller = await getSellerData(slug)

  if (!seller) {
    return { title: 'Store nicht gefunden — WEARO' }
  }

  const settings = await getStorefrontSettings(seller.id)
  const title = settings.seoTitle ?? `${seller.shopName} — WEARO`
  const description =
    settings.seoDescription ??
    seller.shopDescription ??
    `Entdecke ${seller.shopName} auf WEARO — Premium Mode & Lifestyle.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      url: `https://wearo.com/${seller.shopSlug}`,
      ...(seller.logoUrl ? { images: [{ url: seller.logoUrl, width: 400, height: 400 }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(seller.bannerUrl ? { images: [seller.bannerUrl] } : {}),
    },
  }
}

// ─── Page (Server Component) ────────────────────────────────────────────────────

export default async function StorefrontPage({ params }: PageProps) {
  const { slug } = await params
  const seller = await getSellerData(slug)

  if (!seller) notFound()

  const [settings, productCount] = await Promise.all([
    getStorefrontSettings(seller.id),
    getProductCount(seller.id),
  ])

  return (
    <StorefrontClient
      seller={seller}
      settings={settings}
      initialProductCount={productCount}
    />
  )
}
