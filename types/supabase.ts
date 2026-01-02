export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string | null
          username: string | null
          avatar_url: string | null
          bio: string | null
          website: string | null
          skin_tone: 'fair' | 'medium' | 'olive' | 'dark' | null
          style_preferences: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          name?: string | null
          username?: string | null
          avatar_url?: string | null
          bio?: string | null
          website?: string | null
          skin_tone?: 'fair' | 'medium' | 'olive' | 'dark' | null
          style_preferences?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          username?: string | null
          avatar_url?: string | null
          bio?: string | null
          website?: string | null
          skin_tone?: 'fair' | 'medium' | 'olive' | 'dark' | null
          style_preferences?: Json
          created_at?: string
          updated_at?: string
        }
      }
      clothes: {
        Row: {
          id: string
          user_id: string
          name: string
          category: string
          subcategory: string | null
          brand: string | null
          color_hex: string
          color_palette: Json
          image_url: string
          original_image_url: string | null
          tags: string[]
          season: string[]
          occasions: string[]
          material: string | null
          purchase_url: string | null
          is_favorite: boolean
          ai_metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          category: string
          subcategory?: string | null
          brand?: string | null
          color_hex: string
          color_palette?: Json
          image_url: string
          original_image_url?: string | null
          tags?: string[]
          season?: string[]
          occasions?: string[]
          material?: string | null
          purchase_url?: string | null
          is_favorite?: boolean
          ai_metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          category?: string
          subcategory?: string | null
          brand?: string | null
          color_hex?: string
          color_palette?: Json
          image_url?: string
          original_image_url?: string | null
          tags?: string[]
          season?: string[]
          occasions?: string[]
          material?: string | null
          purchase_url?: string | null
          is_favorite?: boolean
          ai_metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      outfits: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          cloth_ids: string[]
          season: string
          occasion: string
          weather_temp_min: number | null
          weather_temp_max: number | null
          color_harmony_score: number | null
          style_score: number | null
          is_favorite: boolean
          is_public: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          cloth_ids: string[]
          season: string
          occasion: string
          weather_temp_min?: number | null
          weather_temp_max?: number | null
          color_harmony_score?: number | null
          style_score?: number | null
          is_favorite?: boolean
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          cloth_ids?: string[]
          season?: string
          occasion?: string
          weather_temp_min?: number | null
          weather_temp_max?: number | null
          color_harmony_score?: number | null
          style_score?: number | null
          is_favorite?: boolean
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}