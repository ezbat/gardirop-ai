"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { motion } from "framer-motion"
import { RefreshCw, ShoppingBag, Sparkles, MapPin, Loader2, ArrowRight } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import FloatingParticles from "@/components/floating-particles"
import { getCurrentWeather, getWeatherIcon } from "@/lib/weather"
import { useLanguage } from "@/lib/language-context"

interface WeatherData {
  temperature: number
  condition: string
  description: string
  city: string
}

interface OutfitItem {
  productId: string
  title: string
  price: number
  imageUrl: string
  category: string
  brand: string
  stockQuantity: number
}

interface FeaturedOutfit {
  id: string
  name: string
  description: string
  coverImageUrl: string
  season: string
  occasion: string
  items: OutfitItem[]
  seller: {
    id: string
    shopName: string
  }
}

export default function HomePage() {
  const { data: session } = useSession()
  const { t } = useLanguage()

  const [featuredOutfits, setFeaturedOutfits] = useState<FeaturedOutfit[]>([])
  const [selectedOutfitIndex, setSelectedOutfitIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loadingWeather, setLoadingWeather] = useState(true)

  useEffect(() => {
    loadWeather()
  }, [])

  useEffect(() => {
    if (weather) {
      loadFeaturedOutfits()
    }
  }, [weather])

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

  const getSeasonFromWeather = (temp: number): string => {
    if (temp < 10) return 'Winter'
    if (temp < 15) return 'Fall'
    if (temp < 25) return 'Spring'
    return 'Summer'
  }

  const loadFeaturedOutfits = async () => {
    setLoading(true)
    try {
      const season = weather ? getSeasonFromWeather(weather.temperature) : 'All Season'

      const response = await fetch(`/api/outfits/featured?season=${season}&limit=5`)
      const data = await response.json()

      if (response.ok && data.outfits) {
        setFeaturedOutfits(data.outfits)
        setSelectedOutfitIndex(0)
      } else {
        setFeaturedOutfits([])
      }
    } catch (error) {
      console.error('Load outfits error:', error)
      setFeaturedOutfits([])
    } finally {
      setLoading(false)
    }
  }

  const addAllToCart = (outfit: FeaturedOutfit) => {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]')

    outfit.items.forEach(item => {
      const existingIndex = cart.findIndex((cartItem: any) => cartItem.id === item.productId)
      if (existingIndex === -1 && item.stockQuantity > 0) {
        cart.push({
          id: item.productId,
          title: item.title,
          price: item.price,
          image: item.imageUrl,
          quantity: 1
        })
      }
    })

    localStorage.setItem('cart', JSON.stringify(cart))
    alert(`✅ ${outfit.name} kombinindeki ${outfit.items.length} ürün sepete eklendi!`)
  }

  const nextOutfit = () => {
    if (featuredOutfits.length > 0) {
      setSelectedOutfitIndex((prev) => (prev + 1) % featuredOutfits.length)
    }
  }

  const selectedOutfit = featuredOutfits[selectedOutfitIndex]

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
            {t('appName')}
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            {t('aiWardrobeManagement')}
          </p>
          <Link
            href="/api/auth/signin"
            className="px-8 py-4 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity inline-block"
          >
            {t('start')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <FloatingParticles />
      <section className="relative py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-8">
            <h1 className="font-serif text-4xl md:text-5xl font-bold mb-2">
              {t('whatToWearToday')}
            </h1>
            <p className="text-muted-foreground">Mağazalarımızdan özenle seçilmiş kombinler</p>
          </div>

          {/* Weather Widget */}
          {loadingWeather ? (
            <div className="glass border border-border rounded-2xl p-6 mb-6 flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">{t('gettingLocation')}</span>
            </div>
          ) : weather ? (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass border border-border rounded-2xl p-6 mb-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-5xl">{getWeatherIcon(weather.condition)}</div>
                  <div>
                    <p className="text-3xl font-bold">{Math.round(weather.temperature)}°C</p>
                    <p className="text-sm text-muted-foreground">{weather.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm">{weather.city}</span>
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
              <p className="text-muted-foreground">Kombinler yükleniyor...</p>
            </div>
          ) : selectedOutfit ? (
            <div className="glass border border-border rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Önerilen Kombin</p>
                    <p className="text-2xl font-bold">{selectedOutfit.name}</p>
                  </div>
                </div>
                <button
                  onClick={nextOutfit}
                  disabled={loading || featuredOutfits.length <= 1}
                  className="p-3 glass border border-border rounded-xl hover:border-primary transition-colors"
                  title={t('newOutfitButton')}
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>

              {selectedOutfit.description && (
                <p className="text-muted-foreground mb-6">{selectedOutfit.description}</p>
              )}

              {/* Outfit Items Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {selectedOutfit.items.map((item, idx) => (
                  <motion.div
                    key={item.productId}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.1 }}
                    className="glass border border-border rounded-xl overflow-hidden hover:border-primary transition-colors"
                  >
                    <div className="relative aspect-square bg-muted">
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.title}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl">
                          📦
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-xs text-primary font-semibold">{item.category}</p>
                      <p className="font-bold text-sm truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.brand}</p>
                      <p className="text-lg font-bold text-primary mt-2">₺{item.price}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Seller Info */}
              <div className="flex items-center justify-between p-4 glass rounded-xl mb-6">
                <div>
                  <p className="text-xs text-muted-foreground">Kombinleyen Mağaza</p>
                  <p className="font-semibold">{selectedOutfit.seller.shopName}</p>
                </div>
                <div className="flex gap-2">
                  <span className="text-xs px-3 py-1 bg-primary/10 text-primary rounded-full">
                    {selectedOutfit.season}
                  </span>
                  <span className="text-xs px-3 py-1 bg-primary/10 text-primary rounded-full">
                    {selectedOutfit.occasion}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-4">
                <Link
                  href={`/outfits/${selectedOutfit.id}`}
                  className="flex-1 px-6 py-3 glass border border-border rounded-xl font-semibold hover:border-primary transition-colors text-center"
                >
                  Detayları Gör
                </Link>
                <button
                  onClick={() => addAllToCart(selectedOutfit)}
                  className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  <ShoppingBag className="w-5 h-5" />
                  Tümünü Sepete Ekle
                </button>
              </div>
            </div>
          ) : (
            <div className="glass border border-border rounded-2xl p-20 text-center">
              <div className="text-9xl mb-6">🎨</div>
              <h3 className="text-2xl font-bold mb-3">Henüz kombin yok</h3>
              <p className="text-muted-foreground mb-6">
                Mağazalarımız çok yakında özel kombinler oluşturacak
              </p>
              <Link
                href="/store"
                className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity inline-flex items-center gap-2"
              >
                Mağazayı Keşfet
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          )}

          {/* Browse More Outfits */}
          {featuredOutfits.length > 0 && (
            <div className="mt-8 text-center">
              <Link
                href="/outfits"
                className="inline-flex items-center gap-2 px-6 py-3 glass border border-border rounded-xl font-semibold hover:border-primary transition-colors"
              >
                Tüm Kombinleri Gör
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
