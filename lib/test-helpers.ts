/**
 * Test Helpers - Development & Testing Utilities
 *
 * Bu dosya development ve testing için yardımcı fonksiyonlar içerir
 */

import { createClient } from '@supabase/supabase-js'

// Test Email Helper
export const TestEmails = {
  // Stripe test kartları
  stripeTestCards: {
    success: '4242424242424242',
    decline: '4000000000000002',
    requireAuth: '4000002500003155',
    insufficientFunds: '4000000000009995'
  },

  // Test email adresleri
  testEmails: [
    'test@wearo.com',
    'seller@wearo.com',
    'admin@wearo.com',
    'buyer@wearo.com'
  ],

  // Email preview helper (development)
  async previewEmail(emailHtml: string) {
    if (process.env.NODE_ENV !== 'development') {
      console.warn('Email preview only available in development')
      return
    }

    console.log('\n📧 Email Preview:')
    console.log('─'.repeat(80))
    console.log(emailHtml)
    console.log('─'.repeat(80))
  },

  // Test email sender (development only)
  async sendTestEmail(to: string, subject: string, html: string) {
    if (process.env.NODE_ENV !== 'development') {
      throw new Error('Test emails only in development')
    }

    console.log(`\n✉️ Test Email Sent:`)
    console.log(`To: ${to}`)
    console.log(`Subject: ${subject}`)
    console.log(`Preview: ${html.substring(0, 100)}...`)
  }
}

// Database Test Helper
export class DatabaseTestHelper {
  private supabase: ReturnType<typeof createClient>

  constructor() {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      throw new Error('Supabase credentials not found')
    }

    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
  }

  // Test kullanıcısı oluştur
  async createTestUser(email: string, password: string = 'Test123!') {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
    })

    if (error) throw error
    return data.user
  }

  // Test ürünü oluştur
  async createTestProduct(sellerId: string, overrides?: any) {
    const { data: products, error } = await this.supabase
      .from('products')
      .insert([{
        seller_id: sellerId,
        title: 'Test Product',
        description: 'Test Description',
        category: 'Clothing',
        price: 99.99,
        currency: 'USD',
        stock: 100,
        status: 'approved',
        ...overrides
      }] as any)
      .select()

    if (error) throw error
    const product = products?.[0]
    if (!product) throw new Error('Failed to create product')
    return product
  }

  // Test siparişi oluştur
  async createTestOrder(userId: string, items: any[]) {
    const total = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0)

    const { data: orders, error: orderError } = await this.supabase
      .from('orders')
      .insert([{
        user_id: userId,
        total_amount: total,
        currency: 'USD',
        status: 'pending',
        payment_status: 'pending'
      }] as any)
      .select()

    if (orderError) throw orderError
    const order: any = orders?.[0]
    if (!order) throw new Error('Failed to create order')

    const orderItems = items.map((item: any) => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      price: item.price
    }))

    const { error: itemsError } = await this.supabase
      .from('order_items')
      .insert(orderItems as any)

    if (itemsError) throw itemsError

    return order
  }

  // Test verilerini temizle
  async cleanup(userId?: string) {
    if (process.env.NODE_ENV !== 'development') {
      throw new Error('Cleanup only allowed in development')
    }

    if (userId) {
      // Kullanıcıya ait verileri sil
      await this.supabase.from('orders').delete().eq('user_id', userId)
      await this.supabase.from('clothes').delete().eq('user_id', userId)
      await this.supabase.from('wishlists').delete().eq('user_id', userId)
      await this.supabase.from('notifications').delete().eq('user_id', userId)
    }

    console.log(`✅ Test data cleaned up${userId ? ` for user ${userId}` : ''}`)
  }
}

