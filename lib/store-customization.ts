import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase-admin'

// ═══════════════════════════════════════════════════════════
// WEARO Store Customization Engine
// Theme management for seller storefronts.
// Reads/writes sellers.theme_config (JSONB column).
// ═══════════════════════════════════════════════════════════

// ─── Theme Interfaces ────────────────────────────────────

export interface StoreTheme {
  primaryColor: string
  accentColor: string
  backgroundColor: string
  headerStyle: 'minimal' | 'banner' | 'hero'
  layoutStyle: 'grid' | 'list' | 'masonry'
  fontFamily: string
  borderRadius: 'none' | 'small' | 'medium' | 'large'
  showSocialLinks: boolean
  socialLinks: {
    instagram?: string
    tiktok?: string
    website?: string
  }
  bannerImage?: string
  announcementBar?: {
    enabled: boolean
    text: string
    backgroundColor: string
    textColor: string
  }
  featuredCategories: string[]
  customCSS?: string
}

export interface StorePublicProfile {
  sellerId: string
  shopName: string
  shopDescription: string | null
  logoUrl: string | null
  isVerified: boolean
  rating: number | null
  productCount: number
  followerCount: number
  joinedAt: string
  theme: StoreTheme
}

// ─── Zod Schemas ─────────────────────────────────────────

const oklchColorSchema = z.string().refine(
  (val) => {
    // Accept oklch(...), hex, or named CSS colors
    const oklchPattern = /^oklch\(\s*[\d.]+\s+[\d.]+\s+[\d.]+(\s*\/\s*[\d.]+)?\s*\)$/
    const hexPattern = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/
    const namedColors = [
      'white', 'black', 'transparent', 'inherit', 'currentColor',
    ]
    return (
      oklchPattern.test(val) ||
      hexPattern.test(val) ||
      namedColors.includes(val.toLowerCase())
    )
  },
  { message: 'Ungültiges Farbformat. Verwenden Sie oklch(), Hex oder CSS-Farbnamen.' }
)

const urlSchema = z.string().url().max(500).or(z.literal(''))

const socialLinksSchema = z.object({
  instagram: z.string().max(200).optional(),
  tiktok: z.string().max(200).optional(),
  website: urlSchema.optional(),
}).strict()

const announcementBarSchema = z.object({
  enabled: z.boolean(),
  text: z.string().max(200).trim(),
  backgroundColor: oklchColorSchema,
  textColor: oklchColorSchema,
}).strict()

