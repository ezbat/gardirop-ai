// ============================================================================
// GELİŞMİŞ RENK TEORİSİ VE KOMBİNASYON SİSTEMİ
// ============================================================================

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 }
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255
  g /= 255
  b /= 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 }
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h /= 360
  s /= 100
  l /= 100

  let r, g, b

  if (s === 0) {
    r = g = b = l
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1/6) return p + (q - p) * 6 * t
      if (t < 1/2) return q
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
      return p
    }

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q

    r = hue2rgb(p, q, h + 1/3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1/3)
  }

  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) }
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
}

// ============================================================================
// RENK SICAKLIĞI ANALİZİ
// ============================================================================

export function getColorTemperature(hex: string): "warm" | "cool" | "neutral" {
  const rgb = hexToRgb(hex)
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
  const hue = hsl.h

  if ((hue >= 0 && hue <= 60) || (hue >= 300 && hue <= 360)) {
    return "warm"
  }
  else if (hue >= 180 && hue <= 300) {
    return "cool"
  }
  else {
    return "neutral"
  }
}

// ============================================================================
// RENK PSİKOLOJİSİ VE ANLAMI
// ============================================================================

export function getColorMeaning(hex: string): {
  emotion: string
  personality: string
  occasions: string[]
  seasons: string[]
} {
  const rgb = hexToRgb(hex)
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
  const hue = hsl.h
  const sat = hsl.s
  const light = hsl.l

  if (sat < 10) {
    if (light > 90) {
      return {
        emotion: "Saflık, Temizlik",
        personality: "Minimalist, Sofistike",
        occasions: ["Formal", "Work", "Casual"],
        seasons: ["Spring", "Summer", "Fall", "Winter"]
      }
    } else if (light < 20) {
      return {
        emotion: "Güç, Zarafet",
        personality: "Otoriter, Gizemli",
        occasions: ["Formal", "Party"],
        seasons: ["Fall", "Winter"]
      }
    } else {
      return {
        emotion: "Nötr, Dengeli",
        personality: "Profesyonel, Güvenilir",
        occasions: ["Work", "Casual"],
        seasons: ["Spring", "Summer", "Fall", "Winter"]
      }
    }
  }

  if (hue < 15 || hue > 345) {
    return {
      emotion: "Tutku, Enerji, Güç",
      personality: "Cesur, Kendinden emin",
      occasions: ["Party", "Date"],
      seasons: ["Fall", "Winter"]
    }
  }
  else if (hue >= 15 && hue < 45) {
    return {
      emotion: "Neşe, Yaratıcılık",
      personality: "Sosyal, Enerjik",
      occasions: ["Casual", "Sport"],
      seasons: ["Spring", "Summer"]
    }
  }
  else if (hue >= 45 && hue < 75) {
    return {
      emotion: "Mutluluk, İyimserlik",
      personality: "Neşeli, Pozitif",
      occasions: ["Casual", "Sport"],
      seasons: ["Spring", "Summer"]
    }
  }
  else if (hue >= 75 && hue < 150) {
    return {
      emotion: "Huzur, Denge, Doğa",
      personality: "Sakin, Dengeli",
      occasions: ["Casual", "Work"],
      seasons: ["Spring", "Summer"]
    }
  }
  else if (hue >= 150 && hue < 195) {
    return {
      emotion: "Berraklık, Sakinlik",
      personality: "Ferah, Açık fikirli",
      occasions: ["Casual", "Sport"],
      seasons: ["Summer"]
    }
  }
  else if (hue >= 195 && hue < 255) {
    return {
      emotion: "Güven, Sadakat, Barış",
      personality: "Güvenilir, Profesyonel",
      occasions: ["Work", "Formal", "Casual"],
      seasons: ["Spring", "Summer", "Fall", "Winter"]
    }
  }
  else if (hue >= 255 && hue < 285) {
    return {
      emotion: "Asalet, Yaratıcılık",
      personality: "Yaratıcı, Sofistike",
      occasions: ["Party", "Formal"],
      seasons: ["Fall", "Winter"]
    }
  }
  else {
    return {
      emotion: "Sevgi, Romantizm",
      personality: "Nazik, Romantik",
      occasions: ["Date", "Casual"],
      seasons: ["Spring", "Summer"]
    }
  }
}

