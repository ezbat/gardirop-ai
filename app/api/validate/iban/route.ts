import { NextRequest, NextResponse } from 'next/server'

// IBAN mod-97 algoritması ile doğrulama
function validateIBAN(iban: string): boolean {
  // Boşlukları temizle ve büyük harfe çevir
  const cleaned = iban.replace(/\s/g, '').toUpperCase()

  // Uzunluk kontrolü (Almanya için 22 karakter)
  if (cleaned.length !== 22 || !cleaned.startsWith('DE')) {
    return false
  }

  // Karakterleri sayıya çevir
  const rearranged = cleaned.substring(4) + cleaned.substring(0, 4)
  let numericString = ''

  for (let i = 0; i < rearranged.length; i++) {
    const char = rearranged[i]
    if (char >= '0' && char <= '9') {
      numericString += char
    } else {
      // A=10, B=11, ..., Z=35
      numericString += (char.charCodeAt(0) - 55).toString()
    }
  }

  // Mod 97 hesaplama
  let remainder = BigInt(numericString) % BigInt(97)

  return remainder === BigInt(1)
}

// BIC/SWIFT doğrulama
function validateBIC(bic: string): boolean {
  // BIC formatı: 8 veya 11 karakter (AAAA BB CC [DDD])
  // AAAA: Banka kodu, BB: Ülke kodu, CC: Lokasyon, DDD: Şube (opsiyonel)
  const cleaned = bic.replace(/\s/g, '').toUpperCase()
  const bicRegex = /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/
  return bicRegex.test(cleaned)
}

export async function POST(request: NextRequest) {
  try {
    const { iban, bic } = await request.json()

    const result: any = {
      iban: {
        valid: false,
        formatted: '',
        bankCode: '',
        accountNumber: ''
      }
    }

    // IBAN doğrulama
    if (iban) {
      const cleaned = iban.replace(/\s/g, '').toUpperCase()
      const isValid = validateIBAN(cleaned)

      if (isValid) {
        // IBAN'ı 4'lü gruplara ayır
        const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned

        // Alman IBAN'ından banka kodu ve hesap numarası extract et
        // DE + 2 kontrol + 8 banka kodu + 10 hesap numarası
        const bankCode = cleaned.substring(4, 12)
        const accountNumber = cleaned.substring(12)

        result.iban = {
          valid: true,
          formatted,
          bankCode,
          accountNumber,
          message: 'IBAN ist gültig'
        }

        // Banka adını belirle (basit bir mapping, gerçekte API kullanılabilir)
        result.iban.bankName = getBankName(bankCode)
      } else {
        result.iban = {
          valid: false,
          error: 'Ungültige IBAN. Bitte überprüfen Sie die Eingabe.'
        }
      }
    }

    // BIC doğrulama
    if (bic) {
      const isValid = validateBIC(bic)
      result.bic = {
        valid: isValid,
        message: isValid ? 'BIC ist gültig' : 'Ungültiger BIC/SWIFT-Code'
      }
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('IBAN validation error:', error)
    return NextResponse.json({
      error: 'Validation failed'
    }, { status: 500 })
  }
}

// Basit banka kodu -> banka adı mapping (Almanya'nın en büyük bankaları)
function getBankName(bankCode: string): string {
  const banks: Record<string, string> = {
    '10050000': 'Berliner Sparkasse',
    '10070000': 'Deutsche Bank Berlin',
    '10080000': 'Commerzbank Berlin',
    '10090000': 'Berliner Volksbank',
    '12070000': 'Deutsche Bank Brandenburg',
    '20050000': 'Hamburger Sparkasse',
    '20070000': 'Deutsche Bank Hamburg',
    '25050000': 'Sparkasse Hannover',
    '37040044': 'Commerzbank Köln',
    '50050000': 'Sparkasse KölnBonn',
    '50070010': 'Deutsche Bank Köln',
    '60050101': 'Sparkasse Baden-Baden/Rastatt',
    '60070070': 'Deutsche Bank Stuttgart',
    '70050000': 'Stadtsparkasse München',
    '70070010': 'Deutsche Bank München',
    '79050000': 'Sparkasse Ulm',
  }

  return banks[bankCode] || 'Deutsche Bank'
}
