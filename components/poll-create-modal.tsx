"use client"

import { useState } from "react"
import { X, Upload, Loader2, Plus, Trash2 } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface PollOption {
  imageFile: File | null
  imagePreview: string | null
  caption: string
}

interface PollCreateModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  onSuccess: () => void
}

export default function PollCreateModal({ isOpen, onClose, userId, onSuccess }: PollCreateModalProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [options, setOptions] = useState<PollOption[]>([
    { imageFile: null, imagePreview: null, caption: "" },
    { imageFile: null, imagePreview: null, caption: "" }
  ])
  const [creating, setCreating] = useState(false)

  const handleImageChange = (index: number, file: File) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const newOptions = [...options]
      newOptions[index].imageFile = file
      newOptions[index].imagePreview = reader.result as string
      setOptions(newOptions)
    }
    reader.readAsDataURL(file)
  }

  const addOption = () => {
    if (options.length < 4) {
      setOptions([...options, { imageFile: null, imagePreview: null, caption: "" }])
    }
  }

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index))
    }
  }

  const updateCaption = (index: number, caption: string) => {
    const newOptions = [...options]
    newOptions[index].caption = caption
    setOptions(newOptions)
  }

  const handleCreate = async () => {
    if (!title.trim()) {
      alert('Başlık gerekli!')
      return
    }

    const validOptions = options.filter(o => o.imageFile)
    if (validOptions.length < 2) {
      alert('En az 2 seçenek gerekli!')
      return
    }

    setCreating(true)
    try {
      const uploadedOptions = await Promise.all(
        validOptions.map(async (option) => {
          if (!option.imageFile) return null
          
          const fileExt = option.imageFile.name.split('.').pop()
          const fileName = `${userId}/${Date.now()}_${Math.random()}.${fileExt}`
          const { error: uploadError } = await supabase.storage
            .from('polls')
            .upload(fileName, option.imageFile)
          
          if (uploadError) throw uploadError
          
          const { data: { publicUrl } } = supabase.storage
            .from('polls')
            .getPublicUrl(fileName)
          
          return {
            imageUrl: publicUrl,
            caption: option.caption.trim() || null,
            outfitId: null
          }
        })
      )

      const response = await fetch('/api/polls/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          title: title.trim(),
          description: description.trim() || null,
          options: uploadedOptions.filter(o => o !== null)
        })
      })

      if (!response.ok) throw new Error('Failed to create poll')

      setTitle("")
      setDescription("")
      setOptions([
        { imageFile: null, imagePreview: null, caption: "" },
        { imageFile: null, imagePreview: null, caption: "" }
      ])
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Create poll error:', error)
      alert('Anket oluşturulamadı!')
    } finally {
      setCreating(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="glass border border-border rounded-2xl overflow-hidden max-w-2xl w-full my-8">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-xl font-bold">Anket Oluştur</h2>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-sm font-semibold mb-2">Başlık *</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Hangisini giyeyim?" maxLength={100} className="w-full px-4 py-2 glass border border-border rounded-xl outline-none focus:border-primary" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Açıklama (isteğe bağlı)</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ek bilgi ekle..." maxLength={200} rows={2} className="w-full px-4 py-2 glass border border-border rounded-xl outline-none focus:border-primary resize-none" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Seçenekler (2-4 arası) *</label>
            <div className="space-y-3">
              {options.map((option, index) => (
                <div key={index} className="glass border border-border rounded-xl p-3">
                  <div className="flex items-start gap-3">
                    {!option.imagePreview ? (
                      <label className="flex-shrink-0 w-24 h-24 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors flex items-center justify-center">
                        <Upload className="w-6 h-6 text-muted-foreground" />
                        <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageChange(index, e.target.files[0])} className="hidden" />
                      </label>
                    ) : (
                      <div className="relative flex-shrink-0 w-24 h-24">
                        <img src={option.imagePreview} alt={`Option ${index + 1}`} className="w-full h-full object-cover rounded-lg" />
                        <button onClick={() => { const newOptions = [...options]; newOptions[index].imageFile = null; newOptions[index].imagePreview = null; setOptions(newOptions) }} className="absolute -top-2 -right-2 p-1 bg-red-500 hover:bg-red-600 rounded-full transition-colors">
                          <X className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    )}
                    <div className="flex-1">
                      <input type="text" value={option.caption} onChange={(e) => updateCaption(index, e.target.value)} placeholder={`Seçenek ${index + 1} açıklaması`} maxLength={50} className="w-full px-3 py-2 glass border border-border rounded-lg outline-none focus:border-primary text-sm" />
                    </div>
                    {options.length > 2 && (
                      <button onClick={() => removeOption(index)} className="p-2 hover:bg-red-500/10 rounded-lg transition-colors">
                        <Trash2 className="w-5 h-5 text-red-500" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {options.length < 4 && (
                <button onClick={addOption} className="w-full py-3 border-2 border-dashed border-border rounded-xl hover:border-primary transition-colors flex items-center justify-center gap-2 text-muted-foreground hover:text-primary">
                  <Plus className="w-5 h-5" />
                  <span className="font-semibold">Seçenek Ekle</span>
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-border flex gap-2">
          <button onClick={onClose} className="flex-1 px-4 py-2 glass border border-border rounded-xl font-semibold hover:bg-secondary transition-colors">İptal</button>
          <button onClick={handleCreate} disabled={creating} className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
            {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            {creating ? 'Oluşturuluyor...' : 'Oluştur'}
          </button>
        </div>
      </div>
    </div>
  )
}