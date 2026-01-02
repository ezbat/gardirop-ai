"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Upload, Music, Users, Sparkles } from "lucide-react"
import { createStory, generateId } from "@/lib/storage"

interface AddStoryModalProps {
  isOpen: boolean
  onClose: () => void
  onStoryAdded?: () => void
}

export default function AddStoryModal({ isOpen, onClose, onStoryAdded }: AddStoryModalProps) {
  const { data: session } = useSession()
  const userId = session?.user?.id
  const userName = session?.user?.name || "User"
  const userAvatar = session?.user?.image || ""

  const [image, setImage] = useState<string>("")
  const [caption, setCaption] = useState("")
  const [filter, setFilter] = useState<string>("")
  const [music, setMusic] = useState("")
  const [closeFriends, setCloseFriends] = useState(false)
  const [uploading, setUploading] = useState(false)

  const filters = [
    { name: "Normal", value: "" },
    { name: "Clarendon", value: "brightness(1.1) contrast(1.1) saturate(1.3)" },
    { name: "Gingham", value: "brightness(1.05) hue-rotate(-10deg)" },
    { name: "Moon", value: "grayscale(1) contrast(1.1) brightness(1.1)" },
    { name: "Lark", value: "contrast(0.9) sepia(0.3)" },
    { name: "Reyes", value: "sepia(0.22) brightness(1.1) contrast(0.85)" },
    { name: "Juno", value: "contrast(1.2) brightness(1.1) saturate(1.4)" },
  ]

  const musicOptions = [
    "Yok",
    "Mood - 24kGoldn",
    "Blinding Lights - The Weeknd",
    "Levitating - Dua Lipa",
    "Good 4 U - Olivia Rodrigo",
    "Heat Waves - Glass Animals",
  ]

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      setImage(event.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async () => {
    if (!userId || !image) return

    setUploading(true)

    try {
      const story = {
        id: generateId(),
        userId,
        userName,
        userAvatar,
        imageUrl: image,
        caption: caption || undefined,
        filter: filter || undefined,
        music: music !== "Yok" ? music : undefined,
        closeFriends,
        viewers: [],
        createdAt: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 saat
      }

      await createStory(story)

      if (onStoryAdded) {
        onStoryAdded()
      }

      handleClose()
    } catch (error) {
      console.error("Failed to add story:", error)
      alert("Hikaye eklenemedi!")
    }

    setUploading(false)
  }

  const handleClose = () => {
    setImage("")
    setCaption("")
    setFilter("")
    setMusic("")
    setCloseFriends(false)
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
          {/* HEADER */}
          <div className="p-6 border-b border-border flex items-center justify-between bg-gradient-to-r from-primary/5 to-primary/10">
            <h2 className="text-2xl font-bold">Hikaye Ekle</h2>
            <button
              onClick={handleClose}
              className="w-10 h-10 rounded-full hover:bg-secondary flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 max-h-[70vh] overflow-y-auto">
            {/* IMAGE UPLOAD */}
            {!image ? (
              <label className="block aspect-[9/16] max-h-96 glass border-2 border-dashed border-border rounded-2xl cursor-pointer hover:border-primary transition-colors">
                <div className="h-full flex flex-col items-center justify-center">
                  <Upload className="w-16 h-16 text-muted-foreground mb-4" />
                  <p className="text-lg font-semibold mb-2">Gorsel Yukle</p>
                  <p className="text-sm text-muted-foreground">Tiklayin veya surukleyin</p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="space-y-6">
                {/* IMAGE PREVIEW */}
                <div className="relative aspect-[9/16] max-h-96 mx-auto rounded-2xl overflow-hidden">
                  <img
                    src={image}
                    alt="Story preview"
                    className="w-full h-full object-cover"
                    style={{ filter }}
                  />
                  {caption && (
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
                      <p className="text-white text-center">{caption}</p>
                    </div>
                  )}
                  <button
                    onClick={() => setImage("")}
                    className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* CAPTION */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Aciklama</label>
                  <input
                    type="text"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Bir sey yaz..."
                    maxLength={100}
                    className="w-full px-4 py-2 glass border border-border rounded-xl outline-none focus:border-primary"
                  />
                  <p className="text-xs text-muted-foreground mt-1">{caption.length}/100</p>
                </div>

                {/* FILTERS */}
                <div>
                  <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Filtre
                  </label>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {filters.map((f) => (
                      <button
                        key={f.name}
                        onClick={() => setFilter(f.value)}
                        className={`px-4 py-2 rounded-xl font-semibold text-sm whitespace-nowrap transition-all ${
                          filter === f.value
                            ? "bg-primary text-primary-foreground"
                            : "glass border border-border hover:border-primary"
                        }`}
                      >
                        {f.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* MUSIC */}
                <div>
                  <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                    <Music className="w-4 h-4" />
                    Muzik
                  </label>
                  <select
                    value={music}
                    onChange={(e) => setMusic(e.target.value)}
                    className="w-full px-4 py-2 glass border border-border rounded-xl outline-none focus:border-primary"
                  >
                    {musicOptions.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                {/* CLOSE FRIENDS */}
                <div className="glass border border-border rounded-xl p-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={closeFriends}
                      onChange={(e) => setCloseFriends(e.target.checked)}
                      className="w-5 h-5 rounded accent-primary"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-green-500" />
                        <p className="font-semibold">Yakin Arkadaslar</p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Sadece yakin arkadaslarin gorebilir
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* FOOTER */}
          {image && (
            <div className="p-6 border-t border-border flex justify-end gap-3 bg-gradient-to-r from-primary/5 to-primary/10">
              <button
                onClick={handleClose}
                className="px-6 py-3 glass border border-border rounded-xl hover:border-primary transition-colors font-semibold"
              >
                Iptal
              </button>
              <button
                onClick={handleSubmit}
                disabled={uploading}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
              >
                {uploading ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                    />
                    Yukleniyor...
                  </>
                ) : (
                  "Paylas"
                )}
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}