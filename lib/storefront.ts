/**
 * Storefront settings resolution helper.
 *
 * Fetches storefront_settings for a seller, falling back to
 * sensible defaults if the table or row doesn't exist yet.
 */

import { supabaseAdmin } from '@/lib/supabase-admin'

export interface StorefrontSettings {
  headline: string | null
  subHeadline: string | null
  bannerUrl: string | null
  themePreset: 'dark' | 'light' | 'warm' | 'minimal' | 'midnight' | 'forest'
  accentColor: string
  layoutStyle: 'grid' | 'list' | 'masonry'
  productsPerRow: number
  showBrand: boolean
  showPrices: boolean
  showRatings: boolean
  featuredProductIds: string[]
  socialInstagram: string | null
  socialTiktok: string | null
  socialYoutube: string | null
  socialWebsite: string | null
  seoTitle: string | null
  seoDescription: string | null
}

const DEFAULTS: StorefrontSettings = {
  headline: null,
  subHeadline: null,
  bannerUrl: null,
  themePreset: 'dark',
  accentColor: '#D97706',
  layoutStyle: 'grid',
  productsPerRow: 4,
  showBrand: true,
  showPrices: true,
  showRatings: true,
  featuredProductIds: [],
  socialInstagram: null,
  socialTiktok: null,
  socialYoutube: null,
  socialWebsite: null,
  seoTitle: null,
  seoDescription: null,
}

export async function getStorefrontSettings(sellerId: string): Promise<StorefrontSettings> {
  try {
    const { data, error } = await supabaseAdmin
      .from('storefront_settings')
      .select('*')
      .eq('seller_id', sellerId)
      .maybeSingle()

    if (error || !data) return { ...DEFAULTS }

    return {
      headline: data.headline ?? null,
      subHeadline: data.sub_headline ?? null,
      bannerUrl: data.banner_url ?? null,
      themePreset: (['dark', 'light', 'warm', 'minimal', 'midnight', 'forest'].includes(data.theme_preset) ? data.theme_preset : 'dark') as StorefrontSettings['themePreset'],
      accentColor: data.accent_color ?? DEFAULTS.accentColor,
      layoutStyle: (['grid', 'list', 'masonry'].includes(data.layout_style) ? data.layout_style : 'grid') as StorefrontSettings['layoutStyle'],
      productsPerRow: data.products_per_row ?? 4,
      showBrand: data.show_brand ?? true,
      showPrices: data.show_prices ?? true,
      showRatings: data.show_ratings ?? true,
      featuredProductIds: Array.isArray(data.featured_product_ids) ? data.featured_product_ids : [],
      socialInstagram: data.social_instagram ?? null,
      socialTiktok: data.social_tiktok ?? null,
      socialYoutube: data.social_youtube ?? null,
      socialWebsite: data.social_website ?? null,
      seoTitle: data.seo_title ?? null,
      seoDescription: data.seo_description ?? null,
    }
  } catch {
    // Table may not exist yet — return defaults
    return { ...DEFAULTS }
  }
}

/**
 * Resolve a seller by their shop_slug.
 * Returns null if slug not found or seller not operational.
 */
export async function resolveSellerBySlug(slug: string) {
  const { data, error } = await supabaseAdmin
    .from('sellers')
    .select('id, shop_name, shop_slug, shop_description, logo_url, banner_url, city, country, is_verified, status, created_at, follower_count')
    .eq('shop_slug', slug.toLowerCase())
    .maybeSingle()

  if (error || !data) return null
  if (!['active', 'approved'].includes(data.status)) return null

  return data
}
