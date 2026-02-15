/**
 * Currency Converter & Formatter Utility
 * Supports multi-currency display with cached exchange rates
 */

import { supabase } from './supabase'

export type SupportedCurrency = 'EUR' | 'USD' | 'GBP' | 'TRY' | 'JPY' | 'CNY' | 'INR' | 'AUD' | 'CAD'

export interface CurrencyInfo {
  code: SupportedCurrency
  symbol: string
  name: string
  locale: string
}

export const CURRENCIES: Record<SupportedCurrency, CurrencyInfo> = {
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', locale: 'de-DE' },
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', locale: 'en-US' },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', locale: 'en-GB' },
  TRY: { code: 'TRY', symbol: '₺', name: 'Turkish Lira', locale: 'tr-TR' },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen', locale: 'ja-JP' },
  CNY: { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', locale: 'zh-CN' },
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', locale: 'en-IN' },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', locale: 'en-AU' },
  CAD: { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', locale: 'en-CA' }
}

// In-memory cache for exchange rates (15 min TTL)
let rateCache: {
  rates: Map<string, number>
  timestamp: number
} | null = null

const CACHE_TTL = 15 * 60 * 1000 // 15 minutes

/**
 * Get exchange rate from EUR to target currency
 * Uses cached rates from database, falls back to default rates
 */
export async function getExchangeRate(
  fromCurrency: SupportedCurrency,
  toCurrency: SupportedCurrency
): Promise<number> {
  if (fromCurrency === toCurrency) return 1.0

  // Check memory cache
  const now = Date.now()
  if (rateCache && now - rateCache.timestamp < CACHE_TTL) {
    const key = `${fromCurrency}-${toCurrency}`
    const cachedRate = rateCache.rates.get(key)
    if (cachedRate) return cachedRate
  }

  // Fetch from database
  try {
    const { data, error } = await supabase
      .from('exchange_rates')
      .select('rate')
      .eq('base_currency', fromCurrency)
      .eq('target_currency', toCurrency)
      .single()

    if (!error && data) {
      // Update cache
      if (!rateCache) {
        rateCache = { rates: new Map(), timestamp: now }
      }
      rateCache.rates.set(`${fromCurrency}-${toCurrency}`, data.rate)
      rateCache.timestamp = now

      return data.rate
    }
  } catch (err) {
    console.error('Error fetching exchange rate:', err)
  }

  // Fallback to default rates (relative to EUR)
  const defaultRates: Record<SupportedCurrency, number> = {
    EUR: 1.0,
    USD: 1.1,
    GBP: 0.85,
    TRY: 35.0,
    JPY: 160.0,
    CNY: 7.8,
    INR: 92.0,
    AUD: 1.65,
    CAD: 1.45
  }

  if (fromCurrency === 'EUR') {
    return defaultRates[toCurrency]
  }

  // Convert: from -> EUR -> to
  const fromToEur = 1 / defaultRates[fromCurrency]
  const eurToTarget = defaultRates[toCurrency]
  return fromToEur * eurToTarget
}

/**
 * Convert amount from one currency to another
 */
export async function convertCurrency(
  amount: number,
  fromCurrency: SupportedCurrency,
  toCurrency: SupportedCurrency
): Promise<number> {
  const rate = await getExchangeRate(fromCurrency, toCurrency)
  return amount * rate
}

/**
 * Format price with currency symbol and locale
 */