// ============================================================================
// RENK HARMONİLERİ
// ============================================================================

export function getComplementaryColor(hex: string): string {
  const rgb = hexToRgb(hex)
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
  const newHue = (hsl.h + 180) % 360
  const newRgb = hslToRgb(newHue, hsl.s, hsl.l)
  return rgbToHex(newRgb.r, newRgb.g, newRgb.b)
}

export function getTriadicColors(hex: string): string[] {
  const rgb = hexToRgb(hex)
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
  const colors = []
  
  for (let i = 0; i < 3; i++) {
    const newHue = (hsl.h + (i * 120)) % 360
    const newRgb = hslToRgb(newHue, hsl.s, hsl.l)
    colors.push(rgbToHex(newRgb.r, newRgb.g, newRgb.b))
  }
  
  return colors
}

export function getAnalogousColors(hex: string): string[] {
  const rgb = hexToRgb(hex)
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
  const colors = []
  const offsets = [-30, 0, 30]
  
  for (const offset of offsets) {
    const newHue = (hsl.h + offset + 360) % 360
    const newRgb = hslToRgb(newHue, hsl.s, hsl.l)
    colors.push(rgbToHex(newRgb.r, newRgb.g, newRgb.b))
  }
  
  return colors
}

export function getSplitComplementaryColors(hex: string): string[] {
  const rgb = hexToRgb(hex)
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
  const complementHue = (hsl.h + 180) % 360
  
  const rgb1 = hslToRgb((complementHue - 30 + 360) % 360, hsl.s, hsl.l)
  const rgb2 = hslToRgb((complementHue + 30) % 360, hsl.s, hsl.l)
  
  return [
    hex,
    rgbToHex(rgb1.r, rgb1.g, rgb1.b),
    rgbToHex(rgb2.r, rgb2.g, rgb2.b)
  ]
}

export function getMonochromaticPalette(hex: string): string[] {
  const rgb = hexToRgb(hex)
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
  const colors = []
  const lightnesses = [20, 40, 60, 80, 95]
  
  for (const l of lightnesses) {
    const newRgb = hslToRgb(hsl.h, hsl.s, l)
    colors.push(rgbToHex(newRgb.r, newRgb.g, newRgb.b))
  }
  
  return colors
}

// ============================================================================
// KOMBİN SKORU
// ============================================================================

export function getColorHarmonyScore(colors: string[]): number {
  if (colors.length < 2) return 100
  
  let totalScore = 0
  let comparisons = 0
  
  for (let i = 0; i < colors.length; i++) {
    for (let j = i + 1; j < colors.length; j++) {
      const score = calculatePairScore(colors[i], colors[j])
      totalScore += score
      comparisons++
    }
  }
  
  return comparisons > 0 ? Math.round(totalScore / comparisons) : 100
}

function calculatePairScore(hex1: string, hex2: string): number {
  const rgb1 = hexToRgb(hex1)
  const hsl1 = rgbToHsl(rgb1.r, rgb1.g, rgb1.b)
  
  const rgb2 = hexToRgb(hex2)
  const hsl2 = rgbToHsl(rgb2.r, rgb2.g, rgb2.b)
  
  let score = 50
  
  let hueDiff = Math.abs(hsl1.h - hsl2.h)
  if (hueDiff > 180) hueDiff = 360 - hueDiff
  
  if (Math.abs(hueDiff - 180) < 15) score += 30
  else if (Math.abs(hueDiff - 120) < 15 || Math.abs(hueDiff - 240) < 15) score += 25
  else if (hueDiff < 30) score += 20
  else if (hueDiff > 150 && hueDiff < 210) score += 15
  
  const satDiff = Math.abs(hsl1.s - hsl2.s)
  if (satDiff < 20) score += 15
  else if (satDiff > 50) score -= 10
  
  const lightDiff = Math.abs(hsl1.l - hsl2.l)
  if (lightDiff > 30 && lightDiff < 60) score += 20
  else if (lightDiff < 10) score -= 15
  
  const temp1 = getColorTemperature(hex1)
  const temp2 = getColorTemperature(hex2)
  if (temp1 === temp2 || temp1 === "neutral" || temp2 === "neutral") {
    score += 10
  }
  
  return Math.max(0, Math.min(100, score))
}