export const storeThemeSchema = z.object({
  primaryColor: oklchColorSchema,
  accentColor: oklchColorSchema,
  backgroundColor: oklchColorSchema,
  headerStyle: z.enum(['minimal', 'banner', 'hero']),
  layoutStyle: z.enum(['grid', 'list', 'masonry']),
  fontFamily: z.string().min(1).max(100).refine(
    (val) => !/[<>"'`;{}]/.test(val),
    { message: 'Font-Name enthält ungültige Zeichen.' }
  ),
  borderRadius: z.enum(['none', 'small', 'medium', 'large']),
  showSocialLinks: z.boolean(),
  socialLinks: socialLinksSchema,
  bannerImage: urlSchema.optional(),
  announcementBar: announcementBarSchema.optional(),
  featuredCategories: z.array(z.string().max(100).trim()).max(10),
  customCSS: z.string().max(5000).optional(),
}).strict()

/** Schema for partial updates (all fields optional) */
export const storeThemePartialSchema = storeThemeSchema.partial()

// ─── Default Theme ───────────────────────────────────────

const WEARO_PURPLE = 'oklch(0.55 0.25 303)'
const WEARO_ACCENT = 'oklch(0.78 0.14 85)'
const WEARO_BG = 'oklch(0.985 0.002 285)'

export function getDefaultTheme(): StoreTheme {
  return {
    primaryColor: WEARO_PURPLE,
    accentColor: WEARO_ACCENT,
    backgroundColor: WEARO_BG,
    headerStyle: 'minimal',
    layoutStyle: 'grid',
    fontFamily: 'Inter, system-ui, sans-serif',
    borderRadius: 'medium',
    showSocialLinks: false,
    socialLinks: {},
    announcementBar: {
      enabled: false,
      text: 'Willkommen in unserem Shop!',
      backgroundColor: WEARO_PURPLE,
      textColor: 'white',
    },
    featuredCategories: [],
  }
}

// ─── CSS Sanitization ────────────────────────────────────

/** Dangerous CSS patterns that could enable XSS or layout attacks */
const FORBIDDEN_CSS_PATTERNS: RegExp[] = [
  /expression\s*\(/i,
  /javascript\s*:/i,
  /vbscript\s*:/i,
  /@import\b/i,
  /@charset\b/i,
  /@namespace\b/i,
  /url\s*\(\s*["']?\s*data\s*:/i,
  /url\s*\(\s*["']?\s*javascript\s*:/i,
  /behavior\s*:/i,
  /-moz-binding\s*:/i,
  /\\00/i,                      // Unicode escape sequences
  /\/\*[\s\S]*?\*\//g,          // Block comments (can hide payloads)
  /position\s*:\s*fixed/i,      // Prevent overlay attacks
  /position\s*:\s*absolute/i,   // Prevent layout breaking
  /z-index\s*:\s*\d{4,}/i,      // Excessively high z-index
  /content\s*:\s*["'][^"']*url/i,// content with url()
  /<\/?[a-z]/i,                  // HTML tags embedded in CSS
]

/** Properties allowed in custom CSS */
const ALLOWED_CSS_PROPERTIES = new Set([
  'color', 'background-color', 'background',
  'font-size', 'font-weight', 'font-style', 'font-family',
  'text-align', 'text-decoration', 'text-transform', 'letter-spacing', 'line-height',
  'border', 'border-color', 'border-width', 'border-style', 'border-radius',
  'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'gap', 'row-gap', 'column-gap',
  'opacity', 'box-shadow', 'text-shadow',
  'transition', 'transform',
  'display', 'flex-direction', 'align-items', 'justify-content', 'flex-wrap',
  'grid-template-columns', 'grid-template-rows', 'grid-gap',
  'width', 'max-width', 'min-width',
  'height', 'max-height', 'min-height',
  'overflow', 'overflow-x', 'overflow-y',
  'cursor', 'outline',
])

/**
 * Sanitize custom CSS to prevent XSS and layout attacks.
 * Strips forbidden patterns and only allows safe property declarations.
 */
export function sanitizeCustomCSS(css: string): string {
  if (!css || typeof css !== 'string') return ''

  let sanitized = css.trim()

  // Length guard
  if (sanitized.length > 5000) {
    sanitized = sanitized.slice(0, 5000)
  }

  // Check for forbidden patterns
  for (const pattern of FORBIDDEN_CSS_PATTERNS) {
    if (pattern.test(sanitized)) {
      sanitized = sanitized.replace(pattern, '/* removed */')
    }
  }

  // Parse and filter individual declarations within rule blocks
  // Strategy: walk through each rule block and validate properties
  const output: string[] = []
  const ruleBlockRegex = /([^{]+)\{([^}]*)\}/g
  let match: RegExpExecArray | null

  while ((match = ruleBlockRegex.exec(sanitized)) !== null) {
    const selector = match[1].trim()
    const declarations = match[2].trim()

    // Selectors must be scoped - reject universal or body selectors
    if (/^\s*(\*|html|body|head)\s*(,|$)/i.test(selector)) {
      continue
    }

    // Validate each declaration
    const validDeclarations: string[] = []
    const parts = declarations.split(';').filter(Boolean)

    for (const part of parts) {
      const colonIndex = part.indexOf(':')
      if (colonIndex === -1) continue

      const property = part.slice(0, colonIndex).trim().toLowerCase()
      const value = part.slice(colonIndex + 1).trim()

      if (ALLOWED_CSS_PROPERTIES.has(property) && value.length > 0) {
        // One more check: value should not contain dangerous content
        if (!/expression|javascript|vbscript|url\s*\(|<|>/i.test(value)) {
          validDeclarations.push(`  ${property}: ${value}`)
        }
      }
    }

    if (validDeclarations.length > 0) {
      output.push(`${selector} {\n${validDeclarations.join(';\n')};\n}`)
    }
  }

  return output.join('\n\n')
}

// ─── Theme Validation ────────────────────────────────────

export interface ThemeValidationResult {
  success: boolean
  data?: StoreTheme
  errors?: z.ZodError['errors']
}

/**
 * Validate a theme configuration object.
 * Returns typed theme data or structured validation errors.
 */
export function validateTheme(theme: unknown): ThemeValidationResult {
  const result = storeThemeSchema.safeParse(theme)

  if (result.success) {
    // Sanitize customCSS if present
    const validated = { ...result.data }
    if (validated.customCSS) {
      validated.customCSS = sanitizeCustomCSS(validated.customCSS)
    }
    return { success: true, data: validated as StoreTheme }
  }

  return {
    success: false,
    errors: result.error.errors,
  }
}

/**
 * Validate a partial theme update.
 * Returns typed partial data or structured validation errors.
 */
export function validatePartialTheme(
  theme: unknown
): { success: boolean; data?: Partial<StoreTheme>; errors?: z.ZodError['errors'] } {
  const result = storeThemePartialSchema.safeParse(theme)

  if (result.success) {
    const validated = { ...result.data }
    if (validated.customCSS) {
      validated.customCSS = sanitizeCustomCSS(validated.customCSS)
    }
    return { success: true, data: validated as Partial<StoreTheme> }
  }

  return {
    success: false,
    errors: result.error.errors,
  }
}

// ─── Database Operations ─────────────────────────────────

/**
 * Fetch the store theme for a given seller.
 * Merges stored config with defaults so new theme fields
 * always have sensible values for existing sellers.
 */
export async function getStoreTheme(sellerId: string): Promise<StoreTheme> {
  const defaults = getDefaultTheme()

  const { data, error } = await supabaseAdmin
    .from('sellers')
    .select('theme_config')
    .eq('id', sellerId)
    .single()

  if (error || !data?.theme_config) {
    return defaults
  }

  // Deep merge: stored values override defaults
  const stored = data.theme_config as Record<string, unknown>

  return {
    ...defaults,
    ...stored,
    socialLinks: {
      ...defaults.socialLinks,
      ...(typeof stored.socialLinks === 'object' && stored.socialLinks !== null
        ? (stored.socialLinks as Record<string, string>)
        : {}),
    },
    announcementBar: {
      ...defaults.announcementBar!,
      ...(typeof stored.announcementBar === 'object' && stored.announcementBar !== null
        ? (stored.announcementBar as Record<string, unknown>)
        : {}),
    } as StoreTheme['announcementBar'],
    featuredCategories: Array.isArray(stored.featuredCategories)
      ? stored.featuredCategories as string[]
      : defaults.featuredCategories,
  }
}

/**
 * Update the store theme for a seller.
 * Accepts partial updates - only provided fields are changed.
 * Validates input before persisting.
 */
export async function updateStoreTheme(
  sellerId: string,
  themeUpdate: Partial<StoreTheme>
): Promise<{ success: boolean; theme?: StoreTheme; error?: string }> {
  // Validate the partial update
  const validation = validatePartialTheme(themeUpdate)
  if (!validation.success) {
    const messages = validation.errors?.map((e) => `${e.path.join('.')}: ${e.message}`) ?? []
    return {
      success: false,
      error: `Validierungsfehler: ${messages.join('; ')}`,
    }
  }

  // Fetch current theme to merge with
  const currentTheme = await getStoreTheme(sellerId)

  // Merge: deep merge for nested objects
  const merged: StoreTheme = {
    ...currentTheme,
    ...validation.data,
    socialLinks: {
      ...currentTheme.socialLinks,
      ...(validation.data?.socialLinks ?? {}),
    },
    announcementBar: validation.data?.announcementBar !== undefined
      ? {
          ...currentTheme.announcementBar!,
          ...validation.data.announcementBar,
        }
      : currentTheme.announcementBar,
    featuredCategories: validation.data?.featuredCategories ?? currentTheme.featuredCategories,
  }

  // Sanitize customCSS in final merged result
  if (merged.customCSS) {
    merged.customCSS = sanitizeCustomCSS(merged.customCSS)
  }

  // Full validation on merged result
  const fullValidation = validateTheme(merged)
  if (!fullValidation.success) {
    return {
      success: false,
      error: 'Das zusammengeführte Theme ist ungültig. Bitte überprüfen Sie Ihre Eingaben.',
    }
  }

  // Persist to database
  const { error } = await supabaseAdmin
    .from('sellers')
    .update({ theme_config: merged })
    .eq('id', sellerId)

  if (error) {
    console.error('[store-customization] Update failed:', error.message)
    return {
      success: false,
      error: 'Fehler beim Speichern der Theme-Konfiguration.',
    }
  }

  return { success: true, theme: merged }
}

// ─── Public Store Profile ────────────────────────────────

/**
 * Fetch the full public profile for a seller store.
 * Includes shop info, stats, and theme configuration.
 * Used by the storefront renderer.
 */
export async function getStorePublicProfile(
  sellerId: string
): Promise<StorePublicProfile | null> {
  // Fetch seller info
  const { data: seller, error: sellerError } = await supabaseAdmin
    .from('sellers')
    .select('id, shop_name, shop_description, logo_url, is_verified, created_at, theme_config')
    .eq('id', sellerId)
    .single()

  if (sellerError || !seller) {
    return null
  }

  // Fetch product count
  const { count: productCount } = await supabaseAdmin
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('seller_id', sellerId)

  // Fetch average rating from reviews
  const { data: ratingData } = await supabaseAdmin
    .from('reviews')
    .select('rating')
    .eq('seller_id', sellerId)
    .eq('status', 'published')

  let averageRating: number | null = null
  if (ratingData && ratingData.length > 0) {
    const sum = ratingData.reduce((acc: number, r: { rating: number }) => acc + (r.rating ?? 0), 0)
    averageRating = Math.round((sum / ratingData.length) * 10) / 10
  }

  // Fetch follower count (if followers table exists, graceful fallback)
  let followerCount = 0
  try {
    const { count: followers } = await supabaseAdmin
      .from('followers')
      .select('id', { count: 'exact', head: true })
      .eq('seller_id', sellerId)

    if (followers !== null) {
      followerCount = followers
    }
  } catch {
    // followers table may not exist yet
  }

  // Build theme from stored config merged with defaults
  const defaults = getDefaultTheme()
  const storedConfig = (seller.theme_config ?? {}) as Record<string, unknown>

  const theme: StoreTheme = {
    ...defaults,
    ...storedConfig,
    socialLinks: {
      ...defaults.socialLinks,
      ...(typeof storedConfig.socialLinks === 'object' && storedConfig.socialLinks !== null
        ? (storedConfig.socialLinks as Record<string, string>)
        : {}),
    },
    announcementBar: {
      ...defaults.announcementBar!,
      ...(typeof storedConfig.announcementBar === 'object' && storedConfig.announcementBar !== null
        ? (storedConfig.announcementBar as Record<string, unknown>)
        : {}),
    } as StoreTheme['announcementBar'],
    featuredCategories: Array.isArray(storedConfig.featuredCategories)
      ? storedConfig.featuredCategories as string[]
      : defaults.featuredCategories,
  }

  // Sanitize customCSS for public output
  if (theme.customCSS) {
    theme.customCSS = sanitizeCustomCSS(theme.customCSS)
  }

  return {
    sellerId: seller.id,
    shopName: seller.shop_name,
    shopDescription: seller.shop_description ?? null,
    logoUrl: seller.logo_url ?? null,
    isVerified: seller.is_verified ?? false,
    rating: averageRating,
    productCount: productCount ?? 0,
    followerCount,
    joinedAt: seller.created_at,
    theme,
  }
}

// ─── Utility: Border Radius Map ──────────────────────────

/** Map border radius setting to CSS value */
export function getBorderRadiusValue(setting: StoreTheme['borderRadius']): string {
  const map: Record<StoreTheme['borderRadius'], string> = {
    none: '0px',
    small: '4px',
    medium: '8px',
    large: '16px',
  }
  return map[setting] ?? map.medium
}

/** Map header style to recommended minimum height */
export function getHeaderHeight(style: StoreTheme['headerStyle']): string {
  const map: Record<StoreTheme['headerStyle'], string> = {
    minimal: '80px',
    banner: '200px',
    hero: '400px',
  }
  return map[style] ?? map.minimal
}

/**
 * Generate CSS custom properties from a StoreTheme.
 * These can be applied to a store container element as inline styles
 * or injected into a <style> block.
 */
export function themeToCSSVariables(theme: StoreTheme): Record<string, string> {
  return {
    '--store-primary': theme.primaryColor,
    '--store-accent': theme.accentColor,
    '--store-bg': theme.backgroundColor,
    '--store-font': theme.fontFamily,
    '--store-radius': getBorderRadiusValue(theme.borderRadius),
    '--store-header-height': getHeaderHeight(theme.headerStyle),
  }
}
