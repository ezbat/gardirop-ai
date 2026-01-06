"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Upload, Loader2, Sparkles } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface AddClothModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export default function AddClothModal({ isOpen, onClose, onSuccess }: AddClothModalProps) {
  const { data: session } = useSession()
  const userId = session?.user?.id

  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string>("")
  const [uploading, setUploading] = useState(false)
  const [processingBackground, setProcessingBackground] = useState(false)
  const [processedImageUrl, setProcessedImageUrl] = useState<string>("")
  const [formData, setFormData] = useState({
    name: "",
    category: "T-shirt",
    brand: "",
    season: "Summer",
    occasion: "Casual"
  })

  const categories = ["T-shirt", "Shirt", "Pants", "Dress", "Shoes", "Jacket", "Accessories"]
  const seasons = ["Spring", "Summer", "Fall", "Winter"]
  const occasions = ["Casual", "Formal", "Sport", "Party", "Work"]

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setProcessedImageUrl("")
    const reader = new FileReader()
    reader.onload = (event) => {
      if (event.target?.result) {
        setPreview(event.target.result as string)
      }
    }
    reader.readAsDataURL(selectedFile)
  }

  const handleRemoveBackground = async () => {
    if (!file || !userId) return

    setProcessingBackground(true)
    try {
      // Önce resmi upload et (temp)
      const fileExtension = file.name.split('.').pop() || 'jpg'
      const timestamp = Date.now()
      const randomString = Math.random().toString(36).substring(7)
      const tempFileName = `${userId}/temp_${timestamp}_${randomString}.${fileExtension}`

      console.log('📤 Uploading temp file:', tempFileName)

      const { error: uploadError } = await supabase.storage
        .from('clothes-images')
        .upload(tempFileName, file)

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('clothes-images')
        .getPublicUrl(tempFileName)

      console.log('🎨 Removing background from:', urlData.publicUrl)

      // Background removal API'yi çağır
      const response = await fetch('/api/remove-background', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: urlData.publicUrl })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Background removal failed')
      }

      const { resultUrl } = await response.json()
      
      console.log('✅ Background removed:', resultUrl)
      
      setProcessedImageUrl(resultUrl)
      setPreview(resultUrl)

      // Temp dosyayı sil
      await supabase.storage
        .from('clothes-images')
        .remove([tempFileName])

      alert('Arkaplan kaldırıldı! ✨')
    } catch (error: any) {
      console.error('Background removal error:', error)
      alert(`Arkaplan kaldırma başarısız: ${error.message}`)
    } finally {
      setProcessingBackground(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !userId) return

    setUploading(true)
    try {
      let finalImageUrl = processedImageUrl

      // Eğer arkaplan kaldırılmamışsa, normal upload
      if (!processedImageUrl) {
        const fileExtension = file.name.split('.').pop() || 'jpg'
        const timestamp = Date.now()
        const randomString = Math.random().toString(36).substring(7)
        const cleanFileName = `${userId}/${timestamp}_${randomString}.${fileExtension}`

        console.log('📤 Uploading to:', cleanFileName)

        const { error: uploadError } = await supabase.storage
          .from('clothes-images')
          .upload(cleanFileName, file)

        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage
          .from('clothes-images')
          .getPublicUrl(cleanFileName)

        finalImageUrl = urlData.publicUrl
      } else {
        // İşlenmiş resmi indir ve upload et
        console.log('💾 Downloading processed image:', processedImageUrl)
        
        const imageResponse = await fetch(processedImageUrl)
        const imageBlob = await imageResponse.blob()
        
        const timestamp = Date.now()
        const randomString = Math.random().toString(36).substring(7)
        const processedFileName = `${userId}/processed_${timestamp}_${randomString}.png`

        const { error: uploadError } = await supabase.storage
          .from('clothes-images')
          .upload(processedFileName, imageBlob, {
            contentType: 'image/png'
          })

        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage
          .from('clothes-images')
          .getPublicUrl(processedFileName)

        finalImageUrl = urlData.publicUrl
      }

      console.log('💾 Final image URL:', finalImageUrl)

      const { error: insertError } = await supabase
        .from('clothes')
        .insert({
          user_id: userId,
          name: formData.name,
          category: formData.category,
          brand: formData.brand || null,
          color_hex: "#000000",
          image_url: finalImageUrl,
          season: [formData.season],
          occasions: [formData.occasion],
          is_favorite: false
        })

      if (insertError) throw insertError

      alert('Kıyafet eklendi! ✨')
      handleClose()
      if (onSuccess) onSuccess()
    } catch (error: any) {
      console.error('Upload error:', error)
      alert(`Yükleme başarısız: ${error.message || 'Bilinmeyen hata'}`)
    } finally {
      setUploading(false)
    }
  }

  const handleClose = () => {
    setFile(null)
    setPreview("")
    setProcessedImageUrl("")
    setFormData({ name: "", category: "T-shirt", brand: "", season: "Summer", occasion: "Casual" })
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
          className="w-full max-w-2xl glass border border-border rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
        >
          <div className="p-6 border-b border-border flex items-center justify-between">
            <h2 className="text-2xl font-bold">Kıyafet Ekle</h2>
            <button
              onClick={handleClose}
              className="w-10 h-10 rounded-full hover:bg-secondary flex items-center justify-center"
              disabled={uploading || processingBackground}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left - Image Upload */}
              <div>
                {!file ? (
                  <label className="block aspect-square glass border-2 border-dashed border-border rounded-2xl cursor-pointer hover:border-primary transition-colors">
                    <div className="h-full flex flex-col items-center justify-center">
                      <Upload className="w-16 h-16 text-muted-foreground mb-4" />
                      <p className="text-lg font-semibold mb-2">Fotoğraf Seç</p>
                      <p className="text-sm text-muted-foreground">Kıyafet fotoğrafı yükle</p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                      disabled={uploading || processingBackground}
                    />
                  </label>
                ) : (
                  <div className="space-y-3">
                    <div className="aspect-square rounded-2xl overflow-hidden border-2 border-border relative">
                      <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                      
                      {processedImageUrl && (
                        <div className="absolute top-2 right-2 px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          İşlendi
                        </div>
                      )}
                    </div>

                    {!processedImageUrl && (
                      <button
                        type="button"
                        onClick={handleRemoveBackground}
                        disabled={processingBackground || uploading}
                        className="w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {processingBackground ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            İşleniyor...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-5 h-5" />
                            Arkaplanı Kaldır (AI)
                          </>
                        )}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setFile(null)
                        setPreview("")
                        setProcessedImageUrl("")
                      }}
                      className="w-full px-4 py-2 glass border border-border rounded-xl text-sm hover:border-primary transition-colors"
                      disabled={uploading || processingBackground}
                    >
                      Başka Fotoğraf Seç
                    </button>
                  </div>
                )}
              </div>

              {/* Right - Form Fields */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">İsim *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 glass border border-border rounded-xl outline-none focus:border-primary"
                    required
                    disabled={uploading || processingBackground}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Kategori</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-3 glass border border-border rounded-xl outline-none focus:border-primary"
                    disabled={uploading || processingBackground}
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Marka</label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full px-4 py-3 glass border border-border rounded-xl outline-none focus:border-primary"
                    disabled={uploading || processingBackground}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Sezon</label>
                  <select
                    value={formData.season}
                    onChange={(e) => setFormData({ ...formData, season: e.target.value })}
                    className="w-full px-4 py-3 glass border border-border rounded-xl outline-none focus:border-primary"
                    disabled={uploading || processingBackground}
                  >
                    {seasons.map(season => (
                      <option key={season} value={season}>{season}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Durum</label>
                  <select
                    value={formData.occasion}
                    onChange={(e) => setFormData({ ...formData, occasion: e.target.value })}
                    className="w-full px-4 py-3 glass border border-border rounded-xl outline-none focus:border-primary"
                    disabled={uploading || processingBackground}
                  >
                    {occasions.map(occasion => (
                      <option key={occasion} value={occasion}>{occasion}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-6 py-3 glass border border-border rounded-xl font-semibold hover:border-primary transition-colors"
                disabled={uploading || processingBackground}
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={!file || uploading || processingBackground}
                className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Yükleniyor...
                  </>
                ) : (
                  'Gardıroba Ekle'
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}