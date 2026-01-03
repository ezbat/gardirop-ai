"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Upload, Loader2 } from "lucide-react"
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
    const reader = new FileReader()
    reader.onload = (event) => {
      if (event.target?.result) {
        setPreview(event.target.result as string)
      }
    }
    reader.readAsDataURL(selectedFile)
  }

 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  if (!file || !userId) return

  setUploading(true)
  try {
    // Dosya adını temizle
    const cleanFileName = file.name
      .toLowerCase()
      .replace(/ş/g, 's')
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/ı/g, 'i')
      .replace(/[^a-z0-9.]/g, '_')

    const fileName = `${userId}/${Date.now()}-${cleanFileName}`
    
    const { error: uploadError } = await supabase.storage
      .from('clothes-images')
      .upload(fileName, file)

    if (uploadError) throw uploadError

    const { data: urlData } = supabase.storage
      .from('clothes-images')
      .getPublicUrl(fileName)

    const { error: insertError } = await supabase
      .from('clothes')
      .insert({
        user_id: userId,
        name: formData.name,
        category: formData.category,
        brand: formData.brand || null,
        color_hex: "#000000",
        image_url: urlData.publicUrl,
        season: [formData.season],
        occasions: [formData.occasion],
        is_favorite: false
      })

    if (insertError) throw insertError

    alert('Kıyafet eklendi! ✨')
    handleClose()
    if (onSuccess) onSuccess()
  } catch (error) {
    console.error('Upload error:', error)
    alert('Yükleme başarısız!')
  } finally {
    setUploading(false)
  }
}
  const handleClose = () => {
    setFile(null)
    setPreview("")
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
          className="w-full max-w-2xl glass border border-border rounded-2xl overflow-hidden"
        >
          <div className="p-6 border-b border-border flex items-center justify-between">
            <h2 className="text-2xl font-bold">Kıyafet Ekle</h2>
            <button onClick={handleClose} className="w-10 h-10 rounded-full hover:bg-secondary flex items-center justify-center" disabled={uploading}>
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                {!file ? (
                  <label className="block aspect-square glass border-2 border-dashed border-border rounded-2xl cursor-pointer hover:border-primary">
                    <div className="h-full flex flex-col items-center justify-center">
                      <Upload className="w-16 h-16 text-muted-foreground mb-4" />
                      <p className="text-lg font-semibold mb-2">Fotoğraf Seç</p>
                    </div>
                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" disabled={uploading} />
                  </label>
                ) : (
                  <div className="relative aspect-square rounded-2xl overflow-hidden">
                    <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">İsim *</label>
                  <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 glass border border-border rounded-xl outline-none focus:border-primary" disabled={uploading} />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Kategori</label>
                  <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="w-full px-4 py-2 glass border border-border rounded-xl outline-none focus:border-primary" disabled={uploading}>
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Marka</label>
                  <input type="text" value={formData.brand} onChange={(e) => setFormData({...formData, brand: e.target.value})} className="w-full px-4 py-2 glass border border-border rounded-xl outline-none focus:border-primary" disabled={uploading} />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Sezon</label>
                  <select value={formData.season} onChange={(e) => setFormData({...formData, season: e.target.value})} className="w-full px-4 py-2 glass border border-border rounded-xl outline-none focus:border-primary" disabled={uploading}>
                    {seasons.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Durum</label>
                  <select value={formData.occasion} onChange={(e) => setFormData({...formData, occasion: e.target.value})} className="w-full px-4 py-2 glass border border-border rounded-xl outline-none focus:border-primary" disabled={uploading}>
                    {occasions.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button type="button" onClick={handleClose} className="px-6 py-3 glass border border-border rounded-xl hover:border-primary font-semibold" disabled={uploading}>İptal</button>
              <button type="submit" disabled={!file || uploading} className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
                {uploading ? <><Loader2 className="w-5 h-5 animate-spin" />Yükleniyor...</> : "Ekle"}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
