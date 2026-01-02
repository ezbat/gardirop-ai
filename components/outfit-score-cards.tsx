"use client"

import { motion } from "framer-motion"
import { Palette, Shirt, ThermometerSun, Sparkles } from "lucide-react"

interface OutfitScoreCardsProps {
  scores: {
    colorScore: number
    styleScore: number
    weatherScore: number
    total: number
  }
}

export function OutfitScoreCards({ scores }: OutfitScoreCardsProps) {
  const scoreCards = [
    {
      icon: Palette,
      label: "Renk",
      score: scores.colorScore,
      color: "from-pink-500/20 to-purple-500/20",
      iconColor: "text-pink-500",
    },
    {
      icon: Shirt,
      label: "Stil",
      score: scores.styleScore,
      color: "from-blue-500/20 to-cyan-500/20",
      iconColor: "text-blue-500",
    },
    {
      icon: ThermometerSun,
      label: "Hava",
      score: scores.weatherScore,
      color: "from-orange-500/20 to-yellow-500/20",
      iconColor: "text-orange-500",
    },
  ]

  const getScoreEmoji = (score: number) => {
    if (score >= 90) return "🔥"
    if (score >= 80) return "✨"
    if (score >= 70) return "👍"
    return "💡"
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="mt-6"
    >
      {/* Ana Skor */}
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5, type: "spring" }}
        className="relative mb-4 p-4 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 overflow-hidden"
      >
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">AI Uyum Skoru</div>
              <div className="font-bold text-2xl text-primary">{Math.round(scores.total)}</div>
            </div>
          </div>
          <div className="text-4xl">{getScoreEmoji(scores.total)}</div>
        </div>
        
        {/* Animated background */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent"
          animate={{
            x: ["-100%", "100%"],
          }}
          transition={{
            duration: 3,
            repeat: Number.POSITIVE_INFINITY,
            ease: "linear",
          }}
        />
      </motion.div>

      {/* Detaylı Skorlar */}
      <div className="grid grid-cols-3 gap-3">
        {scoreCards.map((card, index) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 + index * 0.1 }}
            className="relative group"
          >
            <div className={`relative p-3 rounded-xl bg-gradient-to-br ${card.color} border border-border/50 backdrop-blur-sm overflow-hidden transition-all hover:scale-105 hover:shadow-lg`}>
              {/* Icon */}
              <div className={`w-8 h-8 rounded-lg bg-background/80 flex items-center justify-center mb-2 ${card.iconColor}`}>
                <card.icon className="w-4 h-4" />
              </div>
              
              {/* Label & Score */}
              <div className="text-xs text-muted-foreground mb-1">{card.label}</div>
              <div className="font-bold text-lg">{Math.round(card.score)}</div>
              
              {/* Progress Bar */}
              <div className="mt-2 h-1 bg-background/50 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full bg-gradient-to-r ${card.color.replace('/20', '')}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${card.score}%` }}
                  transition={{ delay: 0.8 + index * 0.1, duration: 0.8, ease: "easeOut" }}
                />
              </div>
              
              {/* Hover glow */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-br from-white/0 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </div>
          </motion.div>
        ))}
      </div>

      {/* AI Tavsiyesi */}
      {scores.total >= 85 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.9 }}
          className="mt-4 p-3 rounded-xl bg-primary/5 border border-primary/10"
        >
          <p className="text-sm text-center text-muted-foreground">
            <span className="text-primary font-medium">Mükemmel seçim!</span> Bu kombin harika görünüyor 🎉
          </p>
        </motion.div>
      )}
    </motion.div>
  )
}