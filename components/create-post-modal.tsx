"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Upload, Loader2, Send } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface CreatePostModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export default function CreatePostModal({ isOpen, onClose, onSuccess }: CreatePostModalProps) {
  const { data: session } = useSession()
  const userId = session?.user?.id

  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string>("")
  const [caption, setCaption] = useState("")
  const [uploading, setUploading] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    const reader = new FileReader()
    reader.onload = (event) => {
      if (event.target?.result) {
        setPreview(event.target.result as string)
      }
    }
    reader.readAsDataURL(selectedFile)
  }

  const handlePost = async () => {
    if (!file || !userId) return

    setUploading(true)
    try {
      // 1. Upload image
      const fileName = `${userId}/${Date.now()}-${file.name}`
      const { error: uploadError } = await supabase.storage
        .from('clothes-images')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('clothes-images')
        .getPublicUrl(fileName)

      // 2. Create post
      const { error: postError } = await supabase
        .from('posts')
        .insert({
          user_id: userId,
          caption,
          image_url: urlData.publicUrl,
          likes_count: 0,
          comments_count: 0
        })

      if (postError) throw postError

      alert('Gönderi paylaşıldı! ✨')
      handleClose()
      if (onSuccess) onSuccess()
    } catch (error) {
      console.error('Post error:', error)
      alert('Paylaşım başarısız!')
    } finally {
      setUploading(false)
    }
  }

  const handleClose = () => {
    setFile(null)
    setPreview("")
    setCaption("")
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
          className="w-full max-w-lg glass border border-border rounded-2xl overflow-hidden"
        >
          <div className="p-6 border-b border-border flex items-center justify-between">
            <h2 className="text-2xl font-bold">Yeni Gönderi</h2>
            <button onClick={handleClose} className="w-10 h-10 rounded-full hover:bg-secondary flex items-center justify-center transition-colors" disabled={uploading}>
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            {!file ? (
              <label className="block aspect-square glass border-2 border-dashed border-border rounded-2xl cursor-pointer hover:border-primary transition-colors">
                <div className="h-full flex flex-col items-center justify-center">
                  <Upload className="w-16 h-16 text-muted-foreground mb-4" />
                  <p className="text-lg font-semibold mb-2">Fotoğraf Seç</p>
                  <p className="text-sm text-muted-foreground">Kombininizi paylaşın</p>
                </div>
                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" disabled={uploading} />
              </label>
            ) : (
              <>
                {preview && (
                  <div className="relative aspect-square rounded-2xl overflow-hidden">
                    <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                    <button onClick={() => { setFile(null); setPreview("") }} className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors" disabled={uploading}>
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                )}
                <textarea value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Açıklama yaz..." className="w-full px-4 py-3 glass border border-border rounded-xl outline-none focus:border-primary resize-none" rows={3} disabled={uploading} />
              </>
            )}
          </div>

          {file && (
            <div className="p-6 border-t border-border flex justify-end gap-3">
              <button onClick={handleClose} className="px-6 py-3 glass border border-border rounded-xl hover:border-primary transition-colors font-semibold" disabled={uploading}>İptal</button>
              <button onClick={handlePost} disabled={uploading} className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2">
                {uploading ? <><Loader2 className="w-5 h-5 animate-spin" />Paylaşılıyor...</> : <><Send className="w-5 h-5" />Paylaş</>}
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}