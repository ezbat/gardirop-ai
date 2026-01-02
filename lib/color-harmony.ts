// lib/color-harmony.ts
// AI Renk Uyumu Sistemi - Profesyonel moda renk kombinasyonları

interface RGB {
  r: number
  g: number
  b: number
}

interface HSL {
  h: number
  s: number
  l: number
}

// Hex rengi RGB'ye çevir
function hexToRgb(hex: string): RGB {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 }
}

// RGB'yi HSL'ye çevir (renk teorisi için)
function rgbToHsl(rgb: RGB): HSL {
  const r = rgb.r / 255
  const g = rgb.g / 255
  const b = rgb.b / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 }
}

// Renk parlaklığı (0-255)
function getLuminance(rgb: RGB): number {
  return 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b
}

// İki renk uyumlu mu? (Moda kurallarına göre)
export function areColorsHarmonious(color1: string, color2: string): boolean {
  const rgb1 = hexToRgb(color1)
  const rgb2 = hexToRgb(color2)
  const hsl1 = rgbToHsl(rgb1)
  const hsl2 = rgbToHsl(rgb2)

  // Aynı renk tonları (monochromatic) - Her zaman uyumlu
  const hueDiff = Math.abs(hsl1.h - hsl2.h)
  if (hueDiff < 30) return true

  // Tamamlayıcı renkler (complementary) - Karşı renkler (180°)
  if (Math.abs(hueDiff - 180) < 30) return true

  // Analog renkler (bitişik renkler, 30° fark)
  if (hueDiff < 60) return true

  // Split-complementary (150° veya 210°)
  if (Math.abs(hueDiff - 150) < 30 || Math.abs(hueDiff - 210) < 30) return true

  // Nötr renkler her zaman uyumlu (gri, beyaz, siyah, bej)
  const isNeutral1 = hsl1.s < 20 || hsl1.l > 90 || hsl1.l < 10
  const isNeutral2 = hsl2.s < 20 || hsl2.l > 90 || hsl2.l < 10
  if (isNeutral1 || isNeutral2) return true

  return false
}

// Kontrast skoru (0-100) - Üst/alt kıyafet arasında kontrast önemli
export function getContrastScore(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1)
  const rgb2 = hexToRgb(color2)
  const lum1 = getLuminance(rgb1)
  const lum2 = getLuminance(rgb2)

  const contrast = Math.abs(lum1 - lum2)
  return Math.min((contrast / 255) * 100, 100)
}

// Renk uyum skoru (0-100) - Ne kadar uyumlu?
export function getColorHarmonyScore(colors: string[]): number {
  if (colors.length < 2) return 100

  let totalScore = 0
  let comparisons = 0

  // Her renk çiftini karşılaştır
  for (let i = 0; i < colors.length; i++) {
    for (let j = i + 1; j < colors.length; j++) {
      const harmonious = areColorsHarmonious(colors[i], colors[j])
      const contrast = getContrastScore(colors[i], colors[j])

      // Uyumlu + yeterli kontrast = iyi skor
      let pairScore = 0
      if (harmonious) pairScore += 60
      if (contrast > 20) pairScore += 40 // En az %20 kontrast olmalı

      totalScore += pairScore
      comparisons++
    }
  }

  return comparisons > 0 ? Math.round(totalScore / comparisons) : 50
}

// Sezona göre renk önceliklendirme
export function getSeasonalColorScore(color: string, month: number): number {
  const hsl = rgbToHsl(hexToRgb(color))
  
  // Kış (Aralık-Şubat): Koyu, derin renkler
  if (month === 11 || month === 0 || month === 1) {
    if (hsl.l < 40) return 100 // Koyu renkler
    if (hsl.l > 80) return 60 // Açık renkler daha az
    return 80
  }
  
  // İlkbahar (Mart-Mayıs): Pastel, taze renkler
  if (month >= 2 && month <= 4) {
    if (hsl.l > 70 && hsl.s > 30) return 100 // Pastel
    return 70
  }
  
  // Yaz (Haziran-Ağustos): Parlak, canlı renkler
  if (month >= 5 && month <= 7) {
    if (hsl.l > 60 && hsl.s > 50) return 100 // Canlı
    if (hsl.l > 85) return 100 // Beyaz/açık
    return 70
  }
  
  // Sonbahar (Eylül-Kasım): Toprak tonları, sıcak renkler
  // Turuncu, kahverengi, bordo (hue 0-60)
  if (hsl.h < 60 && hsl.s > 40) return 100
  if (hsl.l < 50) return 90
  return 75
}

// Profesyonel moda renk paletleri
export const FASHION_COLOR_PALETTES = {
  // Klasik kombinler
  classic: [
    ["#000000", "#FFFFFF"], // Siyah-Beyaz
    ["#000000", "#C0C0C0"], // Siyah-Gümüş
    ["#001F3F", "#FFFFFF"], // Lacivert-Beyaz
  ],
  
  // Doğal/organik
  earth: [
    ["#8B4513", "#F5DEB3"], // Kahve-Bej
    ["#556B2F", "#F0E68C"], // Zeytin-Krem
    ["#A0522D", "#FAEBD7"], // Taba-Kırık Beyaz
  ],
  
  // Canlı/dinamik
  vibrant: [
    ["#FF6B6B", "#4ECDC4"], // Kırmızı-Turkuaz
    ["#FFD93D", "#6BCF7F"], // Sarı-Yeşil
    ["#A8E6CF", "#FF8B94"], // Mint-Pembe
  ],
  
  // Zarif/şık
  elegant: [
    ["#2C3E50", "#ECF0F1"], // Koyu Gri-Açık Gri
    ["#34495E", "#BDC3C7"], // Antrasit-Gri
    ["#1A1A2E", "#E8E8E8"], // Neredeyse Siyah-Açık Gri
  ],
}

// İki kıyafetin renk uyumunu kontrol et
export function checkOutfitColorCompatibility(items: { color: string }[]): {
  score: number
  recommendation: string
} {
  const colors = items.map((item) => item.color)
  const score = getColorHarmonyScore(colors)

  let recommendation = ""
  if (score >= 80) recommendation = "Mükemmel renk uyumu! 🎨"
  else if (score >= 60) recommendation = "İyi bir kombinasyon ✨"
  else if (score >= 40) recommendation = "Kabul edilebilir, ama daha iyisi olabilir 🤔"
  else recommendation = "Renk uyumsuzluğu var, başka kombinler deneyin 🔄"

  return { score, recommendation }
}