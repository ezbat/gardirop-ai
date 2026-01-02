"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { motion } from "framer-motion"
import { RefreshCw, Save, Sparkles, Cloud, Sun } from "lucide-react"
import Link from "next/link"
import FloatingParticles from "@/components/floating-particles"
import { generateOutfits, getWeatherBasedSuggestion } from "@/lib/outfit-generator"
import { syncUserToSupabase } from "@/lib/auth-helpers"
import { supabase } from "@/lib/supabase"

interface OutfitSuggestion {
  items: any[]
  score: number
  reasoning: string
  season: string
  occasion: string
  colorHarmony: string
  styleNotes: string[]
}

export default function HomePage() {
  const { data: session } = useSession()
  const userId = session?.user?.id

  const [outfit, setOutfit] = useState<OutfitSuggestion | null>(null)
  const [loading, setLoading] = useState(false)
  const [weather, setWeather] = useState<any>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (userId && session?.user) {
      syncUserToSupabase({
        id: userId,
        email: session.user.email!,
        name: session.user.name || undefined,
        image: session.user.image || undefined
      })
      
      fetchWeather()
      generateDailyOutfit()
    }
  }, [userId, session])

  const fetchWeather = async () => {
    try {
      const apiKey = process.env.NEXT_PUBLIC_WEATHER_API_KEY
      
      if (!apiKey) {
        console.warn('Weather API key not found, using mock data')
        setWeather({
          main: { temp: 18, feels_like: 16 },
          weather: [{ description: 'acik' }]
        })
        return
      }

      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=Stuttgart&appid=${apiKey}&units=metric`
      )
      
      if (!response.ok) {
        throw new Error('Weather API failed')
      }
      
      const data = await response.json()
      setWeather(data)
    } catch (error) {
      console.error('Weather fetch error:', error)
      setWeather({
        main: { temp: 18, feels_like: 16 },
        weather: [{ description: 'acik' }]
      })
    }
  }

  const generateDailyOutfit = async () => {
    if (!userId) return

    setLoading(true)
    try {
      const temp = weather?.main?.temp || 20
      const weatherSuggestion = getWeatherBasedSuggestion(temp)

      const outfits = await generateOutfits(userId, {
        season: weatherSuggestion.season,
        weatherTemp: temp,
        maxOutfits: 1
      })

      if (outfits.length > 0) {
        setOutfit(outfits[0])
        console.log('✅ Outfit generated:', outfits[0])
      }
    } catch (error) {
      console.error('Generate outfit error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveOutfit = async () => {
    if (!userId || !outfit) {
      alert('Lütfen önce giriş yapın!')
      return
    }

    setSaving(true)
    try {
      const name = `Kombin ${new Date().toLocaleDateString('tr-TR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`
      
      console.log('💾 Saving outfit...')
      console.log('User ID:', userId)
      console.log('Outfit name:', name)
      console.log('Items:', outfit.items.map(i => ({ id: i.id, name: i.name })))
      
      const { data, error } = await supabase
        .from('outfits')
        .insert({
          user_id: userId,
          name,
          description: outfit.reasoning,
          cloth_ids: outfit.items.map(item => item.id),
          season: outfit.season,
          occasion: outfit.occasion,
          color_harmony_score: outfit.score,
          style_score: outfit.score,
          is_favorite: false,
          is_public: false
        })
        .select()
        .single()

      if (error) {
        console.error('❌ Save error:', error)
        throw error
      }

      console.log('✅ Outfit saved successfully:', data.id)
      alert('✨ Kombin kaydedildi! "Kombinlerim" sayfasından görebilirsiniz.')
      
    } catch (error: any) {
      console.error('💥 Save failed:', error)
      alert(`Kaydetme başarısız: ${error.message || 'Bilinmeyen hata'}`)
    } finally {
      setSaving(false)
    }
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
        <FloatingParticles />
        
        <div className="text-center z-10">
          <div className="text-9xl mb-6">👔</div>
          <h1 className="font-serif text-5xl font-bold mb-4">
            Gardirop AI
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            AI destekli gardirop yonetimi ve stil onerileri
          </p>
          <Link
            href="/api/auth/signin"
            className="px-8 py-4 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity inline-block"
          >
            Basla
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <FloatingParticles />

      <section className="relative py-8 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-8">
            <h1 className="font-serif text-4xl font-bold mb-2">Bugun Ne Giymeli?</h1>
            <p className="text-muted-foreground">AI destekli gunluk kombin onerisi</p>
          </div>

          {/* WEATHER */}
          {weather?.main && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass border border-border rounded-2xl p-6 mb-6 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  {weather.main.temp > 20 ? (
                    <Sun className="w-8 h-8 text-yellow-500" />
                  ) : (
                    <Cloud className="w-8 h-8 text-blue-500" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Stuttgart, Almanya</p>
                  <p className="text-3xl font-bold">{Math.round(weather.main.temp)}°C</p>
                  <p className="text-sm capitalize">{weather.weather?.[0]?.description || ''}</p>
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Hissedilen</p>
                <p className="text-xl font-semibold">{Math.round(weather.main.feels_like)}°C</p>
              </div>
            </motion.div>
          )}

          {/* OUTFIT DISPLAY */}
          {loading ? (
            <div className="glass border border-border rounded-2xl p-20 text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-16 h-16 mx-auto mb-4 rounded-full border-2 border-primary border-t-transparent"
              />
              <p className="text-muted-foreground">AI kombin olusturuyor...</p>
            </div>
          ) : outfit ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass border border-border rounded-2xl overflow-hidden"
            >
              {/* OUTFIT ITEMS - UST USTE DIZILIM */}
              <div className="flex flex-col gap-3 p-6 bg-gradient-to-br from-primary/5 to-primary/10">
                {outfit.items.map((item, idx) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex items-center gap-4 glass border border-border rounded-xl p-4 hover:border-primary transition-colors bg-white/50"
                  >
                    {/* IMAGE */}
                    <div className="w-20 h-20 flex-shrink-0 bg-gradient-to-br from-primary/10 to-transparent rounded-lg overflow-hidden">
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    
                    {/* INFO */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-primary font-semibold mb-1">{item.category}</p>
                      <h3 className="font-bold text-base mb-1 truncate">{item.name}</h3>
                      {item.brand && (
                        <p className="text-xs text-muted-foreground truncate">{item.brand}</p>
                      )}
                    </div>
                    
                    {/* COLOR */}
                    <div 
                      className="w-10 h-10 rounded-full border-4 border-border flex-shrink-0 shadow-lg"
                      style={{ backgroundColor: item.color_hex }}
                    />
                  </motion.div>
                ))}
              </div>

              {/* OUTFIT INFO */}
              <div className="p-6 border-t border-border">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{outfit.score}/100</p>
                      <p className="text-sm text-muted-foreground">Uyum Skoru</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={generateDailyOutfit}
                      disabled={loading}
                      className="p-3 glass border border-border rounded-xl hover:border-primary transition-colors"
                      title="Yeni kombin olustur"
                    >
                      <RefreshCw className="w-5 h-5" />
                    </button>
                    
                    <button
                      onClick={handleSaveOutfit}
                      disabled={saving}
                      className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50"
                    >
                      {saving ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                          />
                          Kaydediliyor...
                        </>
                      ) : (
                        <>
                          <Save className="w-5 h-5" />
                          Kaydet
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* REASONING */}
                <div className="glass border border-border rounded-xl p-4 mb-4">
                  <p className="text-sm leading-relaxed">{outfit.reasoning}</p>
                </div>

                {/* STYLE NOTES */}
                {outfit.styleNotes.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {outfit.styleNotes.map((note, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 glass border border-border rounded-full text-xs font-semibold"
                      >
                        {note}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <div className="glass border border-border rounded-2xl p-20 text-center">
              <div className="text-9xl mb-6">🎨</div>
              <h3 className="text-2xl font-bold mb-3">Henuz kiyafet yok</h3>
              <p className="text-muted-foreground mb-6">
                Kombin onerisi almak icin gardirobuna kiyafet ekle
              </p>
              <Link
                href="/wardrobe"
                className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity inline-block"
              >
                Gardiroba Git
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}