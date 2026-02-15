/**
 * Shipping Tracking Utilities
 * NO API CALLS - Only validation and tracking URLs
 */

/**
 * Validate tracking number format
 */
export function validateTrackingNumber(trackingNumber: string, carrier: string): boolean {
  const cleaned = trackingNumber.replace(/\s/g, '').toUpperCase()

  switch (carrier.toLowerCase()) {
    case 'dhl':
      // DHL Germany: 12-14 digits or JJD format
      return /^(\d{12,14}|JJD\d{20})$/.test(cleaned)

    case 'dpd':
      // DPD: 14 digits
      return /^\d{14}$/.test(cleaned)

    case 'hermes':
      // Hermes: 16 digits
      return /^\d{16}$/.test(cleaned)

    case 'ups':
      // UPS: 18 digits starting with 1Z
      return /^1Z[0-9A-Z]{16}$/.test(cleaned)

    case 'fedex':
      // FedEx: 12-14 digits
      return /^\d{12,14}$/.test(cleaned)

    default:
      // Manual shipping: any non-empty string
      return cleaned.length > 0
  }
}

/**
 * Get tracking URL for carrier website
 */
export function getTrackingURL(trackingNumber: string, carrier: string): string {
  const cleaned = trackingNumber.replace(/\s/g, '')

  switch (carrier.toLowerCase()) {
    case 'dhl':
      return `https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html?piececode=${cleaned}`

    case 'dpd':
      return `https://tracking.dpd.de/parcelstatus?query=${cleaned}&locale=de_DE`

    case 'hermes':
      return `https://www.myhermes.de/empfangen/sendungsverfolgung/sendungsinformation/#${cleaned}`

    case 'ups':
      return `https://www.ups.com/track?tracknum=${cleaned}`

    case 'fedex':
      return `https://www.fedex.com/fedextrack/?tracknumbers=${cleaned}`

    default:
      return ''
  }
}

/**
 * Get carrier name in German
 */
export function getCarrierName(carrier: string): string {
  const names: Record<string, string> = {
    'dhl': 'DHL',
    'dpd': 'DPD',
    'hermes': 'Hermes',
    'ups': 'UPS',
    'fedex': 'FedEx',
    'manual': 'Manuell'
  }

  return names[carrier.toLowerCase()] || carrier
}
