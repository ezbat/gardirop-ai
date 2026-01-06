"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { motion } from "framer-motion"
import { RefreshCw, Sparkles, MapPin, Loader2 } from "lucide-react"
import Link from "next/link"
import FloatingParticles from "@/components/floating-particles"
import OutfitVisualizer from "@/components/outfit-visualizer"
import { generateOutfit, type OutfitResult } from "@/lib/outfit-generator"
import { getCurrentWeather, getWeatherIcon } from "@/lib/weather"
import { supabase } from "@/lib/supabase"

interface WeatherData {
  temperature: number
  condition: string
  description: string
  city: string
}

export default function HomePage() {
  const { data: session } = useSession()
  const userId = session?.user?.id
  const [outfit, setOutfit] = useState<OutfitResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loadingWeather, setLoadingWeather] = useState(true)

  useEffect(() => {
    loadWeather()
  }, [])

  useEffect(() => {
    if (userId && weather) {
      generateDailyOutfit()
    }
  }, [userId, weather])

  const loadWeather = async () => {
    setLoadingWeather(true)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords
          try {
            const weatherData = await getCurrentWeather(latitude, longitude)
            setWeather(weatherData)
          } catch (error) {
            console.error('Weather error:', error)
          } finally {
            setLoadingWeather(false)
          }
        },
        () => {
          setLoadingWeather(false)
        }
      )
    } else {
      setLoadingWeather(false)
    }
  }

  const generateDailyOutfit = async () => {
    if (!userId) return
    
    setLoading(true)
    try {
      // Kullanıcının tüm kıyafetlerini çek
      const { data: clothes, error } = await supabase
        .from('clothes')
        .select('*')
        .eq('user_id', userId)

      if (error) throw error

      if (!clothes || clothes.length === 0) {
        setOutfit(null)
        return
      }

      // Hava durumuna göre sezon belirle
      const temp = weather?.temperature || 20
      let season = 'Summer'
      if (temp < 10) season = 'Winter'
      else if (temp < 18) season = 'Fall'
      else if (temp < 25) season = 'Summer'
      else season = 'Spring'

      // Kombin oluştur
      const result = generateOutfit(clothes, { season })
      
      if (result) {
        setOutfit(result)
      }
    } catch (error) {
      console.error('Outfit generation error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
        <FloatingParticles />
        <div className="text-center z-10">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring" }}
            className="text-9xl mb-6"
          >
            👔
          </motion.div>
          <h1 className="font-serif text-6xl font-bold mb-4 bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
            Gardırop AI
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            AI destekli gardırop yönetimi ve stil önerileri
          </p>
          <Link
            href="/api/auth/signin"
            className="px-8 py-4 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity inline-block"
          >
            Başla
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <FloatingParticles />
      
      <section className="relative py-8 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-8">
            <h1 className="font-serif text-4xl md:text-5xl font-bold mb-2">
              Bugün Ne Giymeli?
            </h1>
            <p className="text-muted-foreground">AI destekli günlük kombin önerisi</p>
          </div>

          {/* Weather Widget */}
          {loadingWeather ? (
            <div className="glass border border-border rounded-2xl p-6 mb-6 flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Konum alınıyor...</span>
            </div>
          ) : weather ? (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass border border-border rounded-2xl p-6 mb-6 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <span className="text-4xl">{getWeatherIcon(weather.condition)}</span>
                </div>
                <div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    <span>{weather.city}</span>
                  </div>
                  <p className="text-3xl font-bold">{weather.temperature}°C</p>
                  <p className="text-sm capitalize">{weather.description}</p>
                </div>
              </div>
            </motion.div>
          ) : null}

          {/* Outfit Display */}
          {loading ? (
            <div className="glass border border-border rounded-2xl p-20 text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-16 h-16 mx-auto mb-4 rounded-full border-2 border-primary border-t-transparent"
              />
              <p className="text-muted-foreground">AI kombin oluşturuyor...</p>
            </div>
          ) : outfit ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass border border-border rounded-2xl overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Uyum Skoru</p>
                      <p className="text-2xl font-bold">{outfit.score}/100</p>
                    </div>
                  </div>
                  <button
                    onClick={generateDailyOutfit}
                    disabled={loading}
                    className="p-3 glass border border-border rounded-xl hover:border-primary transition-colors"
                    title="Yeni kombin"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                </div>

                <OutfitVisualizer
                  items={outfit.items}
                  colorPalette={outfit.colorPalette}
                  score={outfit.score}
                />

                <div className="mt-6 glass border border-border rounded-xl p-4">
                  <p className="text-sm text-muted-foreground">{outfit.reason}</p>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="glass border border-border rounded-2xl p-20 text-center">
              <div className="text-9xl mb-6">🎨</div>
              <h3 className="text-2xl font-bold mb-3">Henüz kıyafet yok</h3>
              <p className="text-muted-foreground mb-6">
                Kombin önerisi almak için gardırobuna kıyafet ekle
              </p>
              <Link
                href="/wardrobe"
                className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity inline-block"
              >
                Gardıroba Git
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}