export function formatPrice(
  amount: number,
  currency: SupportedCurrency,
  options?: {
    showSymbol?: boolean
    showCode?: boolean
    decimals?: number
  }
): string {
  const currencyInfo = CURRENCIES[currency]
  const decimals = options?.decimals ?? (currency === 'JPY' ? 0 : 2)

  const formatted = new Intl.NumberFormat(currencyInfo.locale, {
    style: 'decimal',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(amount)

  if (options?.showSymbol === false) {
    return formatted
  }

  const symbol = currencyInfo.symbol
  const code = options?.showCode ? ` ${currency}` : ''

  return `${symbol}${formatted}${code}`
}

/**
 * Get user's preferred currency from browser or defaults to EUR
 */
export function getUserCurrency(): SupportedCurrency {
  if (typeof window === 'undefined') return 'EUR'

  // Check localStorage
  const saved = localStorage.getItem('preferred_currency')
  if (saved && saved in CURRENCIES) {
    return saved as SupportedCurrency
  }

  // Detect from browser locale
  const locale = navigator.language.toLowerCase()

  if (locale.startsWith('en-us') || locale.startsWith('en-ca')) return 'USD'
  if (locale.startsWith('en-gb')) return 'GBP'
  if (locale.startsWith('tr')) return 'TRY'
  if (locale.startsWith('ja')) return 'JPY'
  if (locale.startsWith('zh')) return 'CNY'
  if (locale.startsWith('hi') || locale.startsWith('en-in')) return 'INR'
  if (locale.startsWith('en-au')) return 'AUD'

  return 'EUR' // Default
}

/**
 * Set user's preferred currency
 */
export function setUserCurrency(currency: SupportedCurrency): void {
  if (typeof window === 'undefined') return
  localStorage.setItem('preferred_currency', currency)
}

/**
 * Get country code from IP (simplified - in production use a geolocation API)
 */
export async function getUserCountry(): Promise<string> {
  // In production, use a service like ipapi.co or ip-api.com
  // For now, detect from browser locale
  if (typeof window === 'undefined') return 'DE'

  const locale = navigator.language.toLowerCase()

  if (locale.startsWith('en-us')) return 'US'
  if (locale.startsWith('en-gb')) return 'GB'
  if (locale.startsWith('tr')) return 'TR'
  if (locale.startsWith('fr')) return 'FR'
  if (locale.startsWith('de')) return 'DE'
  if (locale.startsWith('it')) return 'IT'
  if (locale.startsWith('es')) return 'ES'
  if (locale.startsWith('ja')) return 'JP'
  if (locale.startsWith('zh')) return 'CN'
  if (locale.startsWith('hi') || locale.startsWith('en-in')) return 'IN'
  if (locale.startsWith('en-au')) return 'AU'
  if (locale.startsWith('en-ca')) return 'CA'

  return 'DE' // Default to Germany
}

/**
 * Calculate VAT/Tax for a price based on country
 */
export async function calculateTax(
  amount: number,
  countryCode: string
): Promise<{ taxAmount: number; totalWithTax: number; taxRate: number }> {
  try {
    const { data, error } = await supabase
      .from('tax_rates')
      .select('vat_rate')
      .eq('country_code', countryCode)
      .single()

    const taxRate = !error && data ? data.vat_rate : 0
    const taxAmount = amount * (taxRate / 100)
    const totalWithTax = amount + taxAmount

    return { taxAmount, totalWithTax, taxRate }
  } catch (err) {
    console.error('Error calculating tax:', err)
    return { taxAmount: 0, totalWithTax: amount, taxRate: 0 }
  }
}

/**
 * Get product price in user's preferred currency
 */
export async function getProductPrice(
  productId: string,
  currency: SupportedCurrency
): Promise<number | null> {
  try {
    // First, try to get pre-calculated price for this currency
    const { data: priceData } = await supabase
      .from('product_prices')
      .select('price')
      .eq('product_id', productId)
      .eq('currency', currency)
      .single()

    if (priceData) {
      return priceData.price
    }

    // Fallback: get base price and convert
    const { data: product } = await supabase
      .from('products')
      .select('price, base_currency')
      .eq('id', productId)
      .single()

    if (!product) return null

    const baseCurrency = (product.base_currency || 'EUR') as SupportedCurrency
    const basePrice = product.price

    if (baseCurrency === currency) {
      return basePrice
    }

    return await convertCurrency(basePrice, baseCurrency, currency)
  } catch (err) {
    console.error('Error getting product price:', err)
    return null
  }
}
