/**
 * Sendcloud Shipping API Integration
 * https://api.sendcloud.dev/docs/sendcloud-public-api/
 */

interface SendcloudConfig {
  publicKey: string
  secretKey: string
  baseUrl: string
}

interface ShippingAddress {
  name: string
  company?: string
  address: string
  address2?: string
  city: string
  postal_code: string
  country: string // ISO 2-letter code (e.g., "DE", "NL")
  email?: string
  telephone?: string
}

interface ParcelData {
  name: string
  company_name?: string
  address: string
  address_2?: string
  city: string
  postal_code: string
  country: string
  email?: string
  telephone?: string
  order_number: string
  weight: string // in kg (e.g., "1.5")
  shipment: {
    id: number // Sendcloud shipping method ID
  }
  request_label: boolean
  apply_shipping_rules?: boolean
}

interface SendcloudParcel {
  id: number
  tracking_number: string
  tracking_url: string
  label: {
    normal_printer: string[]
    label_printer: string
  }
  status: {
    id: number
    message: string
  }
  carrier: {
    code: string
  }
  shipment: {
    id: number
    name: string
  }
}

interface SendcloudWebhookEvent {
  action: 'parcel_status_changed'
  timestamp: number
  parcel: {
    id: number
    tracking_number: string
    status: {
      id: number
      message: string
    }
    tracking_url: string
  }
}

export class SendcloudAPI {
  private config: SendcloudConfig

  constructor() {
    this.config = {
      publicKey: process.env.SENDCLOUD_PUBLIC_KEY || '',
      secretKey: process.env.SENDCLOUD_SECRET_KEY || '',
      baseUrl: 'https://panel.sendcloud.sc/api/v2',
    }

    if (!this.config.publicKey || !this.config.secretKey) {
      console.warn('⚠️ Sendcloud API credentials not configured')
    }
  }

  /**
   * Create authentication header for Sendcloud API
   */
  private getAuthHeader(): string {
    const credentials = Buffer.from(`${this.config.publicKey}:${this.config.secretKey}`).toString('base64')
    return `Basic ${credentials}`
  }

  /**
   * Get available shipping methods
   */
  async getShippingMethods(country: string): Promise<any[]> {
    try {
      const response = await fetch(`${this.config.baseUrl}/shipping_methods`, {
        method: 'GET',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Sendcloud API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      // Filter by country if specified
      if (country) {
        return data.shipping_methods.filter((method: any) =>
          method.countries.includes(country.toUpperCase())
        )
      }

      return data.shipping_methods
    } catch (error) {
      console.error('❌ Sendcloud getShippingMethods error:', error)
      throw error
    }
  }

  /**
   * Create a shipping label
   */
  async createLabel(parcelData: ParcelData): Promise<SendcloudParcel> {
    try {
      const response = await fetch(`${this.config.baseUrl}/parcels`, {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          parcel: parcelData,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Sendcloud API error response:', errorData)
        throw new Error(`Sendcloud API error: ${response.status} - ${JSON.stringify(errorData)}`)
      }

      const data = await response.json()
      return data.parcel
    } catch (error) {
      console.error('❌ Sendcloud createLabel error:', error)
      throw error
    }
  }

  /**
   * Get parcel tracking info
   */
  async getParcelTracking(parcelId: number): Promise<any> {
    try {
      const response = await fetch(`${this.config.baseUrl}/parcels/${parcelId}`, {
        method: 'GET',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Sendcloud API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      return data.parcel
    } catch (error) {
      console.error('❌ Sendcloud getParcelTracking error:', error)
      throw error
    }
  }

  /**
   * Cancel a parcel (before pickup)
   */
  async cancelParcel(parcelId: number): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/parcels/${parcelId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
      })

      return response.ok
    } catch (error) {
      console.error('❌ Sendcloud cancelParcel error:', error)
      throw error
    }
  }

  /**
   * Map Sendcloud status to our order state
   */
  mapStatusToOrderState(sendcloudStatus: number): string {
    // Sendcloud status codes:
    // 1000 = Ready to send
    // 1001 = Being processed
    // 2000 = Announced
    // 3 = En route to sorting center
    // 11 = Delivered
    // 12 = Delivery failed
    // etc.

    const statusMap: Record<number, string> = {
      1000: 'PAID',           // Ready to send
      1001: 'SHIPPED',        // Being processed
      2000: 'SHIPPED',        // Announced to carrier
      3: 'SHIPPED',           // En route
      11: 'DELIVERED',        // Delivered
      12: 'RETURN_REQUESTED', // Delivery failed
      13: 'SHIPPED',          // Sorted
      80: 'CANCELLED',        // Cancelled
    }

    return statusMap[sendcloudStatus] || 'SHIPPED'
  }

  /**
   * Verify webhook signature (if Sendcloud supports it)
   */
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    // Sendcloud webhook verification (implement based on their docs)
    // For now, return true - add crypto verification if needed
    return true
  }
}

/**
 * Helper: Convert our address format to Sendcloud format
 */
export function convertToSendcloudAddress(address: any): Partial<ParcelData> {
  return {
    name: address.fullName || address.name,
    company_name: address.company,
    address: address.address || address.street,
    address_2: address.address2 || address.apartment,
    city: address.city,
    postal_code: address.postalCode || address.zipCode || address.postal_code,
    country: address.country || 'DE', // Default to Germany
    email: address.email,
    telephone: address.phone || address.telephone,
  }
}

/**
 * Helper: Estimate shipping weight based on product type
 */
export function estimatePackageWeight(items: any[]): number {
  // Simple estimation: 0.5kg per item (can be improved with actual product weights)
  const totalItems = items.reduce((sum, item) => sum + (item.quantity || 1), 0)
  return Math.max(0.5, totalItems * 0.5) // Minimum 0.5kg
}

/**
 * Get default shipping method ID for a country
 */
export function getDefaultShippingMethod(country: string): number {
  // These are example Sendcloud shipping method IDs
  // Replace with your actual configured methods
  const methodMap: Record<string, number> = {
    'DE': 8,   // DHL Germany
    'NL': 10,  // PostNL
    'BE': 12,  // bpost
    'FR': 15,  // Colissimo
    'AT': 8,   // DHL Austria
    'DEFAULT': 8, // DHL as fallback
  }

  return methodMap[country.toUpperCase()] || methodMap.DEFAULT
}
