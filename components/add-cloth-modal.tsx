"use client"

import type React from "react"
import { removeBackground } from '@/lib/removeBackground'
import { useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import { motion, AnimatePresence } from "framer-motion"
import { Upload, Sparkles, Check, Shirt } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { type ClothingItem, addClothingItem, generateId } from "@/lib/storage"
import { cn } from "@/lib/utils"

interface AddClothModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  onSuccess: () => void
}

const categories = [
  { value: "T-shirt", label: "T-Shirt", icon: "👕" },
  { value: "Pants", label: "Pantolon", icon: "👖" },
  { value: "Dress", label: "Elbise", icon: "👗" },
  { value: "Jacket", label: "Ceket", icon: "🧥" },
  { value: "Shoes", label: "Ayakkabı", icon: "👟" },
  { value: "Sweater", label: "Kazak", icon: "🧶" },
  { value: "Skirt", label: "Etek", icon: "🩱" },
  { value: "Shorts", label: "Şort", icon: "🩳" },
  { value: "Accessories", label: "Aksesuar", icon: "💍" },
]

const styles = [
  { value: "Casual", label: "Günlük" },
  { value: "Elegant", label: "Şık" },
  { value: "Sporty", label: "Sportif" },
  { value: "Formal", label: "Resmi" },
]

const colorPresets = [
  "#000000",
  "#FFFFFF",
  "#FF0000",
  "#0000FF",
  "#00FF00",
  "#FFFF00",
  "#FF00FF",
  "#00FFFF",
  "#FFA500",
  "#800080",
  "#A52A2A",
  "#808080",
]

export default function AddClothModal({ isOpen, onClose, userId, onSuccess }: AddClothModalProps) {
  const [step, setStep] = useState(1)
  const [imageUrl, setImageUrl] = useState("")
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [name, setName] = useState("")
  const [category, setCategory] = useState("T-shirt")
  const [color, setColor] = useState("#000000")
  const [style, setStyle] = useState("Casual")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const resetForm = () => {
    setStep(1)
    setImageUrl("")
    setImagePreview(null)
    setIsProcessing(false)
    setUploadProgress(0)
    setName("")
    setCategory("T-shirt")
    setColor("#000000")
    setStyle("Casual")
    setIsSubmitting(false)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsProcessing(true)
    setUploadProgress(0)

    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          return 100
        }
        return prev + 10
      })
    }, 100)

    try {
      const processedBase64 = await removeBackground(file)
      setImagePreview(processedBase64)
      setImageUrl(processedBase64)
      setTimeout(() => {
        setIsProcessing(false)
        setStep(2)
      }, 1200)
    } catch (error) {
      console.error('Background removal error:', error)
      setIsProcessing(false)
      const reader = new FileReader()
      reader.onload = (event) => {
        const result = event.target?.result as string
        setImagePreview(result)
        setImageUrl(result)
        setTimeout(() => {
          setIsProcessing(false)
          setStep(2)
        }, 1200)
      }
      reader.readAsDataURL(file)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer.files?.[0]
      if (file && file.type.startsWith("image/")) {
        const input = document.createElement("input")
        input.type = "file"
        const dataTransfer = new DataTransfer()
        dataTransfer.items.add(file)
        input.files = dataTransfer.files
        handleImageUpload({ target: input } as React.ChangeEvent<HTMLInputElement>)
      }
    },
    [handleImageUpload],
  )

  const handleSubmit = async () => {
    if (!name || !userId) {
      alert("Lütfen tüm alanları doldurun!")
      return
    }

    setIsSubmitting(true)

    const newItem: ClothingItem = {
      id: generateId(),
      userId,
      name,
      category,
      color,
      style,
      imageUrl: imageUrl || undefined,
      createdAt: Date.now(),
    }

    try {
      await addClothingItem(newItem)
      onSuccess()
      setTimeout(() => {
        handleClose()
      }, 500)
    } catch (error) {
      console.error("Failed to add item:", error)
      alert("❌ Kıyafet eklenemedi!")
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg bg-card border-border overflow-hidden p-0">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute -top-1/2 -right-1/2 w-full h-full rounded-full bg-primary/5"
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        </div>

        <div className="relative p-6">
          <DialogHeader className="mb-6">
            <DialogTitle className="font-serif text-2xl flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" />
              <span>Yeni Kıyafet Ekle</span>
            </DialogTitle>
          </DialogHeader>

          <div className="flex items-center gap-2 mb-6">
            {[1, 2].map((s) => (
              <motion.div
                key={s}
                className={cn("flex-1 h-1 rounded-full transition-colors", step >= s ? "bg-primary" : "bg-muted")}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: step >= s ? 1 : 0 }}
                transition={{ duration: 0.3 }}
              />
            ))}
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <div
                  className={cn(
                    "relative border-2 border-dashed rounded-2xl p-8 text-center transition-colors cursor-pointer",
                    isProcessing
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50 hover:bg-primary/5",
                  )}
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => document.getElementById("image-upload")?.click()}
                >
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />

                  {isProcessing ? (
                    <div className="py-4">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent mx-auto mb-4"
                      />
                      <p className="text-sm text-muted-foreground mb-4">Görsel işleniyor...</p>
                      <Progress value={uploadProgress} className="h-2" />
                    </div>
                  ) : imagePreview ? (
                    <div className="relative aspect-square max-w-48 mx-auto rounded-xl overflow-hidden">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <motion.div
                        className="absolute inset-0 flex items-center justify-center bg-primary/20"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <Check className="w-12 h-12 text-primary" />
                      </motion.div>
                    </div>
                  ) : (
                    <>
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                        <Upload className="w-8 h-8 text-primary" />
                      </div>
                      <p className="font-medium mb-2">Görsel Yükle</p>
                      <p className="text-sm text-muted-foreground">Sürükle bırak veya tıklayarak seç</p>
                    </>
                  )}
                </div>

                <Button
                  variant="ghost"
                  className="w-full mt-4"
                  onClick={() => setStep(2)}
                >
                  Görselsiz devam et
                </Button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex gap-4">
                  <div className="w-24 h-24 rounded-xl overflow-hidden bg-secondary flex-shrink-0">
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Shirt className="w-8 h-8 text-muted-foreground/50" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="name" className="text-sm font-medium">
                      Kıyafet Adı
                    </Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="örn: Mavi Kot Pantolon"
                      className="mt-1.5"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">Kategori</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {categories.map((cat) => (
                      <motion.button
                        key={cat.value}
                        type="button"
                        onClick={() => setCategory(cat.value)}
                        className={cn(
                          "p-3 rounded-xl border text-center transition-colors",
                          category === cat.value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:border-primary/50",
                        )}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <span className="text-lg block mb-1">{cat.icon}</span>
                        <span className="text-xs">{cat.label}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">Renk</Label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {colorPresets.map((preset) => (
                      <motion.button
                        key={preset}
                        type="button"
                        onClick={() => setColor(preset)}
                        className={cn(
                          "w-8 h-8 rounded-full border-2 transition-transform",
                          color === preset ? "border-primary scale-110" : "border-transparent",
                        )}
                        style={{ backgroundColor: preset }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      />
                    ))}
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-8 h-8 rounded-full cursor-pointer"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">Stil</Label>
                  <Select value={style} onValueChange={(v) => setStyle(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {styles.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                    Geri
                  </Button>
                  <Button onClick={handleSubmit} disabled={!name || isSubmitting} className="flex-1 gap-2">
                    {isSubmitting ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                      />
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Gardıroba Ekle</span>
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  )
}