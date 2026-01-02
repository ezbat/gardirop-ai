"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Upload, Sparkles, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { uploadClothingImage, extractColorPalette } from "@/lib/remove-background"
import { getColorMeaning, getColorTemperature, generateOutfitSuggestion } from "@/lib/color-theory"

interface UploadClothingModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

const CATEGORIES = [
  "T-shirt",
  "Shirt",
  "Sweater",
  "Jacket",
  "Coat",
  "Pants",
  "Shorts",
  "Skirt",
  "Dress",
  "Shoes",
  "Accessories"
]

const SEASONS = ["Spring", "Summer", "Fall", "Winter"]
const OCCASIONS = ["Casual", "Formal", "Sport", "Party", "Work", "Date"]

export default function UploadClothingModal({ isOpen, onClose, onSuccess }: UploadClothingModalProps) {
  const { data: session } = useSession()
  const userId = session?.user?.id

  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string>("")
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState<string>("")

  // Form states
  const [name, setName] = useState("")
  const [category, setCategory] = useState("T-shirt")
  const [brand, setBrand] = useState("")
  const [selectedSeasons, setSelectedSeasons] = useState<string[]>([])
  const [selectedOccasions, setSelectedOccasions] = useState<string[]>([])
  const [removeBackground, setRemoveBackground] = useState(true)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setName(selectedFile.name.split('.')[0])

    const reader = new FileReader()
    reader.onload = (event) => {
      if (event.target?.result) {
        setPreview(event.target.result as string)
      }
    }
    reader.readAsDataURL(selectedFile)
  }

  const toggleSeason = (season: string) => {
    setSelectedSeasons(prev =>
      prev.includes(season)
        ? prev.filter(s => s !== season)
        : [...prev, season]
    )
  }

  const toggleOccasion = (occasion: string) => {
    setSelectedOccasions(prev =>
      prev.includes(occasion)
        ? prev.filter(o => o !== occasion)
        : [...prev, occasion]
    )
  }

  const handleUpload = async () => {
    if (!file || !userId) return

    setUploading(true)

    try {
      // 1. Görüntüyü yükle ve işle
      setProgress("Görüntü yükleniyor...")
      const { originalUrl, processedUrl, publicUrl } = await uploadClothingImage(
        userId,
        file,
        removeBackground
      )

      // 2. Renk paletini çıkar
      setProgress("Renkler analiz ediliyor...")
      const colorPalette = await extractColorPalette(publicUrl)
      const mainColor = colorPalette[0] || "#000000"

      // 3. AI analizi yap
      setProgress("AI analizi yapılıyor...")
      const colorMeaning = getColorMeaning(mainColor)
      const colorTemp = getColorTemperature(mainColor)
      const suggestion = generateOutfitSuggestion(mainColor)

      // 4. Supabase'e kaydet
      setProgress("Kaydediliyor...")
      const { data, error } = await supabase
        .from('clothes')
        .insert({
          user_id: userId,
          name,
          category,
          brand: brand || null,
          color_hex: mainColor,
          color_palette: colorPalette,
          image_url: publicUrl,
          original_image_url: originalUrl,
          season: selectedSeasons,
          occasions: selectedOccasions,
          ai_metadata: {
            color_temperature: colorTemp,
            emotion: colorMeaning.emotion,
            personality: colorMeaning.personality,
            recommended_seasons: colorMeaning.seasons,
            recommended_occasions: colorMeaning.occasions,
            harmony_score: suggestion.score,
            suggested_combinations: suggestion.colors
          }
        })
        .select()
        .single()

      if (error) throw error

      // 5. Başarı!
      setProgress("Tamamlandı! ✨")
      
      setTimeout(() => {
        if (onSuccess) onSuccess()
        handleClose()
      }, 1000)

    } catch (error) {
      console.error('Upload error:', error)
      alert('Yükleme başarısız! Lütfen tekrar deneyin.')
    } finally {
      setUploading(false)
    }
  }

  const handleClose = () => {
    setFile(null)
    setPreview("")
    setName("")
    setCategory("T-shirt")
    setBrand("")
    setSelectedSeasons([])
    setSelectedOccasions([])
    setRemoveBackground(true)
    setProgress("")
    onClose()
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-3xl glass border border-border rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
        >
          {/* HEADER */}
          <div className="p-6 border-b border-border flex items-center justify-between bg-gradient-to-r from-primary/5 to-primary/10">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" />
              Yeni Kıyafet Ekle
            </h2>
            <button
              onClick={handleClose}
              className="w-10 h-10 rounded-full hover:bg-secondary flex items-center justify-center transition-colors"
              disabled={uploading}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* FILE UPLOAD */}
            {!file ? (
              <label className="block aspect-video glass border-2 border-dashed border-border rounded-2xl cursor-pointer hover:border-primary transition-colors">
                <div className="h-full flex flex-col items-center justify-center">
                  <Upload className="w-16 h-16 text-muted-foreground mb-4" />
                  <p className="text-lg font-semibold mb-2">Fotoğraf Yükle</p>
                  <p className="text-sm text-muted-foreground">
                    Kıyafet fotoğrafını seç (PNG, JPG, JPEG)
                  </p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            ) : (
              <>
                {/* PREVIEW */}
                {preview && (
                  <div className="relative aspect-video rounded-2xl overflow-hidden bg-gradient-to-br from-primary/5 to-primary/10">
                    <img
                      src={preview}
                      alt="Preview"
                      className="w-full h-full object-contain"
                    />
                    <button
                      onClick={() => {
                        setFile(null)
                        setPreview("")
                      }}
                      className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                      disabled={uploading}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                )}

                {/* FORM */}
                <div className="space-y-4">
                  {/* NAME & CATEGORY */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">İsim *</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Örn: Beyaz T-shirt"
                        className="w-full px-4 py-2 glass border border-border rounded-xl outline-none focus:border-primary"
                        disabled={uploading}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Kategori *</label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-4 py-2 glass border border-border rounded-xl outline-none focus:border-primary"
                        disabled={uploading}
                      >
                        {CATEGORIES.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* BRAND */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Marka (Opsiyonel)</label>
                    <input
                      type="text"
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      placeholder="Örn: Zara, H&M"
                      className="w-full px-4 py-2 glass border border-border rounded-xl outline-none focus:border-primary"
                      disabled={uploading}
                    />
                  </div>

                  {/* SEASONS */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Sezon</label>
                    <div className="flex flex-wrap gap-2">
                      {SEASONS.map(season => (
                        <button
                          key={season}
                          type="button"
                          onClick={() => toggleSeason(season)}
                          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                            selectedSeasons.includes(season)
                              ? "bg-primary text-primary-foreground"
                              : "glass border border-border hover:border-primary"
                          }`}
                          disabled={uploading}
                        >
                          {season}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* OCCASIONS */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Etkinlik</label>
                    <div className="flex flex-wrap gap-2">
                      {OCCASIONS.map(occasion => (
                        <button
                          key={occasion}
                          type="button"
                          onClick={() => toggleOccasion(occasion)}
                          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                            selectedOccasions.includes(occasion)
                              ? "bg-primary text-primary-foreground"
                              : "glass border border-border hover:border-primary"
                          }`}
                          disabled={uploading}
                        >
                          {occasion}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* REMOVE BACKGROUND */}
                  <div className="glass border border-border rounded-xl p-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={removeBackground}
                        onChange={(e) => setRemoveBackground(e.target.checked)}
                        className="w-5 h-5 rounded accent-primary"
                        disabled={uploading}
                      />
                      <div>
                        <p className="font-semibold">Arka Planı Kaldır</p>
                        <p className="text-sm text-muted-foreground">
                          AI ile otomatik arka plan temizleme (Önerilen)
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </>
            )}

            {/* PROGRESS */}
            {uploading && (
              <div className="glass border border-border rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <p className="text-sm font-semibold">{progress}</p>
                </div>
              </div>
            )}
          </div>

          {/* FOOTER */}
          {file && (
            <div className="p-6 border-t border-border flex justify-end gap-3 bg-gradient-to-r from-primary/5 to-primary/10">
              <button
                onClick={handleClose}
                className="px-6 py-3 glass border border-border rounded-xl hover:border-primary transition-colors font-semibold"
                disabled={uploading}
              >
                İptal
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading || !name}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Yükleniyor...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Ekle
                  </>
                )}
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}