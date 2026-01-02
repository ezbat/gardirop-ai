import { supabase } from './supabase'
import { getColorHarmonyScore, generateOutfitSuggestion } from './color-theory'

// ============================================================================
// INTERFACES
// ============================================================================

interface ClothingItem {
  id: string
  user_id: string
  name: string
  category: string
  brand: string | null
  color_hex: string
  color_palette: string[]
  image_url: string
  season: string[]
  occasions: string[]
  is_favorite: boolean
  ai_metadata: any
}

export interface OutfitSuggestion {
  items: ClothingItem[]
  score: number
  reasoning: string
  season: string
  occasion: string
  colorHarmony: string
  styleNotes: string[]
}

// ============================================================================
// ANA OUTFIT GENERATOR
// ============================================================================

export async function generateOutfits(
  userId: string,
  options: {
    season?: string
    occasion?: string
    weatherTemp?: number
    maxOutfits?: number
  } = {}
): Promise<OutfitSuggestion[]> {
  const { season, occasion, maxOutfits = 5 } = options

  console.log('🎨 Generating outfits for user:', userId)

  // 1. TÜM kıyafetleri çek (filtre yok!)
  const { data: allClothes, error } = await supabase
    .from('clothes')
    .select('*')
    .eq('user_id', userId)

  console.log('📊 Total clothes found:', allClothes?.length || 0)

  if (error) {
    console.error('❌ Supabase error:', error)
    return []
  }

  if (!allClothes || allClothes.length === 0) {
    console.warn('⚠️ No clothes found for user')
    return []
  }

  // 2. Kategorilere ayır
  const tops = allClothes.filter(c => 
    c.category === 'T-shirt' || 
    c.category === 'Shirt' || 
    c.category === 'Sweater'
  )
  
  const bottoms = allClothes.filter(c => 
    c.category === 'Pants' || 
    c.category === 'Shorts' || 
    c.category === 'Skirt'
  )
  
  const dresses = allClothes.filter(c => c.category === 'Dress')
  const outerwear = allClothes.filter(c => c.category === 'Jacket' || c.category === 'Coat')
  const shoes = allClothes.filter(c => c.category === 'Shoes')
  const accessories = allClothes.filter(c => c.category === 'Accessories')

  console.log('👕 Tops:', tops.length)
  console.log('👖 Bottoms:', bottoms.length)
  console.log('👗 Dresses:', dresses.length)
  console.log('🧥 Outerwear:', outerwear.length)
  console.log('👟 Shoes:', shoes.length)

  const outfits: ClothingItem[][] = []

  // 3. Dress kombinasyonları
  for (const dress of dresses.slice(0, 3)) {
    const combo: ClothingItem[] = [dress]
    
    if (shoes.length > 0) {
      combo.push(shoes[0])
    }
    
    outfits.push(combo)
  }

  // 4. Top + Bottom kombinasyonları
  for (let i = 0; i < Math.min(tops.length, 5); i++) {
    for (let j = 0; j < Math.min(bottoms.length, 3); j++) {
      const combo: ClothingItem[] = [tops[i], bottoms[j]]
      
      // Ayakkabı ekle
      if (shoes.length > 0) {
        const bestShoe = findBestColorMatch(combo, shoes)
        if (bestShoe) combo.push(bestShoe)
      }
      
      // Dış giyim ekle (sezon kontrolü ile)
      if (season === 'Fall' || season === 'Winter') {
        if (outerwear.length > 0) {
          const bestOuter = findBestColorMatch(combo, outerwear)
          if (bestOuter) combo.push(bestOuter)
        }
      }
      
      outfits.push(combo)
      
      // Maksimum kombinasyon sınırı
      if (outfits.length >= maxOutfits * 2) break
    }
    if (outfits.length >= maxOutfits * 2) break
  }

  console.log('✨ Total combinations created:', outfits.length)

  // 5. Skorla ve sırala
  const scoredOutfits = outfits
    .map(items => scoreOutfit(items, season || 'Spring', occasion || 'Casual'))
    .sort((a, b) => b.score - a.score)
    .slice(0, maxOutfits)

  console.log('🏆 Top outfit score:', scoredOutfits[0]?.score || 0)

  return scoredOutfits
}

// ============================================================================
// EN UYGUN RENK EŞLEŞMESİ
// ============================================================================

