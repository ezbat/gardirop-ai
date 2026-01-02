"use client"

import { motion } from "framer-motion"
import { Sparkles, Palette, Shirt, ThermometerSun, TrendingUp, Star, Brain } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { type ClothingItem } from "@/lib/storage"

interface OutfitExplanationModalProps {
  isOpen: boolean
  onClose: () => void
  items: ClothingItem[]
  scores: {
    total: number
    colorScore: number
    styleScore: number
    weatherScore: number
    diversityScore: number
  }
  weather: {
    temp: number
    condition: string
  }
}

export function OutfitExplanationModal({
  isOpen,
  onClose,
  items,
  scores,
  weather,
}: OutfitExplanationModalProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500"
    if (score >= 60) return "text-yellow-500"
    return "text-orange-500"
  }

  const getScoreLabel = (score: number) => {
    if (score >= 90) return "Mükemmel"
    if (score >= 80) return "Harika"
    if (score >= 70) return "İyi"
    if (score >= 60) return "Fena Değil"
    return "Gelişebilir"
  }

  const getColorExplanation = (score: number) => {
    if (score >= 80)
      return "Renkler birbirini mükemmel tamamlıyor! Profesyonel renk uyumu sağlanmış."
    if (score >= 60)
      return "Renkler uyumlu, ancak daha iyi kombinasyonlar mevcut."
    return "Renk uyumu zayıf. Farklı renk kombinasyonları daha iyi olabilir."
  }

  const getStyleExplanation = (score: number, items: ClothingItem[]) => {
    const styles = items.map((i) => i.style)
    const uniqueStyles = [...new Set(styles)]
    
    if (score >= 80) {
      if (uniqueStyles.length === 1) {
        return `Tutarlı ${styles[0]} stili! Tüm parçalar uyumlu.`
      }
      return "Farklı stiller harika bir şekilde karışmış!"
    }
    if (score >= 60) return "Stil uyumu kabul edilebilir seviyede."
    return "Stil karmaşası var. Daha tutarlı bir stil seçmeyi dene."
  }

  const getWeatherExplanation = (score: number, temp: number) => {
    if (score >= 80) {
      if (temp > 25) return `${temp}°C için ideal! Hafif ve rahat parçalar seçildi.`
      if (temp < 10) return `${temp}°C için mükemmel! Sıcak tutan parçalar tercih edildi.`
      return `${temp}°C için tam kıvamında! Mevsime uygun seçim.`
    }
    if (score >= 60) return "Hava için uygun ama daha iyi seçenekler var."
    return "Bu parçalar bu hava için uygun olmayabilir."
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-serif text-2xl">
            <Brain className="w-6 h-6 text-primary" />
            <span>AI Stilist Analizi</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Genel Skor */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20"
          >
            <motion.div
              className={`text-6xl font-bold ${getScoreColor(scores.total)} mb-2`}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
            >
              {Math.round(scores.total)}
            </motion.div>
            <div className="text-lg font-medium mb-1">Genel Uyum Skoru</div>
            <Badge variant="secondary" className="text-sm">
              {getScoreLabel(scores.total)}
            </Badge>
          </motion.div>

          {/* Detaylı Skorlar */}
          <div className="space-y-4">
            {/* Renk Uyumu */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="p-4 rounded-xl border bg-card"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Palette className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">Renk Uyumu</span>
                    <span className={`font-bold ${getScoreColor(scores.colorScore)}`}>
                      {Math.round(scores.colorScore)}
                    </span>
                  </div>
                  <Progress value={scores.colorScore} className="h-2" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{getColorExplanation(scores.colorScore)}</p>
            </motion.div>

            {/* Stil Uyumu */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="p-4 rounded-xl border bg-card"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Shirt className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">Stil Uyumu</span>
                    <span className={`font-bold ${getScoreColor(scores.styleScore)}`}>
                      {Math.round(scores.styleScore)}
                    </span>
                  </div>
                  <Progress value={scores.styleScore} className="h-2" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{getStyleExplanation(scores.styleScore, items)}</p>
            </motion.div>

            {/* Hava Uygunluğu */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="p-4 rounded-xl border bg-card"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <ThermometerSun className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">Hava Uygunluğu</span>
                    <span className={`font-bold ${getScoreColor(scores.weatherScore)}`}>
                      {Math.round(scores.weatherScore)}
                    </span>
                  </div>
                  <Progress value={scores.weatherScore} className="h-2" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {getWeatherExplanation(scores.weatherScore, weather.temp)}
              </p>
            </motion.div>

            {/* Çeşitlilik */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="p-4 rounded-xl border bg-card"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">Çeşitlilik</span>
                    <span className={`font-bold ${getScoreColor(scores.diversityScore)}`}>
                      {Math.round(scores.diversityScore)}
                    </span>
                  </div>
                  <Progress value={scores.diversityScore} className="h-2" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {scores.diversityScore >= 70
                  ? "Farklı renkler ve stiller dengeli bir şekilde karışmış!"
                  : "Biraz daha çeşitlilik eklenebilir."}
              </p>
            </motion.div>
          </div>

          {/* AI Tavsiyesi */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20"
          >
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <div className="font-medium mb-1">AI Tavsiyesi</div>
                <p className="text-sm text-muted-foreground">
                  {scores.total >= 85
                    ? "Bu kombin harika! Güvenle giyebilirsin. Renk ve stil uyumu mükemmel."
                    : scores.total >= 70
                      ? "Güzel bir kombin! Küçük ayarlamalarla daha da iyi olabilir."
                      : "Bu kombinasyon işe yarar, ama daha iyi seçenekler deneyebilirsin."}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Seçilen Parçalar */}
          <div>
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Star className="w-4 h-4 text-primary" />
              Seçilen Parçalar
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {items.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card/50"
                >
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">{item.name}</div>
                    <div className="text-xs text-muted-foreground">{item.category}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}