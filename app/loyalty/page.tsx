"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Award, Star, Gift, TrendingUp, Loader2, Crown, Zap } from "lucide-react"
import FloatingParticles from "@/components/floating-particles"
import { motion } from "framer-motion"

interface LoyaltyData {
  total_points: number
  available_points: number
  lifetime_points: number
  tier: string
  next_tier: string
  points_to_next_tier: number
}

export default function LoyaltyPage() {
  const { data: session } = useSession()
  const userId = session?.user?.id

  const [loading, setLoading] = useState(true)
  const [loyaltyData, setLoyaltyData] = useState<LoyaltyData>({
    total_points: 0,
    available_points: 0,
    lifetime_points: 0,
    tier: 'bronze',
    next_tier: 'silver',
    points_to_next_tier: 1000
  })

  useEffect(() => {
    if (userId) {
      loadLoyaltyData()
    }
  }, [userId])

  const loadLoyaltyData = async () => {
    try {
      const response = await fetch('/api/loyalty')
      const data = await response.json()

      if (response.ok) {
        setLoyaltyData(data)
      } else {
        console.error('Loyalty data error:', data.error)
      }
    } catch (error) {
      console.error('Load loyalty data error:', error)
    } finally {
      setLoading(false)
    }
  }

  const tiers = [
    {
      name: 'Bronze',
      icon: Award,
      minPoints: 0,
      color: 'text-orange-600',
      bgColor: 'bg-orange-600/10',
      benefits: ['5% Rabatt', 'Geburtstagsgutschein']
    },
    {
      name: 'Silber',
      icon: Star,
      minPoints: 500,
      color: 'text-gray-400',
      bgColor: 'bg-gray-400/10',
      benefits: ['10% Rabatt', 'Kostenloser Versand', 'Frühzugang']
    },
    {
      name: 'Gold',
      icon: Crown,
      minPoints: 1000,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      benefits: ['15% Rabatt', 'Prioritätssupport', 'Exklusive Produkte']
    },
    {
      name: 'Platin',
      icon: Zap,
      minPoints: 2500,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      benefits: ['20% Rabatt', 'Persönlicher Stylist', 'VIP Events']
    }
  ]

  const getCurrentTierIndex = () => {
    return tiers.findIndex(t => t.name.toLowerCase() === loyaltyData.tier)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const currentTierIndex = getCurrentTierIndex()
  const progressToNextTier = currentTierIndex < tiers.length - 1
    ? ((loyaltyData.lifetime_points - tiers[currentTierIndex].minPoints) /
       (tiers[currentTierIndex + 1].minPoints - tiers[currentTierIndex].minPoints)) * 100
    : 100

  return (
    <div className="min-h-screen relative overflow-hidden">
      <FloatingParticles />
      <section className="relative py-8 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-8">
            <Award className="w-16 h-16 text-primary mx-auto mb-4" />
            <h1 className="font-serif text-4xl font-bold mb-2">Treueprogramm</h1>
            <p className="text-muted-foreground">Sammle Punkte und erhalte exklusive Belohnungen</p>
          </div>

          {/* Current Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass border border-border rounded-2xl p-6"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Star className="w-5 h-5 text-green-500" />
                </div>
                <p className="text-sm text-muted-foreground">Verfügbare Punkte</p>
              </div>
              <p className="text-4xl font-bold text-green-500">{loyaltyData.available_points}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass border border-border rounded-2xl p-6"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                </div>
                <p className="text-sm text-muted-foreground">Lebenslange Punkte</p>
              </div>
              <p className="text-4xl font-bold text-blue-500">{loyaltyData.lifetime_points}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass border border-border rounded-2xl p-6"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-purple-500" />
                </div>
                <p className="text-sm text-muted-foreground">Aktuelles Level</p>
              </div>
              <p className="text-3xl font-bold text-purple-500 capitalize">{loyaltyData.tier}</p>
            </motion.div>
          </div>

          {/* Progress to Next Tier */}
          {currentTierIndex < tiers.length - 1 && (
            <div className="glass border border-border rounded-2xl p-6 mb-8">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold">Fortschritt zum nächsten Level</h3>
                <span className="text-sm text-muted-foreground">
                  Noch {loyaltyData.points_to_next_tier} Punkte bis {loyaltyData.next_tier}
                </span>
              </div>
              <div className="w-full h-4 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressToNextTier}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-primary to-purple-500"
                />
              </div>
            </div>
          )}

          {/* Tier Cards */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6">Mitgliedschaftsstufen</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {tiers.map((tier, index) => {
                const Icon = tier.icon
                const isCurrent = index === currentTierIndex
                const isUnlocked = loyaltyData.lifetime_points >= tier.minPoints

                return (
                  <motion.div
                    key={tier.name}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className={`glass border rounded-2xl p-6 relative ${
                      isCurrent ? 'border-primary shadow-lg shadow-primary/20' : 'border-border'
                    } ${!isUnlocked && 'opacity-50'}`}
                  >
                    {isCurrent && (
                      <div className="absolute -top-3 -right-3 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                        Aktuell
                      </div>
                    )}

                    <div className={`w-16 h-16 rounded-full ${tier.bgColor} flex items-center justify-center mb-4 mx-auto`}>
                      <Icon className={`w-8 h-8 ${tier.color}`} />
                    </div>

                    <h3 className="text-xl font-bold text-center mb-2">{tier.name}</h3>
                    <p className="text-sm text-muted-foreground text-center mb-4">
                      Ab {tier.minPoints} Punkten
                    </p>

                    <div className="space-y-2">
                      {tier.benefits.map((benefit, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                          <span>{benefit}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>

          {/* How to Earn Points */}
          <div className="glass border border-border rounded-2xl p-6">
            <h2 className="text-2xl font-bold mb-6">Punkte sammeln</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-4 p-4 glass border border-border rounded-xl">
                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                  <Gift className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <h3 className="font-bold mb-1">Einkaufen</h3>
                  <p className="text-sm text-muted-foreground">
                    Verdiene 1 Punkt für jeden ausgegebenen €1
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 glass border border-border rounded-xl">
                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <Star className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-bold mb-1">Bewertung schreiben</h3>
                  <p className="text-sm text-muted-foreground">
                    Erhalte 50 Punkte für jede Produktbewertung
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 glass border border-border rounded-xl">
                <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-6 h-6 text-purple-500" />
                </div>
                <div>
                  <h3 className="font-bold mb-1">Freunde einladen</h3>
                  <p className="text-sm text-muted-foreground">
                    100 Punkte für jeden Freund der einkauft
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 glass border border-border rounded-xl">
                <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                  <Award className="w-6 h-6 text-yellow-500" />
                </div>
                <div>
                  <h3 className="font-bold mb-1">Geburtstag</h3>
                  <p className="text-sm text-muted-foreground">
                    200 Bonus-Punkte an deinem Geburtstag
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
