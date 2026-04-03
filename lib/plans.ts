/**
 * WEARO Plan Definitions — Single source of truth
 *
 * Plan tiers:
 *   starter  — Free entry. Bio-link store with basics. 5% commission.
 *   creator  — For growing creators. More products, customization, analytics. 3% commission.
 *   pro      — For serious sellers. Full customization, priority support. 1% commission.
 *   brand    — For established brands. White-label, API access, dedicated support. 0% commission.
 *
 * Revenue model:
 *   - Monthly subscription (creator/pro/brand)
 *   - Transaction commission on all plans (decreasing with tier)
 *   - Starter is free with higher commission to enable zero-friction onboarding
 */

// ─── Plan IDs ─────────────────────────────────────────────────────────────────

export type PlanId = 'starter' | 'creator' | 'pro' | 'brand'

// ─── Plan Definition ──────────────────────────────────────────────────────────

export interface PlanDefinition {
  id: PlanId
  name: string
  tagline: string
  monthlyPrice: number        // EUR, 0 = free
  yearlyPrice: number         // EUR per year (discount)
  commissionRate: number      // percentage (e.g., 5 = 5%)
  limits: PlanLimits
  features: PlanFeatures
  badge: string | null        // display badge on storefront
  recommended: boolean
}

export interface PlanLimits {
  maxProducts: number         // -1 = unlimited
  maxImages: number           // per product
  maxOutfits: number          // -1 = unlimited
}

export interface PlanFeatures {
  customTheme: boolean
  customAccent: boolean
  customTypography: boolean
  customHeroBanner: boolean
  removeBranding: boolean
  analyticsDepth: 'basic' | 'standard' | 'advanced' | 'full'
  verifiedBadge: boolean      // can request verification
  prioritySupport: boolean
  customDomain: boolean       // future
  apiAccess: boolean          // future
  boostCredits: number        // monthly boost credits (future)
}

// ─── Plan Registry ────────────────────────────────────────────────────────────

export const PLANS: Record<PlanId, PlanDefinition> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    tagline: 'Dein erster Store — kostenlos starten',
    monthlyPrice: 0,
    yearlyPrice: 0,
    commissionRate: 5,
    limits: {
      maxProducts: 15,
      maxImages: 4,
      maxOutfits: 3,
    },
    features: {
      customTheme: false,
      customAccent: false,
      customTypography: false,
      customHeroBanner: false,
      removeBranding: false,
      analyticsDepth: 'basic',
      verifiedBadge: false,
      prioritySupport: false,
      customDomain: false,
      apiAccess: false,
      boostCredits: 0,
    },
    badge: null,
    recommended: false,
  },

  creator: {
    id: 'creator',
    name: 'Creator',
    tagline: 'Für wachsende Creators — mehr Kontrolle',
    monthlyPrice: 19,
    yearlyPrice: 190,    // ~16/mo
    commissionRate: 3,
    limits: {
      maxProducts: 100,
      maxImages: 8,
      maxOutfits: 20,
    },
    features: {
      customTheme: true,
      customAccent: true,
      customTypography: false,
      customHeroBanner: true,
      removeBranding: false,
      analyticsDepth: 'standard',
      verifiedBadge: true,
      prioritySupport: false,
      customDomain: false,
      apiAccess: false,
      boostCredits: 3,
    },
    badge: 'Creator',
    recommended: true,
  },

  pro: {
    id: 'pro',
    name: 'Creator Pro',
    tagline: 'Für professionelle Seller — volle Power',
    monthlyPrice: 49,
    yearlyPrice: 490,    // ~41/mo
    commissionRate: 1,
    limits: {
      maxProducts: 500,
      maxImages: 12,
      maxOutfits: -1,
    },
    features: {
      customTheme: true,
      customAccent: true,
      customTypography: true,
      customHeroBanner: true,
      removeBranding: true,
      analyticsDepth: 'advanced',
      verifiedBadge: true,
      prioritySupport: true,
      customDomain: false,
      apiAccess: false,
      boostCredits: 10,
    },
    badge: 'Pro',
    recommended: false,
  },

  brand: {
    id: 'brand',
    name: 'Brand',
    tagline: 'Für etablierte Marken — Enterprise-Level',
    monthlyPrice: 149,
    yearlyPrice: 1490,   // ~124/mo
    commissionRate: 0,
    limits: {
      maxProducts: -1,
      maxImages: 20,
      maxOutfits: -1,
    },
    features: {
      customTheme: true,
      customAccent: true,
      customTypography: true,
      customHeroBanner: true,
      removeBranding: true,
      analyticsDepth: 'full',
      verifiedBadge: true,
      prioritySupport: true,
      customDomain: true,
      apiAccess: true,
      boostCredits: 30,
    },
    badge: 'Brand',
    recommended: false,
  },
}

