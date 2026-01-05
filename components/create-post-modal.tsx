"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Upload, Loader2, Send, Hash, AtSign, Image as ImageIcon } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface CreatePostModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

interface Outfit {
  id: string
  name: string
}

export default function CreatePostModal({ isOpen, onClose, onSuccess }: CreatePostModalProps) {
  const { data: session } = useSession()
  const userId = session?.user?.id

  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [caption, setCaption] = useState("")
  const [uploading, setUploading] = useState(false)
  const [outfits, setOutfits] = useState<Outfit[]>([])
  const [selectedOutfit, setSelectedOutfit] = useState<string>("")
  const [showHashtagSuggestions, setShowHashtagSuggestions] = useState(false)
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false)

  const hashtagSuggestions = ['moda', 'stil', 'kombin', 'fashion', 'ootd', 'style', 'gardirop', 'kıyafet', 'trend', 'lookbook']

  // Dosya adı sanitizasyonu - Türkçe karakter ve boşluk sorunu çözümü
  const sanitizeFilename = (filename: string) => {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    const extension = filename.split('.').pop()
    return `${timestamp}-${random}.${extension}`
  }

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    if (selectedFiles.length === 0) return

    // Maksimum 5 resim
    const filesToAdd = selectedFiles.slice(0, 5 - files.length)
    setFiles(prev => [...prev, ...filesToAdd])

    // Preview'ları oluştur
    filesToAdd.forEach(file => {
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          setPreviews(prev => [...prev, event.target.result as string])
        }
      }
      reader.readAsDataURL(file)
    })
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
    setPreviews(prev => prev.filter((_, i) => i !== index))
  }

  const insertHashtag = (tag: string) => {
    setCaption(prev => prev + `#${tag} `)
    setShowHashtagSuggestions(false)
  }

  const handlePost = async () => {
    if (files.length === 0 || !userId) return

    setUploading(true)
    try {
      // 1. Resimleri upload et
      const uploadedUrls: string[] = []

      for (const file of files) {
        const sanitizedName = sanitizeFilename(file.name)
        const fileName = `${userId}/${sanitizedName}`

        const { error: uploadError } = await supabase.storage
          .from('clothes-images')
          .upload(fileName, file)

        if (uploadError) {
          console.error('Upload error:', uploadError)
          throw uploadError
        }

        const { data: urlData } = supabase.storage
          .from('clothes-images')
          .getPublicUrl(fileName)

        uploadedUrls.push(urlData.publicUrl)
      }

      // 2. Post oluştur (ilk resmi kullan)
      const { error: postError } = await supabase
        .from('posts')
        .insert({
          user_id: userId,
          outfit_id: selectedOutfit || null,
          caption,
          image_url: uploadedUrls[0],
          likes_count: 0,
          comments_count: 0,
          shares_count: 0
        })

      if (postError) throw postError

      alert('Gönderi paylaşıldı! ✨')
      handleClose()
      if (onSuccess) onSuccess()
    } catch (error) {
      console.error('Post error:', error)
      alert('Paylaşım başarısız! Lütfen tekrar deneyin.')
    } finally {
      setUploading(false)
    }
  }

  const handleClose = () => {
    setFiles([])
    setPreviews([])
    setCaption("")
    setSelectedOutfit("")
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
          {/* Header */}
          <div className="p-6 border-b border-border flex items-center justify-between sticky top-0 glass z-10">
            <h2 className="text-2xl font-bold">Yeni Gönderi</h2>
            <button
              onClick={handleClose}
              className="w-10 h-10 rounded-full hover:bg-secondary flex items-center justify-center transition-colors"
              disabled={uploading}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            {/* Image Upload */}
            {files.length === 0 ? (
              <label className="block aspect-video glass border-2 border-dashed border-border rounded-2xl cursor-pointer hover:border-primary transition-colors">
                <div className="h-full flex flex-col items-center justify-center">
                  <Upload className="w-16 h-16 text-muted-foreground mb-4" />
                  <p className="text-lg font-semibold mb-2">Fotoğraf Seç</p>
                  <p className="text-sm text-muted-foreground">Kombininizi paylaşın (En fazla 5 resim)</p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFilesChange}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            ) : (
              <>
                {/* Image Previews */}
                <div className="grid grid-cols-2 gap-3">
                  {previews.map((preview, idx) => (
                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden">
                      <img src={preview} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => removeFile(idx)}
                        className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                        disabled={uploading}
                      >
                        <X className="w-4 h-4" />
                      </button>
                      {idx === 0 && (
                        <div className="absolute bottom-2 left-2 px-2 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full">
                          Kapak
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {/* Add More Button */}
                  {files.length < 5 && (
                    <label className="aspect-square glass border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary transition-colors flex items-center justify-center">
                      <div className="text-center">
                        <ImageIcon className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground">Daha Fazla</p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFilesChange}
                        className="hidden"
                        disabled={uploading}
                      />
                    </label>
                  )}
                </div>

                {/* Caption */}
                <div className="relative">
                  <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Açıklama yaz... (#hashtag veya @mention kullanabilirsin)"
                    className="w-full px-4 py-3 glass border border-border rounded-xl outline-none focus:border-primary resize-none"
                    rows={4}
                    disabled={uploading}
                  />
                  
                  {/* Hashtag ve Mention Butonları */}
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => setShowHashtagSuggestions(!showHashtagSuggestions)}
                      className="px-3 py-1.5 glass border border-border rounded-lg text-sm font-semibold hover:border-primary transition-colors flex items-center gap-1"
                    >
                      <Hash className="w-4 h-4" />
                      Hashtag
                    </button>
                  </div>

                  {/* Hashtag Suggestions */}
                  {showHashtagSuggestions && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-2 p-3 glass border border-border rounded-xl"
                    >
                      <p className="text-xs text-muted-foreground mb-2">Popüler hashtag'ler:</p>
                      <div className="flex flex-wrap gap-2">
                        {hashtagSuggestions.map(tag => (
                          <button
                            key={tag}
                            onClick={() => insertHashtag(tag)}
                            className="px-3 py-1 text-sm glass border border-border rounded-full hover:border-primary transition-colors"
                          >
                            #{tag}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Character Count */}
                <div className="text-right">
                  <span className="text-xs text-muted-foreground">
                    {caption.length}/500
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          {files.length > 0 && (
            <div className="p-6 border-t border-border flex justify-end gap-3 sticky bottom-0 glass">
              <button
                onClick={handleClose}
                className="px-6 py-3 glass border border-border rounded-xl hover:border-primary transition-colors font-semibold"
                disabled={uploading}
              >
                İptal
              </button>
              <button
                onClick={handlePost}
                disabled={uploading || files.length === 0}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Paylaşılıyor...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Paylaş
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