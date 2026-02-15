/**
 * Analytics and Tracking Utilities
 */

// Event types
export type AnalyticsEvent =
  | 'page_view'
  | 'product_view'
  | 'add_to_cart'
  | 'remove_from_cart'
  | 'begin_checkout'
  | 'purchase'
  | 'search'
  | 'review_submitted'
  | 'wishlist_add'
  | 'wishlist_remove'
  | 'filter_applied'
  | 'seller_application'
  | 'product_created'

interface EventProperties {
  [key: string]: string | number | boolean | undefined
}

/**
 * Track custom event
 */
export function trackEvent(
  event: AnalyticsEvent,
  properties?: EventProperties
): void {
  if (process.env.NODE_ENV === 'development') {
    console.log('📊 Analytics Event:', event, properties)
    return
  }

  // Vercel Analytics
  if (typeof window !== 'undefined' && (window as any).va) {
    ;(window as any).va('track', event, properties)
  }

  // Google Analytics (eğer kuruluysa)
  if (typeof window !== 'undefined' && (window as any).gtag) {
    ;(window as any).gtag('event', event, properties)
  }
}

/**
 * Track page view
 */
export function trackPageView(url: string, title?: string): void {
  trackEvent('page_view', {
    page: url,
    title: title || document.title
  })
}

/**
 * Track product view
 */
export function trackProductView(
  productId: string,
  productName: string,
  price: number,
  category?: string
): void {
  trackEvent('product_view', {
    product_id: productId,
    product_name: productName,
    price,
    category
  })
}

/**
 * Track add to cart
 */
export function trackAddToCart(
  productId: string,
  productName: string,
  price: number,
  quantity: number = 1
): void {
  trackEvent('add_to_cart', {
    product_id: productId,
    product_name: productName,
    price,
    quantity,
    value: price * quantity
  })
}

/**
 * Track purchase (E-commerce conversion)
 */
export function trackPurchase(
  orderId: string,
  totalAmount: number,
  items: Array<{
    id: string
    name: string
    price: number
    quantity: number
  }>
): void {
  trackEvent('purchase', {
    order_id: orderId,
    value: totalAmount,
    items: items.length,
    revenue: totalAmount
  })

  // Enhanced E-commerce tracking
  if (typeof window !== 'undefined' && (window as any).gtag) {
    ;(window as any).gtag('event', 'purchase', {
      transaction_id: orderId,
      value: totalAmount,
      currency: 'EUR',
      items: items.map(item => ({
        item_id: item.id,
        item_name: item.name,
        price: item.price,
        quantity: item.quantity
      }))
    })
  }
}

/**
 * Track search
 */
export function trackSearch(query: string, resultsCount: number): void {
  trackEvent('search', {
    search_term: query,
    results: resultsCount
  })
}

/**
 * Track filter usage
 */
export function trackFilterApplied(
  filterType: string,
  filterValue: string | number
): void {
  trackEvent('filter_applied', {
    filter_type: filterType,
    filter_value: String(filterValue)
  })
}

/**
 * Track review submission
 */
export function trackReviewSubmitted(
  productId: string,
  rating: number,
  hasComment: boolean
): void {
  trackEvent('review_submitted', {
    product_id: productId,
    rating,
    has_comment: hasComment
  })
}

/**
 * Track wishlist actions
 */
export function trackWishlistAction(
  action: 'add' | 'remove',
  productId: string,
  productName: string
): void {
  trackEvent(action === 'add' ? 'wishlist_add' : 'wishlist_remove', {
    product_id: productId,
    product_name: productName
  })
}

/**
 * User identification for analytics
 */
export function identifyUser(
  userId: string,
  properties?: {
    email?: string
    name?: string
    role?: string
    [key: string]: any
  }
): void {
  if (process.env.NODE_ENV === 'development') {
    console.log('👤 User Identified:', userId, properties)
    return
  }

  // Vercel Analytics
  if (typeof window !== 'undefined' && (window as any).va) {
    ;(window as any).va('identify', userId, properties)
  }

  // Google Analytics
  if (typeof window !== 'undefined' && (window as any).gtag) {
    ;(window as any).gtag('set', 'user_properties', {
      user_id: userId,
      ...properties
    })
  }
}

/**
 * Track timing/performance
 */
export function trackTiming(
  category: string,
  variable: string,
  time: number,
  label?: string
): void {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    ;(window as any).gtag('event', 'timing_complete', {
      name: variable,
      value: time,
      event_category: category,
      event_label: label
    })
  }
}

/**
 * Track errors/exceptions
 */
export function trackException(
  description: string,
  fatal: boolean = false
): void {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    ;(window as any).gtag('event', 'exception', {
      description,
      fatal
    })
  }
}
