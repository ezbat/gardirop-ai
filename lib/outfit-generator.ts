import { supabase } from './supabase'

export interface ClothingItem {
  id: string
  user_id: string
  name: string
  category: string
  brand: string | null
  color_hex: string
  image_url: string
  season: string[]
  occasions: string[]
  is_favorite: boolean
}

export interface OutfitSuggestion {
  id: string
  items: ClothingItem[]
  score: number
  reasoning: string
  colorHarmony: number
  styleNotes: string[]
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : { r: 0, g: 0, b: 0 }
}

function getColorHarmonyScore(colors: string[]): number {
  if (colors.length < 2) return 100
  let totalScore = 0
  let comparisons = 0
  for (let i = 0; i < colors.length; i++) {
    for (let j = i + 1; j < colors.length; j++) {
      const rgb1 = hexToRgb(colors[i])
      const rgb2 = hexToRgb(colors[j])
      const brightness1 = (rgb1.r + rgb1.g + rgb1.b) / 3
      const brightness2 = (rgb2.r + rgb2.g + rgb2.b) / 3
      const brightnessDiff = Math.abs(brightness1 - brightness2)
      let contrastScore = 100
      if (brightnessDiff < 30) contrastScore = 50
      else if (brightnessDiff > 150) contrastScore = 70
      else contrastScore = 95
      const warmth1 = rgb1.r - rgb1.b
      const warmth2 = rgb2.r - rgb2.b
      const warmthMatch = Math.abs(warmth1 - warmth2) < 100 ? 95 : 75
      totalScore += (contrastScore + warmthMatch) / 2
      comparisons++
    }
  }
  return comparisons > 0 ? totalScore / comparisons : 100
}

export async function generateOutfits(userId: string, options: { weatherTemp?: number; maxOutfits?: number } = {}): Promise<OutfitSuggestion[]> {
  const { weatherTemp = 20, maxOutfits = 3 } = options
  const { data: allClothes, error } = await supabase.from('clothes').select('*').eq('user_id', userId)
  if (error || !allClothes || allClothes.length === 0) return []
  const tops = allClothes.filter(c => ['T-shirt', 'Shirt', 'Sweater'].includes(c.category))
  const bottoms = allClothes.filter(c => ['Pants', 'Shorts', 'Skirt'].includes(c.category))
  const dresses = allClothes.filter(c => c.category === 'Dress')
  const outerwear = allClothes.filter(c => ['Jacket', 'Coat'].includes(c.category))
  const shoes = allClothes.filter(c => c.category === 'Shoes')
  const outfits: ClothingItem[][] = []
  for (const dress of dresses.slice(0, 2)) {
    const combo: ClothingItem[] = [dress]
    if (shoes.length > 0) combo.push(shoes[0])
    outfits.push(combo)
  }
  const maxTops = Math.min(tops.length, 4)
  const maxBottoms = Math.min(bottoms.length, 3)
  for (let i = 0; i < maxTops; i++) {
    for (let j = 0; j < maxBottoms; j++) {
      const combo: ClothingItem[] = [tops[i], bottoms[j]]
      if (shoes.length > 0) {
        const bestShoe = findBestColorMatch(combo, shoes)
        if (bestShoe) combo.push(bestShoe)
      }
      if (weatherTemp < 15 && outerwear.length > 0) {
        const bestJacket = findBestColorMatch(combo, outerwear)
        if (bestJacket) combo.push(bestJacket)
      }
      outfits.push(combo)
      if (outfits.length >= maxOutfits * 3) break
    }
    if (outfits.length >= maxOutfits * 3) break
  }
  const scored = outfits.map((items, idx) => scoreOutfit(items, idx)).sort((a, b) => b.score - a.score).slice(0, maxOutfits)
  return scored
}

function findBestColorMatch(currentItems: ClothingItem[], candidates: ClothingItem[]): ClothingItem | null {
  if (candidates.length === 0) return null
  const currentColors = currentItems.map(item => item.color_hex)
  let bestMatch = candidates[0]
  let bestScore = 0
  for (const candidate of candidates) {
    const allColors = [...currentColors, candidate.color_hex]
    const score = getColorHarmonyScore(allColors)
    if (score > bestScore) {
      bestScore = score
      bestMatch = candidate
    }
  }
  return bestMatch
}

function scoreOutfit(items: ClothingItem[], index: number): OutfitSuggestion {
  const colors = items.map(item => item.color_hex)
  const colorScore = getColorHarmonyScore(colors)
  let totalScore = colorScore
  const favoriteCount = items.filter(item => item.is_favorite).length
  totalScore += favoriteCount * 5
  const uniqueCategories = new Set(items.map(item => item.category)).size
  totalScore += uniqueCategories * 2
  const styleNotes: string[] = []
  if (colorScore > 90) styleNotes.push('Mükemmel renk uyumu! 🎨')
  else if (colorScore > 75) styleNotes.push('Harika kombinasyon! ✨')
  else if (colorScore > 60) styleNotes.push('İyi bir seçim! 👍')
  if (favoriteCount > 0) styleNotes.push(`${favoriteCount} favori parça ❤️`)
  let reasoning = `Bu kombin ${Math.round(colorScore)} renk uyumu skoruna sahip. `
  if (colorScore > 85) reasoning += 'Renkler birbirini mükemmel tamamlıyor!'
  else if (colorScore > 70) reasoning += 'Dengeli bir renk paleti.'
  else reasoning += 'Klasik bir kombinasyon.'
  return { id: `outfit-${index}`, items, score: Math.round(totalScore), reasoning, colorHarmony: Math.round(colorScore), styleNotes }
}