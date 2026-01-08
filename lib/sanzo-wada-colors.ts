// Sanzo Wada'nın ünlü "A Dictionary of Color Combinations" kitabından
// Seçilmiş 30 harmonik renk paleti

export interface ColorPalette {
  id: string
  name: string
  colors: string[] // 2-4 renk kombinasyonu
  season?: 'Spring' | 'Summer' | 'Fall' | 'Winter'
  mood?: string
}

export const SANZO_WADA_PALETTES: ColorPalette[] = [
  // Spring Combinations
  { id: 'c001', name: 'Cherry Blossom', colors: ['#F8B595', '#F5E6E8', '#D5C4DF'], season: 'Spring', mood: 'Soft & Romantic' },
  { id: 'c002', name: 'Fresh Green', colors: ['#B8D4A8', '#E8F3D6', '#F9F5E3'], season: 'Spring', mood: 'Fresh & Natural' },
  { id: 'c003', name: 'Spring Garden', colors: ['#F7B2BD', '#FFF8DC', '#B4E7CE'], season: 'Spring', mood: 'Playful & Light' },
  { id: 'c004', name: 'Pastel Dream', colors: ['#E8D5C4', '#F0EBE3', '#C9D8D3'], season: 'Spring', mood: 'Calm & Serene' },
  { id: 'c005', name: 'Morning Dew', colors: ['#D4EAF0', '#F5F5DC', '#E6E2D3'], season: 'Spring', mood: 'Refreshing' },

  // Summer Combinations
  { id: 'c101', name: 'Ocean Breeze', colors: ['#4A90A4', '#89CFF0', '#F0F8FF'], season: 'Summer', mood: 'Cool & Airy' },
  { id: 'c102', name: 'Sunset Glow', colors: ['#FF6B6B', '#FFD93D', '#F8B500'], season: 'Summer', mood: 'Warm & Vibrant' },
  { id: 'c103', name: 'Tropical Paradise', colors: ['#FF8C42', '#6BCB77', '#4D96FF'], season: 'Summer', mood: 'Energetic' },
  { id: 'c104', name: 'Coral Reef', colors: ['#FA7F72', '#F7DC6F', '#82E0AA'], season: 'Summer', mood: 'Bright & Cheerful' },
  { id: 'c105', name: 'Mediterranean', colors: ['#5DADE2', '#F8F9FA', '#F4D03F'], season: 'Summer', mood: 'Elegant & Fresh' },

  // Fall Combinations
  { id: 'c201', name: 'Autumn Leaves', colors: ['#D4A373', '#BC4B51', '#8B7355'], season: 'Fall', mood: 'Warm & Cozy' },
  { id: 'c202', name: 'Harvest Moon', colors: ['#E4A672', '#B87333', '#654321'], season: 'Fall', mood: 'Rich & Earthy' },
  { id: 'c203', name: 'Pumpkin Spice', colors: ['#FF8C00', '#CD853F', '#8B4513'], season: 'Fall', mood: 'Spicy & Warm' },
  { id: 'c204', name: 'Forest Path', colors: ['#8B7355', '#A0826D', '#6B8E23'], season: 'Fall', mood: 'Natural & Grounded' },
  { id: 'c205', name: 'Burnt Sienna', colors: ['#C14A09', '#A0522D', '#8B4513'], season: 'Fall', mood: 'Deep & Intense' },

  // Winter Combinations
  { id: 'c301', name: 'Snow Day', colors: ['#F0F8FF', '#E6E6FA', '#D3D3D3'], season: 'Winter', mood: 'Pure & Crisp' },
  { id: 'c302', name: 'Nordic Night', colors: ['#2C3E50', '#34495E', '#5D6D7E'], season: 'Winter', mood: 'Deep & Mysterious' },
  { id: 'c303', name: 'Winter Berry', colors: ['#8B0000', '#2F4F4F', '#F5F5F5'], season: 'Winter', mood: 'Bold & Classic' },
  { id: 'c304', name: 'Frosted Pine', colors: ['#355E3B', '#E8F5E9', '#A8D8EA'], season: 'Winter', mood: 'Cool & Tranquil' },
  { id: 'c305', name: 'Ice Palace', colors: ['#B0E0E6', '#F0F8FF', '#E0FFFF'], season: 'Winter', mood: 'Elegant & Cold' },

  // Neutral & Elegant
  { id: 'c401', name: 'Tokyo Minimalist', colors: ['#2C2C2C', '#F5F5F5', '#A0A0A0'], mood: 'Modern & Clean' },
  { id: 'c402', name: 'Wabi-Sabi', colors: ['#8B7D6B', '#E8DCC4', '#A89F91'], mood: 'Rustic & Authentic' },
  { id: 'c403', name: 'Zen Garden', colors: ['#556B2F', '#F5F5DC', '#C0C0C0'], mood: 'Peaceful & Balanced' },
  { id: 'c404', name: 'Sakura & Stone', colors: ['#FFB7C5', '#696969', '#F5F5F5'], mood: 'Contrast & Harmony' },
  { id: 'c405', name: 'Indigo Dreams', colors: ['#4B0082', '#E6E6FA', '#9370DB'], mood: 'Deep & Thoughtful' },

  // Bold & Artistic
  { id: 'c501', name: 'Ukiyo-e', colors: ['#DC143C', '#191970', '#FFD700'], mood: 'Traditional & Bold' },
  { id: 'c502', name: 'Edo Period', colors: ['#8B008B', '#FF6347', '#4682B4'], mood: 'Historical & Rich' },
  { id: 'c503', name: 'Kabuki Theater', colors: ['#FF0000', '#FFD700', '#000000'], mood: 'Dramatic & Strong' },
  { id: 'c504', name: 'Kimono Silk', colors: ['#E91E63', '#FF9800', '#9C27B0'], mood: 'Luxurious & Vibrant' },
  { id: 'c505', name: 'Tea Ceremony', colors: ['#556B2F', '#8B4513', '#DEB887'], mood: 'Refined & Traditional' }
]

// Rastgele Sanzo Wada paleti seç
export function getRandomSanzoPalette(): ColorPalette {
  return SANZO_WADA_PALETTES[Math.floor(Math.random() * SANZO_WADA_PALETTES.length)]
}

// Sezona göre paletleri filtrele
export function getSanzoPalettesBySeason(season: 'Spring' | 'Summer' | 'Fall' | 'Winter'): ColorPalette[] {
  return SANZO_WADA_PALETTES.filter(p => p.season === season)
}

// Renk uyumunu kontrol et (kıyafet rengi ile palet uyumu)
export function findMatchingPalette(clothingColors: string[]): ColorPalette | null {
  // Basit renk uyumu algoritması
  for (const palette of SANZO_WADA_PALETTES) {
    for (const clothingColor of clothingColors) {
      if (palette.colors.includes(clothingColor)) {
        return palette
      }
    }
  }
  return getRandomSanzoPalette()
}