// API Test Helper
export class APITestHelper {
  private baseUrl: string

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl
  }

  // Generic API call
  async call<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<{ data: T | null; error: any }> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers
        },
        ...options
      })

      const data = await response.json()

      if (!response.ok) {
        return { data: null, error: data }
      }

      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  // Test rate limiting
  async testRateLimit(endpoint: string, limit: number = 10) {
    console.log(`\n🧪 Testing rate limit for ${endpoint}`)

    const results = []
    for (let i = 0; i < limit + 5; i++) {
      const start = Date.now()
      const { data, error } = await this.call(endpoint)
      const duration = Date.now() - start

      results.push({
        attempt: i + 1,
        success: !error,
        status: error ? 429 : 200,
        duration
      })

      if (error?.status === 429) {
        console.log(`❌ Rate limited at attempt ${i + 1}`)
        break
      } else {
        console.log(`✅ Attempt ${i + 1} succeeded (${duration}ms)`)
      }
    }

    return results
  }

  // Test authentication
  async testAuth(email: string, password: string) {
    console.log('\n🧪 Testing authentication flow')

    // Signup
    const signup = await this.call('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    })

    console.log('Signup:', signup.error ? '❌ Failed' : '✅ Success')

    // Signin
    const signin = await this.call('/api/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    })

    console.log('Signin:', signin.error ? '❌ Failed' : '✅ Success')

    return { signup, signin }
  }
}

// Performance Test Helper
export class PerformanceTestHelper {
  private metrics: Map<string, number[]> = new Map()

  async measure<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now()
    const result = await fn()
    const duration = performance.now() - start

    if (!this.metrics.has(name)) {
      this.metrics.set(name, [])
    }
    this.metrics.get(name)!.push(duration)

    return result
  }

  getStats(name: string) {
    const times = this.metrics.get(name) || []
    if (times.length === 0) return null

    const sorted = [...times].sort((a, b) => a - b)
    const sum = times.reduce((a, b) => a + b, 0)

    return {
      count: times.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: sum / times.length,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    }
  }

  report() {
    console.log('\n📊 Performance Report')
    console.log('─'.repeat(80))

    for (const [name, _] of this.metrics) {
      const stats = this.getStats(name)
      if (!stats) continue

      console.log(`\n${name}:`)
      console.log(`  Count: ${stats.count}`)
      console.log(`  Min: ${stats.min.toFixed(2)}ms`)
      console.log(`  Max: ${stats.max.toFixed(2)}ms`)
      console.log(`  Avg: ${stats.avg.toFixed(2)}ms`)
      console.log(`  Median: ${stats.median.toFixed(2)}ms`)
      console.log(`  P95: ${stats.p95.toFixed(2)}ms`)
      console.log(`  P99: ${stats.p99.toFixed(2)}ms`)
    }

    console.log('─'.repeat(80))
  }

  reset() {
    this.metrics.clear()
  }
}

// Mock Data Generator
export const MockData = {
  // Rastgele kullanıcı
  randomUser() {
    const id = Math.random().toString(36).substring(7)
    return {
      email: `user-${id}@test.com`,
      password: 'Test123!',
      full_name: `Test User ${id}`,
      phone: `+1555${Math.floor(Math.random() * 10000000)}`
    }
  },

  // Rastgele ürün
  randomProduct(sellerId: string) {
    const categories = ['Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Shoes', 'Accessories']
    const brands = ['Nike', 'Adidas', 'Zara', 'H&M', 'Uniqlo', 'Gap']
    const colors = ['Black', 'White', 'Red', 'Blue', 'Green', 'Gray']

    return {
      seller_id: sellerId,
      title: `${brands[Math.floor(Math.random() * brands.length)]} ${categories[Math.floor(Math.random() * categories.length)]}`,
      description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      category: categories[Math.floor(Math.random() * categories.length)],
      brand: brands[Math.floor(Math.random() * brands.length)],
      price: Math.floor(Math.random() * 200) + 20,
      currency: 'USD',
      stock: Math.floor(Math.random() * 100) + 10,
      color: colors[Math.floor(Math.random() * colors.length)],
      sizes: ['S', 'M', 'L', 'XL'],
      status: 'approved'
    }
  },

  // Rastgele yorum
  randomReview(productId: string, userId: string) {
    const comments = [
      'Great product, highly recommend!',
      'Good quality for the price.',
      'Not bad, but could be better.',
      'Exceeded my expectations!',
      'Disappointed with the quality.'
    ]

    return {
      product_id: productId,
      user_id: userId,
      rating: Math.floor(Math.random() * 5) + 1,
      comment: comments[Math.floor(Math.random() * comments.length)],
      verified_purchase: Math.random() > 0.3
    }
  }
}

// Export everything
export default {
  TestEmails,
  DatabaseTestHelper,
  APITestHelper,
  PerformanceTestHelper,
  MockData
}
