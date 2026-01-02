"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { X, Camera, Loader2 } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { updateUser, getUser, type User } from "@/lib/storage"

interface EditProfileModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  onSave: () => void
}

export default function EditProfileModal({ isOpen, onClose, userId, onSave }: EditProfileModalProps) {
  const [user, setUser] = useState<User | null>(null)
  const [name, setName] = useState("")
  const [bio, setBio] = useState("")
  const [website, setWebsite] = useState("")
  const [avatar, setAvatar] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && userId) {
      loadUser()
    }
  }, [isOpen, userId])

  const loadUser = async () => {
    try {
      const userData = await getUser(userId)
      if (userData) {
        setUser(userData)
        setName(userData.name)
        setBio(userData.bio || "")
        setWebsite(userData.website || "")
        setAvatar(userData.avatar)
      }
    } catch (error) {
      console.error("Failed to load user:", error)
    }
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      setAvatar(event.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    if (!user) return

    setLoading(true)
    try {
      const updatedUser: User = {
        ...user,
        name,
        bio,
        website,
        avatar
      }

      await updateUser(updatedUser)
      onSave()
    } catch (error) {
      console.error("Failed to update profile:", error)
      alert("Profil guncellenemedi!")
    }
    setLoading(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Profili Duzenle</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-6">
            <div className="flex flex-col items-center">
              <div className="relative">
                <Avatar className="w-24 h-24 border-4 border-primary/20">
                  <AvatarImage src={avatar} />
                  <AvatarFallback className="bg-primary/10 text-primary text-3xl">
                    {name[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <label className="absolute bottom-0 right-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity">
                  <Camera className="w-4 h-4" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </label>
              </div>
              <p className="text-sm text-muted-foreground mt-2">Profil fotografini degistir</p>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Isim</label>
              <Input
                value={name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                placeholder="Ismin"
                maxLength={50}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Biyografi</label>
              <Textarea
                value={bio}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setBio(e.target.value)}
                placeholder="Kendinden bahset..."
                maxLength={150}
                rows={3}
              />
              <p className="text-xs text-muted-foreground mt-1">{bio.length}/150</p>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Website</label>
              <Input
                value={website}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWebsite(e.target.value)}
                placeholder="https://example.com"
                type="url"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-8">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 glass border border-border rounded-xl hover:border-primary transition-colors"
            >
              Iptal
            </button>
            <button
              onClick={handleSave}
              disabled={loading || !name.trim()}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Kaydet
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}