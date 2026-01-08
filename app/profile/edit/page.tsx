"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Camera, Save, X, Instagram, Sparkles, User, Type, MessageSquare, Shirt, Loader2 } from "lucide-react"
import FloatingParticles from "@/components/floating-particles"
import { supabase } from "@/lib/supabase"

const STYLE_OPTIONS = [
  "Klasik", "Spor", "Casual", "Şık", "Vintage", "Streetwear", 
  "Minimal", "Bohemian", "Rock", "Elegant", "Business", "Retro"
]

export default function ProfileEditPage() {
  const { data: session, update: updateSession } = useSession()
  const router = useRouter()
  const userId = session?.user?.id

  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string>(session?.user?.image || "")
  const [name, setName] = useState(session?.user?.name || "")
  const [username, setUsername] = useState("")
  const [bio, setBio] = useState("")
  const [instagram, setInstagram] = useState("")
  const [style, setStyle] = useState("")
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session) {
      router.push('/api/auth/signin')
      return
    }
    if (userId) {
      loadProfile()
    }
  }, [userId, session, router])

  const loadProfile = async () => {
    if (!userId) return
    setLoading(true)
    try {
      const { data, error } = await supabase.from('users').select('username, bio, instagram, style, avatar_url').eq('id', userId).single()
      if (error) throw error
      if (data) {
        setUsername(data.username || "")
        setBio(data.bio || "")
        setInstagram(data.instagram || "")
        setStyle(data.style || "")
        if (data.avatar_url) setPreview(data.avatar_url)
      }
    } catch (error) {
      console.error('Load profile error:', error)
    } finally {
      setLoading(false)
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
      let avatarUrl = session?.user?.image || preview || ""
      if (file) {
        const fileExtension = file.name.split('.').pop() || 'jpg'
        const timestamp = Date.now()
        const randomString = Math.random().toString(36).substring(7)
        const fileName = `avatars/${userId}/${timestamp}_${randomString}.${fileExtension}`
        const { error: uploadError } = await supabase.storage.from('clothes-images').upload(fileName, file)
        if (uploadError) throw uploadError
        const { data: urlData } = supabase.storage.from('clothes-images').getPublicUrl(fileName)
        avatarUrl = urlData.publicUrl
      }
      const { error: updateError } = await supabase.from('users').update({ name, username: username || null, bio: bio || null, instagram: instagram || null, style: style || null, avatar_url: avatarUrl }).eq('id', userId)
      if (updateError) {
        if (updateError.code === '23505') {
          alert('Bu kullanıcı adı zaten kullanılıyor!')
          setUploading(false)
          return
        }
        throw updateError
      }
      await updateSession({ ...session, user: { ...session?.user, name, image: avatarUrl } })
      alert('Profil güncellendi! ✨')
      router.push('/profile')
    } catch (error: any) {
      console.error('Update profile error:', error)
      alert(`Güncelleme başarısız: ${error.message || 'Bilinmeyen hata'}`)
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-background via-primary/5 to-background">
      <FloatingParticles />
      <div className="relative py-8 px-4">
        <div className="container mx-auto max-w-4xl">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="font-serif text-4xl font-bold mb-2 bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">Profili Düzenle</h1>
              <p className="text-muted-foreground">Kişiselleştir, öne çık ✨</p>
            </div>
            <button onClick={() => router.push('/profile')} className="p-3 glass border border-border rounded-xl hover:border-primary transition-colors"><X className="w-5 h-5" /></button>
          </motion.div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="glass border border-border rounded-2xl p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-full blur-3xl -z-10" />
              <div className="flex flex-col items-center gap-6">
                <div className="relative">
                  <div className="w-40 h-40 rounded-full overflow-hidden bg-gradient-to-br from-primary to-purple-500 p-1">
                    <div className="w-full h-full rounded-full overflow-hidden bg-background">
                      {preview ? (<img src={preview} alt="Avatar" className="w-full h-full object-cover" />) : (<div className="w-full h-full flex items-center justify-center text-6xl">👤</div>)}
                    </div>
                  </div>
                  <label className="absolute bottom-2 right-2 p-3 bg-gradient-to-br from-primary to-purple-500 text-white rounded-full cursor-pointer hover:scale-110 transition-transform shadow-lg"><Camera className="w-5 h-5" /><input type="file" accept="image/*" onChange={handleFileChange} className="hidden" disabled={uploading} /></label>
                </div>
                <div className="text-center"><p className="text-sm text-muted-foreground">Profil fotoğrafını değiştir</p><p className="text-xs text-muted-foreground mt-1">Önerilen: 400x400px, Max 5MB</p></div>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="glass border border-border rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center"><User className="w-5 h-5 text-primary" /></div><h3 className="text-xl font-bold">Temel Bilgiler</h3></div>
              <div className="space-y-4">
                <div><label className="block text-sm font-semibold mb-2 flex items-center gap-2"><Type className="w-4 h-4" />İsim *</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3 glass border border-border rounded-xl outline-none focus:border-primary transition-colors" required disabled={uploading} /></div>
                <div><label className="block text-sm font-semibold mb-2 flex items-center gap-2"><Sparkles className="w-4 h-4" />Kullanıcı Adı</label><input type="text" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))} placeholder="kullaniciadi" className="w-full px-4 py-3 glass border border-border rounded-xl outline-none focus:border-primary transition-colors" disabled={uploading} /><p className="text-xs text-muted-foreground mt-1">Boşluksuz, küçük harflerle</p></div>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="glass border border-border rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/5 flex items-center justify-center"><MessageSquare className="w-5 h-5 text-purple-500" /></div><h3 className="text-xl font-bold">Hakkında</h3></div>
              <div><label className="block text-sm font-semibold mb-2">Bio</label><textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Kendini tanıt..." className="w-full px-4 py-3 glass border border-border rounded-xl outline-none focus:border-primary transition-colors resize-none" rows={4} maxLength={200} disabled={uploading} /><p className="text-xs text-muted-foreground text-right mt-1">{bio.length}/200</p></div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass border border-border rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500/20 to-pink-500/5 flex items-center justify-center"><Shirt className="w-5 h-5 text-pink-500" /></div><h3 className="text-xl font-bold">Stil & Sosyal</h3></div>
              <div className="space-y-4">
                <div><label className="block text-sm font-semibold mb-2 flex items-center gap-2"><Instagram className="w-4 h-4" />Instagram</label><input type="text" value={instagram} onChange={(e) => setInstagram(e.target.value.replace('@', ''))} placeholder="kullaniciadi" className="w-full px-4 py-3 glass border border-border rounded-xl outline-none focus:border-primary transition-colors" disabled={uploading} /><p className="text-xs text-muted-foreground mt-1">@ olmadan sadece kullanıcı adı</p></div>
                <div><label className="block text-sm font-semibold mb-2">Giyim Tarzı</label><div className="grid grid-cols-3 md:grid-cols-4 gap-2">{STYLE_OPTIONS.map(s => (<button key={s} type="button" onClick={() => setStyle(s)} disabled={uploading} className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all ${style === s ? "bg-gradient-to-r from-primary to-purple-500 text-white" : "glass border border-border hover:border-primary"}`}>{s}</button>))}</div></div>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="flex gap-4">
              <button type="button" onClick={() => router.push('/profile')} className="flex-1 px-6 py-4 glass border border-border rounded-xl font-semibold hover:border-primary transition-colors" disabled={uploading}>İptal</button>
              <button type="submit" disabled={uploading || !name.trim()} className="flex-1 px-6 py-4 bg-gradient-to-r from-primary to-purple-500 text-white rounded-xl font-semibold hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 transition-transform flex items-center justify-center gap-2 shadow-lg">{uploading ? (<><Loader2 className="w-5 h-5 animate-spin" />Kaydediliyor...</>) : (<><Save className="w-5 h-5" />Kaydet</>)}</button>
            </motion.div>
          </form>
        </div>
      </div>
    </div>
  )
}