// ============================================================================
// AKILLI KOMBİN ÖNERİSİ
// ============================================================================

export interface OutfitSuggestion {
  colors: string[]
  harmony: string
  score: number
  reasoning: string
  seasonMatch: string[]
  occasionMatch: string[]
  stylePersonality: string
}

export function generateOutfitSuggestion(baseColor: string, numColors: number = 3): OutfitSuggestion {
  const harmonies = [
    { name: "Complementary", colors: [baseColor, getComplementaryColor(baseColor)] },
    { name: "Triadic", colors: getTriadicColors(baseColor).slice(0, numColors) },
    { name: "Analogous", colors: getAnalogousColors(baseColor) },
    { name: "Split-Complementary", colors: getSplitComplementaryColors(baseColor) },
    { name: "Monochromatic", colors: getMonochromaticPalette(baseColor).slice(0, numColors) }
  ]
  
  const scoredHarmonies = harmonies.map(h => ({
    ...h,
    score: getColorHarmonyScore(h.colors)
  }))
  
  const best = scoredHarmonies.reduce((max, current) => 
    current.score > max.score ? current : max
  )
  
  const meaning = getColorMeaning(baseColor)
  
  return {
    colors: best.colors,
    harmony: best.name,
    score: best.score,
    reasoning: `${best.name} harmonisi kullanılarak ${best.score}/100 skor elde edildi. ` +
               `Bu renk kombinasyonu ${meaning.emotion.toLowerCase()} hissini veriyor.`,
    seasonMatch: meaning.seasons,
    occasionMatch: meaning.occasions,
    stylePersonality: meaning.personality
  }
}

// ============================================================================
// CİLT TONU UYUMU
// ============================================================================

export function getSkinToneHarmony(
  clothingHex: string, 
  skinTone: "fair" | "medium" | "olive" | "dark"
): {
  score: number
  recommendation: string
  betterAlternatives?: string[]
} {
  const rgb = hexToRgb(clothingHex)
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
  const temp = getColorTemperature(clothingHex)
  
  let score = 50
  let recommendation = ""
  
  if (skinTone === "fair") {
    if (temp === "cool") score += 30
    if (hsl.l > 50) score += 10
    if (hsl.s < 50) score += 10
    recommendation = "Açık ciltler için soğuk tonlar ve yumuşak renkler idealdir"
  }
  else if (skinTone === "medium") {
    score += 20
    if (hsl.s > 40 && hsl.s < 80) score += 20
    recommendation = "Orta tonlu ciltler neredeyse tüm renklerle uyumludur"
  }
  else if (skinTone === "olive") {
    if (temp === "warm") score += 30
    if ((hsl.h >= 15 && hsl.h <= 45) || (hsl.h >= 90 && hsl.h <= 150)) score += 15
    recommendation = "Zeytin tonlu ciltler için sıcak ve toprak tonları mükemmeldir"
  }
  else {
    if (hsl.s > 60) score += 25
    if (hsl.l > 40 && hsl.l < 70) score += 15
    recommendation = "Koyu ciltler için canlı ve yoğun renkler harika görünür"
  }
  
  return {
    score: Math.min(score, 100),
    recommendation,
    betterAlternatives: score < 70 ? generateBetterAlternatives(clothingHex, skinTone) : undefined
  }
}