function findBestColorMatch(
  currentItems: ClothingItem[],
  candidates: ClothingItem[]
): ClothingItem | null {
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

// ============================================================================
// OUTFIT SKORLAMA
// ============================================================================

function scoreOutfit(
  items: ClothingItem[],
  season: string,
  occasion: string
): OutfitSuggestion {
  let score = 0
  const styleNotes: string[] = []
  
  // 1. Renk Harmonisi (50 puan)
  const colors = items.map(item => item.color_hex)
  const colorScore = getColorHarmonyScore(colors)
  score += colorScore * 0.5
  
  if (colorScore > 85) {
    styleNotes.push("Muhteşem renk uyumu! 🎨")
  } else if (colorScore > 70) {
    styleNotes.push("Harika renk kombinasyonu ✨")
  } else if (colorScore > 50) {
    styleNotes.push("İyi bir kombinasyon 👍")
  }
  
  // 2. Sezon Uyumu (25 puan)
  const seasonMatch = items.filter(item => 
    item.season.length === 0 || item.season.includes(season)
  ).length
  const seasonScore = (seasonMatch / items.length) * 100
  score += seasonScore * 0.25
  
  if (seasonScore > 75) {
    styleNotes.push(`${season} için ideal 🌸`)
  }
  
  // 3. Etkinlik Uyumu (15 puan)
  const occasionMatch = items.filter(item => 
    item.occasions.length === 0 || item.occasions.includes(occasion)
  ).length
  const occasionScore = (occasionMatch / items.length) * 100
  score += occasionScore * 0.15
  
  if (occasionScore > 75) {
    styleNotes.push(`${occasion} için uygun 👌`)
  }
  
  // 4. Favoriler Bonusu (10 puan)
  const favoriteCount = items.filter(item => item.is_favorite).length
  const favoriteScore = (favoriteCount / items.length) * 100
  score += favoriteScore * 0.1
  
  if (favoriteCount > 0) {
    styleNotes.push(`${favoriteCount} favori parça ❤️`)
  }
  
  // Harmoni tipini belirle
  const mainColor = colors[0]
  const suggestion = generateOutfitSuggestion(mainColor, colors.length)
  
  // Reasoning oluştur
  let reasoning = `Bu kombin ${Math.round(colorScore)} renk harmonisi skoruna sahip. `
  
  if (colorScore > 80) {
    reasoning += "Renkler birbirini mükemmel tamamlıyor. "
  } else if (colorScore > 60) {
    reasoning += "Dengeli bir renk paleti. "
  } else {
    reasoning += "Klasik bir kombinasyon. "
  }
  
  reasoning += `${suggestion.harmony} renk harmonisi kullanılmış.`
  
  return {
    items,
    score: Math.round(score),
    reasoning,
    season,
    occasion,
    colorHarmony: suggestion.harmony,
    styleNotes
  }
}

// ============================================================================
// HAVA DURUMLARINA GÖRE ÖNERİ
// ============================================================================

export function getWeatherBasedSuggestion(temp: number): {
  season: string
  layers: number
  suggestion: string
} {
  if (temp < 0) {
    return {
      season: 'Winter',
      layers: 3,
      suggestion: 'Çok soğuk! Kat kat giyinin.'
    }
  } else if (temp < 10) {
    return {
      season: 'Winter',
      layers: 2,
      suggestion: 'Soğuk hava. Mont gerekli.'
    }
  } else if (temp < 18) {
    return {
      season: 'Fall',
      layers: 2,
      suggestion: 'Serin hava. Ceket alın.'
    }
  } else if (temp < 25) {
    return {
      season: 'Spring',
      layers: 1,
      suggestion: 'Güzel hava!'
    }
  } else {
    return {
      season: 'Summer',
      layers: 1,
      suggestion: 'Sıcak! Hafif giyin.'
    }
  }
}

// ============================================================================
// OUTFIT KAYDETME
// ============================================================================

export async function saveOutfit(
  userId: string,
  outfit: OutfitSuggestion,
  name: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('outfits')
      .insert({
        user_id: userId,
        name,
        cloth_ids: outfit.items.map(item => item.id),
        season: outfit.season,
        occasion: outfit.occasion,
        color_harmony_score: outfit.score,
        style_score: outfit.score,
        is_public: false
      })
      .select()
      .single()

    if (error) {
      console.error('Save outfit error:', error)
      throw error
    }

    console.log('✅ Outfit saved:', data.id)
    return data.id
  } catch (error) {
    console.error('Save outfit failed:', error)
    return null
  }
}