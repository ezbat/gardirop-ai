"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Upload, Loader2, Camera } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface EditProfileModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export default function EditProfileModal({ isOpen, onClose, onSuccess }: EditProfileModalProps) {
  const { data: session, update: updateSession } = useSession()
  const userId = session?.user?.id

  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string>(session?.user?.image || "")
  const [name, setName] = useState(session?.user?.name || "")
  const [username, setUsername] = useState("")
  const [bio, setBio] = useState("")
  const [uploading, setUploading] = useState(false)
  const [loadingProfile, setLoadingProfile] = useState(true)

  // Load current profile data
  useState(() => {
    if (isOpen && userId) {
      loadProfile()
    }
  })

  const loadProfile = async () => {
    if (!userId) return
    setLoadingProfile(true)
    try {
      const { data, error } = await supabase
        .from('users')
        .select('username, bio')
        .eq('id', userId)
        .single()

      if (error) throw error

      if (data) {
        setUsername(data.username || "")
        setBio(data.bio || "")
      }
    } catch (error) {
      console.error('Load profile error:', error)
    } finally {
      setLoadingProfile(false)
    }
  }

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
    if (!userId) return

    setUploading(true)
    try {
      let avatarUrl = session?.user?.image || ""

      // Eğer yeni avatar yüklendiyse
      if (file) {
        const fileExtension = file.name.split('.').pop() || 'jpg'
        const timestamp = Date.now()
        const randomString = Math.random().toString(36).substring(7)
        const fileName = `avatars/${userId}/${timestamp}_${randomString}.${fileExtension}`

        const { error: uploadError } = await supabase.storage
          .from('clothes-images')
          .upload(fileName, file)

        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage
          .from('clothes-images')
          .getPublicUrl(fileName)

        avatarUrl = urlData.publicUrl
      }

      // Users tablosunu güncelle
      const { error: updateError } = await supabase
        .from('users')
        .update({
          name,
          username: username || null,
          bio: bio || null,
          avatar_url: avatarUrl
        })
        .eq('id', userId)

      if (updateError) {
        if (updateError.code === '23505') {
          alert('Bu kullanıcı adı zaten kullanılıyor!')
          setUploading(false)
          return
        }
        throw updateError
      }

      // Session'ı güncelle
      await updateSession({
        ...session,
        user: {
          ...session?.user,
          name,
          image: avatarUrl
        }
      })

      alert('Profil güncellendi! ✨')
      handleClose()
      if (onSuccess) onSuccess()
      
      // Sayfayı yenile
      window.location.reload()
    } catch (error: any) {
      console.error('Update profile error:', error)
      alert(`Güncelleme başarısız: ${error.message || 'Bilinmeyen hata'}`)
    } finally {
      setUploading(false)
    }
  }

  const handleClose = () => {
    setFile(null)
    setPreview(session?.user?.image || "")
    setName(session?.user?.name || "")
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
          {/* Header */}
          <div className="p-6 border-b border-border flex items-center justify-between">
            <h2 className="text-2xl font-bold">Profili Düzenle</h2>
            <button
              onClick={handleClose}
              className="w-10 h-10 rounded-full hover:bg-secondary flex items-center justify-center"
              disabled={uploading}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Avatar Upload */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-32 h-32 rounded-full overflow-hidden bg-primary/10 border-2 border-border">
                  {preview ? (
                    <img src={preview} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">
                      👤
                    </div>
                  )}
                </div>
                <label className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full cursor-pointer hover:opacity-90 transition-opacity">
                  <Camera className="w-5 h-5" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Profil fotoğrafını değiştirmek için tıkla
              </p>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-semibold mb-2">İsim *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 glass border border-border rounded-xl outline-none focus:border-primary"
                required
                disabled={uploading}
              />
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm font-semibold mb-2">Kullanıcı Adı</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                placeholder="kullaniciadi"
                className="w-full px-4 py-3 glass border border-border rounded-xl outline-none focus:border-primary"
                disabled={uploading}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Boşluksuz, küçük harflerle
              </p>
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-semibold mb-2">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Kendini tanıt..."
                className="w-full px-4 py-3 glass border border-border rounded-xl outline-none focus:border-primary resize-none"
                rows={4}
                maxLength={200}
                disabled={uploading}
              />
              <p className="text-xs text-muted-foreground text-right mt-1">
                {bio.length}/200
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-6 py-3 glass border border-border rounded-xl font-semibold hover:border-primary transition-colors"
                disabled={uploading}
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={uploading || !name.trim()}
                className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Kaydediliyor...
                  </>
                ) : (
                  'Kaydet'
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}