function generateBetterAlternatives(hex: string, skinTone: string): string[] {
  const alternatives = []
  
  if (skinTone === "fair") {
    const rgb1 = hslToRgb(210, 60, 70)
    const rgb2 = hslToRgb(300, 40, 75)
    const rgb3 = hslToRgb(150, 30, 70)
    alternatives.push(rgbToHex(rgb1.r, rgb1.g, rgb1.b))
    alternatives.push(rgbToHex(rgb2.r, rgb2.g, rgb2.b))
    alternatives.push(rgbToHex(rgb3.r, rgb3.g, rgb3.b))
  } else if (skinTone === "olive") {
    const rgb1 = hslToRgb(30, 60, 55)
    const rgb2 = hslToRgb(120, 40, 45)
    const rgb3 = hslToRgb(15, 70, 50)
    alternatives.push(rgbToHex(rgb1.r, rgb1.g, rgb1.b))
    alternatives.push(rgbToHex(rgb2.r, rgb2.g, rgb2.b))
    alternatives.push(rgbToHex(rgb3.r, rgb3.g, rgb3.b))
  } else if (skinTone === "dark") {
    const rgb1 = hslToRgb(45, 100, 50)
    const rgb2 = hslToRgb(300, 80, 60)
    const rgb3 = hslToRgb(180, 70, 50)
    alternatives.push(rgbToHex(rgb1.r, rgb1.g, rgb1.b))
    alternatives.push(rgbToHex(rgb2.r, rgb2.g, rgb2.b))
    alternatives.push(rgbToHex(rgb3.r, rgb3.g, rgb3.b))
  }
  
  return alternatives
}
// ============================================================================
// RENK KATEGORİSİ
// ============================================================================

export function getColorCategory(hex: string): string {
  const rgb = hexToRgb(hex)
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
  const hue = hsl.h
  const sat = hsl.s
  const light = hsl.l

  // Renksiz (Siyah, Beyaz, Gri)
  if (sat < 10) {
    if (light > 90) return "White"
    if (light < 20) return "Black"
    return "Gray"
  }

  // Renkli kategoriler
  if (hue < 15 || hue > 345) return "Red"
  if (hue >= 15 && hue < 45) return "Orange"
  if (hue >= 45 && hue < 75) return "Yellow"
  if (hue >= 75 && hue < 150) return "Green"
  if (hue >= 150 && hue < 195) return "Cyan"
  if (hue >= 195 && hue < 255) return "Blue"
  if (hue >= 255 && hue < 285) return "Purple"
  if (hue >= 285 && hue < 345) return "Pink"

  return "Unknown"
}

// ============================================================================
// EN İYİ RENK EŞLEŞTİRME
// ============================================================================

export function findBestColorMatch(
  baseColorHex: string,
  availableColors: string[]
): {
  bestMatch: string
  score: number
  reasoning: string
} {
  if (availableColors.length === 0) {
    return {
      bestMatch: baseColorHex,
      score: 0,
      reasoning: "Uygun renk bulunamadı"
    }
  }

  let bestMatch = availableColors[0]
  let bestScore = 0
  let bestReasoning = ""

  for (const color of availableColors) {
    // Ana renkle karşılaştır
    const score = calculatePairScore(baseColorHex, color)
    
    if (score > bestScore) {
      bestScore = score
      bestMatch = color
      
      // Harmoniye göre açıklama
      const rgb1 = hexToRgb(baseColorHex)
      const hsl1 = rgbToHsl(rgb1.r, rgb1.g, rgb1.b)
      
      const rgb2 = hexToRgb(color)
      const hsl2 = rgbToHsl(rgb2.r, rgb2.g, rgb2.b)
      
      let hueDiff = Math.abs(hsl1.h - hsl2.h)
      if (hueDiff > 180) hueDiff = 360 - hueDiff
      
      if (Math.abs(hueDiff - 180) < 15) {
        bestReasoning = "Complementary harmony (karşıt renk uyumu)"
      } else if (Math.abs(hueDiff - 120) < 15 || Math.abs(hueDiff - 240) < 15) {
        bestReasoning = "Triadic harmony (üçlü renk uyumu)"
      } else if (hueDiff < 30) {
        bestReasoning = "Analogous harmony (komşu renk uyumu)"
      } else {
        bestReasoning = "Balanced color combination (dengeli kombinasyon)"
      }
    }
  }

  return {
    bestMatch,
    score: bestScore,
    reasoning: bestReasoning
  }
}