// ─── Plan Helpers ─────────────────────────────────────────────────────────────

export function getPlan(planId: PlanId | string | null | undefined): PlanDefinition {
  if (planId && planId in PLANS) return PLANS[planId as PlanId]
  return PLANS.starter
}

export function canAccess(sellerPlan: PlanId | string | null | undefined, feature: keyof PlanFeatures): boolean {
  const plan = getPlan(sellerPlan)
  return !!plan.features[feature]
}

export function isWithinLimit(
  sellerPlan: PlanId | string | null | undefined,
  limitKey: keyof PlanLimits,
  currentCount: number,
): boolean {
  const plan = getPlan(sellerPlan)
  const limit = plan.limits[limitKey]
  return limit === -1 || currentCount < limit
}

export function getCommissionRate(sellerPlan: PlanId | string | null | undefined): number {
  return getPlan(sellerPlan).commissionRate
}

/** Plans sorted by price for display */
export const PLAN_ORDER: PlanId[] = ['starter', 'creator', 'pro', 'brand']

/** Check if a plan is a paid plan */
export function isPaidPlan(planId: PlanId | string | null | undefined): boolean {
  return getPlan(planId).monthlyPrice > 0
}

// ─── Curated Customization Presets ────────────────────────────────────────────

export interface ThemePreset {
  id: string
  name: string
  bg: string
  card: string
  text: string
  muted: string
  minPlan: PlanId
}

export interface AccentPreset {
  id: string
  name: string
  color: string
  minPlan: PlanId
}

export interface TypographyPreset {
  id: string
  name: string
  headingFont: string
  bodyFont: string
  minPlan: PlanId
}

export const THEME_PRESETS: ThemePreset[] = [
  { id: 'dark',     name: 'Midnight',     bg: '#0E0E10', card: '#1A1A1E', text: '#F0F0F0', muted: '#888', minPlan: 'starter' },
  { id: 'light',    name: 'Clean White',   bg: '#FAFAFA', card: '#FFFFFF', text: '#1A1A1A', muted: '#6B6B6B', minPlan: 'creator' },
  { id: 'warm',     name: 'Warm Sand',     bg: '#FAF8F5', card: '#FFFFFF', text: '#2C2419', muted: '#8C7B6B', minPlan: 'creator' },
  { id: 'minimal',  name: 'Minimal Gray',  bg: '#F5F5F5', card: '#FFFFFF', text: '#1A1A1A', muted: '#999', minPlan: 'creator' },
  { id: 'midnight', name: 'Deep Navy',     bg: '#0A0E1A', card: '#131830', text: '#E8ECF4', muted: '#6B7394', minPlan: 'pro' },
  { id: 'forest',   name: 'Forest',        bg: '#0A1410', card: '#132018', text: '#E0EDE4', muted: '#6B8C74', minPlan: 'pro' },
]

export const ACCENT_PRESETS: AccentPreset[] = [
  { id: 'amber',   name: 'Amber',    color: '#D97706', minPlan: 'starter' },
  { id: 'blue',    name: 'Ozean',     color: '#2563EB', minPlan: 'creator' },
  { id: 'rose',    name: 'Rosé',      color: '#E11D48', minPlan: 'creator' },
  { id: 'emerald', name: 'Smaragd',   color: '#059669', minPlan: 'creator' },
  { id: 'violet',  name: 'Violett',   color: '#7C3AED', minPlan: 'creator' },
  { id: 'coral',   name: 'Koralle',   color: '#F97316', minPlan: 'pro' },
  { id: 'slate',   name: 'Graphit',   color: '#475569', minPlan: 'pro' },
  { id: 'custom',  name: 'Eigene',    color: '',        minPlan: 'pro' },
]

export const TYPOGRAPHY_PRESETS: TypographyPreset[] = [
  { id: 'system',    name: 'System',     headingFont: 'system-ui', bodyFont: 'system-ui',      minPlan: 'starter' },
  { id: 'modern',    name: 'Modern',     headingFont: 'Inter',     bodyFont: 'Inter',           minPlan: 'pro' },
  { id: 'editorial', name: 'Editorial',  headingFont: 'Playfair Display', bodyFont: 'Inter',    minPlan: 'pro' },
  { id: 'minimal',   name: 'Minimal',    headingFont: 'DM Sans',   bodyFont: 'DM Sans',        minPlan: 'pro' },
]
