import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Luhn algorithm to validate card number
function validateCardNumber(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\D/g, '')

  // Accept 15 digits (AMEX) or 16 digits (VISA, MC, etc.)
  if (digits.length !== 15 && digits.length !== 16) {
    console.log('Invalid length:', digits.length)
    return false
  }

  let sum = 0
  let isEven = false

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i])

    if (isEven) {
      digit *= 2
      if (digit > 9) {
        digit -= 9
      }
    }

    sum += digit
    isEven = !isEven
  }

  const valid = sum % 10 === 0
  console.log('Card validation - Digits:', digits, 'Sum:', sum, 'Valid:', valid)
  return valid
}

// Detect card brand from number
function detectCardBrand(cardNumber: string): string {
  const digits = cardNumber.replace(/\D/g, '')

  // Visa: starts with 4
  if (digits.startsWith('4')) return 'VISA'

  // Mastercard: starts with 51-55 or 2221-2720
  if (/^5[1-5]/.test(digits) || /^2[2-7]/.test(digits)) return 'MASTERCARD'

  // American Express: starts with 34 or 37
  if (/^3[47]/.test(digits)) return 'AMEX'

  // Discover: starts with 6011, 622126-622925, 644-649, or 65
  if (/^6011|^62212[6-9]|^6229[01]|^62292[0-5]|^64[4-9]|^65/.test(digits)) return 'DISCOVER'

  return 'UNKNOWN'
}

// Validate expiry date
function validateExpiry(month: string, year: string): boolean {
  const now = new Date()
  const currentYear = now.getFullYear() % 100 // Get last 2 digits
  const currentMonth = now.getMonth() + 1

  const expiryMonth = parseInt(month)
  const expiryYear = parseInt(year)

  if (expiryMonth < 1 || expiryMonth > 12) return false
  if (expiryYear < currentYear) return false
  if (expiryYear === currentYear && expiryMonth < currentMonth) return false

  return true
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { cardNumber, cardHolder, expiryMonth, expiryYear, cvv } = await request.json()

    // Validation
    if (!cardNumber || !cardHolder || !expiryMonth || !expiryYear || !cvv) {
      return NextResponse.json({ error: 'Tüm alanlar zorunludur' }, { status: 400 })
    }

    // Validate card number with Luhn algorithm
    if (!validateCardNumber(cardNumber)) {
      return NextResponse.json({ error: 'Geçersiz kart numarası' }, { status: 400 })
    }

    // Validate expiry date
    if (!validateExpiry(expiryMonth, expiryYear)) {
      return NextResponse.json({ error: 'Kartın süresi dolmuş veya geçersiz' }, { status: 400 })
    }

    // Validate CVV (3 digits for most cards, 4 for AMEX)
    if ((cvv.length !== 3 && cvv.length !== 4) || !/^\d{3,4}$/.test(cvv)) {
      return NextResponse.json({ error: 'Geçersiz CVV' }, { status: 400 })
    }

    // Validate card holder name (allow letters and spaces, case insensitive)
    if (cardHolder.length < 3 || !/^[A-Za-z\s]+$/.test(cardHolder)) {
      console.log('Invalid card holder:', cardHolder)
      return NextResponse.json({ error: 'Geçersiz kart sahibi adı - Sadece harf ve boşluk kullanın' }, { status: 400 })
    }

    // Detect card brand
    const cardBrand = detectCardBrand(cardNumber)
    if (cardBrand === 'UNKNOWN') {
      return NextResponse.json({ error: 'Desteklenmeyen kart türü' }, { status: 400 })
    }

    // Get seller
    const { data: seller, error: sellerError } = await supabase
      .from('sellers')
      .select('id, card_verified')
      .eq('user_id', userId)
      .single()

    if (sellerError || !seller) {
      return NextResponse.json({ error: 'Satıcı bulunamadı' }, { status: 404 })
    }

    // Check if card already verified (security - one-time only)
    if (seller.card_verified) {
      return NextResponse.json({
        error: 'Kart zaten doğrulanmış. Değiştirmek için destek ekibiyle iletişime geçin.'
      }, { status: 400 })
    }

    // Get last 4 digits
    const last4 = cardNumber.slice(-4)

    // In production, you would:
    // 1. Tokenize the card with a payment processor (Stripe, PayPal, etc.)
    // 2. Perform a $0.00 or $1.00 authorization to verify the card is valid
    // 3. Store only the token, last4, and brand

    // For now, we'll simulate successful verification
    // NEVER store full card details in production!

    // Store card info (in production: store payment token, not raw data)
    const { error: updateError } = await supabase
      .from('sellers')
      .update({
        card_last4: last4,
        card_brand: cardBrand,
        card_verified: true,
        // In production: card_token: tokenFromPaymentProcessor
        updated_at: new Date().toISOString()
      })
      .eq('id', seller.id)

    if (updateError) throw updateError

    return NextResponse.json({
      success: true,
      message: 'Kart başarıyla doğrulandı',
      card: {
        last4,
        brand: cardBrand,
        verified: true
      }
    })

  } catch (error) {
    console.error('Card verification error:', error)
    return NextResponse.json({ error: 'Kart doğrulama sırasında hata oluştu' }, { status: 500 })
  }
}
