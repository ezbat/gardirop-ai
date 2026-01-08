import { SANZO_WADA_PALETTES, getRandomSanzoPalette, type ColorPalette } from './sanzo-wada-colors'

export interface ClothingItem {
  id: string
  name: string
  category: string
  brand: string | null
  color_hex: string
  image_url: string
  season: string[]
  occasions: string[]
}

export interface OutfitResult {
  items: ClothingItem[]
  colorPalette: ColorPalette
  score: number
  reason: string
}

// Renk uyumunu hesapla (hex color karşılaştırma)
function calculateColorHarmony(color1: string, color2: string): number {
  const r1 = parseInt(color1.slice(1, 3), 16)
  const g1 = parseInt(color1.slice(3, 5), 16)
  const b1 = parseInt(color1.slice(5, 7), 16)
  
  const r2 = parseInt(color2.slice(1, 3), 16)
  const g2 = parseInt(color2.slice(3, 5), 16)
  const b2 = parseInt(color2.slice(5, 7), 16)
  
  const distance = Math.sqrt(
    Math.pow(r1 - r2, 2) +
    Math.pow(g1 - g2, 2) +
    Math.pow(b1 - b2, 2)
  )
  
  return 1 - (distance / 441.67) // Normalize 0-1
}

// En uyumlu Sanzo Wada paletini bul
function findBestSanzoPalette(clothingColors: string[]): ColorPalette {
  let bestPalette = SANZO_WADA_PALETTES[0]
  let bestScore = 0
  
  for (const palette of SANZO_WADA_PALETTES) {
    let totalScore = 0
    
    for (const clothingColor of clothingColors) {
      for (const paletteColor of palette.colors) {
        const harmony = calculateColorHarmony(clothingColor, paletteColor)
        totalScore += harmony
      }
    }
    
    const avgScore = totalScore / (clothingColors.length * palette.colors.length)
    
    if (avgScore > bestScore) {
      bestScore = avgScore
      bestPalette = palette
    }
  }
  
  return bestPalette
}

export function generateOutfit(
  allClothes: ClothingItem[],
  preferences?: {
    season?: string
    occasion?: string
  }
): OutfitResult | null {
  if (allClothes.length === 0) return null

  // Filtreleme
  let availableClothes = allClothes

  if (preferences?.season) {
    availableClothes = availableClothes.filter(item =>
      item.season.includes(preferences.season!)
    )
  }

  if (preferences?.occasion) {
    availableClothes = availableClothes.filter(item =>
      item.occasions.includes(preferences.occasion!)
    )
  }

  if (availableClothes.length < 2) {
    availableClothes = allClothes
  }

  // Kategori bazlı seçim
  const tops = availableClothes.filter(item =>
    ['T-shirt', 'Shirt', 'Blouse', 'Dress'].includes(item.category)
  )
  const bottoms = availableClothes.filter(item =>
    ['Pants', 'Skirt', 'Shorts'].includes(item.category)
  )
  const outerwear = availableClothes.filter(item =>
    ['Jacket', 'Coat', 'Cardigan'].includes(item.category)
  )
  const accessories = availableClothes.filter(item =>
    ['Shoes', 'Accessories', 'Bag', 'Hat'].includes(item.category)
  )

  const selectedItems: ClothingItem[] = []

  // Top seç
  if (tops.length > 0) {
    const randomTop = tops[Math.floor(Math.random() * tops.length)]
    selectedItems.push(randomTop)
  }

  // Bottom seç (elbise değilse)
  if (selectedItems[0]?.category !== 'Dress' && bottoms.length > 0) {
    const randomBottom = bottoms[Math.floor(Math.random() * bottoms.length)]
    selectedItems.push(randomBottom)
  }

  // %50 şans ile outerwear ekle
  if (Math.random() > 0.5 && outerwear.length > 0) {
    const randomOuter = outerwear[Math.floor(Math.random() * outerwear.length)]
    selectedItems.push(randomOuter)
  }

  // Aksesuar ekle
  if (accessories.length > 0) {
    const randomAccessory = accessories[Math.floor(Math.random() * accessories.length)]
    selectedItems.push(randomAccessory)
  }

  if (selectedItems.length === 0) return null

  // Kıyafetlerin renklerini topla
  const clothingColors = selectedItems.map(item => item.color_hex)

  // En uyumlu Sanzo Wada paletini bul
  const bestPalette = findBestSanzoPalette(clothingColors)

  // Renk uyum skoru
  let totalHarmony = 0
  for (let i = 0; i < clothingColors.length; i++) {
    for (let j = i + 1; j < clothingColors.length; j++) {
      totalHarmony += calculateColorHarmony(clothingColors[i], clothingColors[j])
    }
  }
  const harmonyScore = clothingColors.length > 1
    ? totalHarmony / ((clothingColors.length * (clothingColors.length - 1)) / 2)
    : 1

  const score = Math.round(harmonyScore * 100)

  return {
    items: selectedItems,
    colorPalette: bestPalette,
    score,
    reason: `Sanzo Wada "${bestPalette.name}" paletine göre ${score}% uyumlu`
  }
}

export function generateMultipleOutfits(
  allClothes: ClothingItem[],
  count: number = 3,
  preferences?: { season?: string; occasion?: string }
): OutfitResult[] {
  const outfits: OutfitResult[] = []
  
  for (let i = 0; i < count; i++) {
    const outfit = generateOutfit(allClothes, preferences)
    if (outfit) {
      outfits.push(outfit)
    }
  }
  
  return outfits.sort((a, b) => b.score - a.score)
}