"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Plus, Trash2, Upload, Image as ImageIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { Product } from "@/lib/storage"

interface ProductModalProps {
  product: Product | null
  onClose: () => void
  onSave: (product: Product) => void
}

export default function ProductModal({ product, onClose, onSave }: ProductModalProps) {
  const [name, setName] = useState("")
  const [brand, setBrand] = useState("Trigema")
  const [category, setCategory] = useState("Hoodie")
  const [description, setDescription] = useState("")
  const [price, setPrice] = useState("")
  const [discountPrice, setDiscountPrice] = useState("")
  const [colors, setColors] = useState<string[]>(["#000000"])
  const [sizes, setSizes] = useState<{ size: string; stock: number }[]>([
    { size: "XS", stock: 0 },
    { size: "S", stock: 0 },
    { size: "M", stock: 0 },
    { size: "L", stock: 0 },
    { size: "XL", stock: 0 },
  ])
  const [images, setImages] = useState<string[]>([])
  const [material, setMaterial] = useState("")
  const [careInstructions, setCareInstructions] = useState("")
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    if (product) {
      setName(product.name)
      setBrand(product.brand)
      setCategory(product.category)
      setDescription(product.description)
      setPrice(product.price.toString())
      setDiscountPrice(product.discountPrice?.toString() || "")
      setColors(product.colors)
      setSizes(product.sizes)
      setImages(product.images)
      setMaterial(product.material || "")
      setCareInstructions(product.careInstructions || "")
      setIsActive(product.isActive)
    }
  }, [product])

  const handleAddColor = () => {
    setColors([...colors, "#000000"])
  }

  const handleColorChange = (index: number, value: string) => {
    const newColors = [...colors]
    newColors[index] = value
    setColors(newColors)
  }

  const handleRemoveColor = (index: number) => {
    if (colors.length > 1) {
      setColors(colors.filter((_, i) => i !== index))
    }
  }

  const handleSizeStockChange = (index: number, stock: number) => {
    const newSizes = [...sizes]
    newSizes[index].stock = Math.max(0, stock)
    setSizes(newSizes)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    Array.from(files).forEach(file => {
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          setImages(prev => [...prev, event.target!.result as string])
        }
      }
      reader.readAsDataURL(file)
    })
  }

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const productData: Product = {
      id: product?.id || "",
      name,
      brand,
      category,
      description,
      price: parseFloat(price),
      discountPrice: discountPrice ? parseFloat(discountPrice) : undefined,
      colors,
      sizes,
      images,
      material: material || undefined,
      careInstructions: careInstructions || undefined,
      isActive,
      createdAt: product?.createdAt || Date.now()
    }

    onSave(productData)
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 overflow-y-auto"
      >
        <div className="min-h-screen flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-4xl glass border border-border rounded-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-border flex items-center justify-between bg-gradient-to-r from-primary/5 to-primary/10">
              <h2 className="text-2xl font-bold">
                {product ? "Urunu Duzenle" : "Yeni Urun Ekle"}
              </h2>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full hover:bg-secondary flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    📝
                  </div>
                  Temel Bilgiler
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Urun Adi *</label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Lost Bond Hoodie Black"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Marka *</label>
                    <Input
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      placeholder="Trigema"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Kategori *</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-4 py-2 glass border border-border rounded-xl outline-none focus:border-primary"
                      required
                    >
                      <option value="Hoodie">Hoodie</option>
                      <option value="T-shirt">T-shirt</option>
                      <option value="Pants">Pants</option>
                      <option value="Dress">Dress</option>
                      <option value="Jacket">Jacket</option>
                      <option value="Shoes">Shoes</option>
                      <option value="Sweater">Sweater</option>
                      <option value="Accessories">Accessories</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Malzeme</label>
                    <Input
                      value={material}
                      onChange={(e) => setMaterial(e.target.value)}
                      placeholder="80% Pamuk, 20% Polyester"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Aciklama *</label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Urun hakkinda detayli bilgi..."
                    required
                    rows={3}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Bakim Talimatlari</label>
                  <Textarea
                    value={careInstructions}
                    onChange={(e) => setCareInstructions(e.target.value)}
                    placeholder="30 derecede yika, agartici kullanma..."
                    rows={2}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                    💰
                  </div>
                  Fiyat
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Normal Fiyat (€) *</label>
                    <Input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="79.99"
                      required
                      step="0.01"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Indirimli Fiyat (€)</label>
                    <Input
                      type="number"
                      value={discountPrice}
                      onChange={(e) => setDiscountPrice(e.target.value)}
                      placeholder="59.99"
                      step="0.01"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {discountPrice && price && `%${Math.round((1 - parseFloat(discountPrice) / parseFloat(price)) * 100)} indirim`}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      🎨
                    </div>
                    Renkler
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddColor}
                    className="px-3 py-1 glass border border-border rounded-lg hover:border-primary transition-colors text-sm flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Renk Ekle
                  </button>
                </div>

                <div className="flex flex-wrap gap-4">
                  {colors.map((color, index) => (
                    <div key={index} className="flex items-center gap-2 glass border border-border rounded-xl p-2">
                      <input
                        type="color"
                        value={color}
                        onChange={(e) => handleColorChange(index, e.target.value)}
                        className="w-12 h-12 rounded-lg border-2 border-border cursor-pointer"
                      />
                      <Input
                        value={color}
                        onChange={(e) => handleColorChange(index, e.target.value)}
                        className="w-24"
                        placeholder="#000000"
                      />
                      {colors.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveColor(index)}
                          className="p-2 hover:bg-red-500/10 text-red-500 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    📏
                  </div>
                  Bedenler ve Stok
                </h3>
                
                <div className="grid grid-cols-5 gap-4">
                  {sizes.map((size, index) => (
                    <div key={index} className="glass border border-border rounded-xl p-4 space-y-2">
                      <label className="text-sm font-medium block text-center">{size.size}</label>
                      <Input
                        type="number"
                        value={size.stock}
                        onChange={(e) => handleSizeStockChange(index, parseInt(e.target.value) || 0)}
                        placeholder="0"
                        min="0"
                        className="text-center"
                      />
                      <p className={`text-xs text-center font-semibold ${
                        size.stock > 0 ? "text-green-500" : "text-red-500"
                      }`}>
                        {size.stock > 0 ? `✓ ${size.stock} adet` : "✗ Stokta yok"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center">
                      🖼️
                    </div>
                    Urun Gorselleri
                  </h3>
                  <label className="px-3 py-1 glass border border-border rounded-lg hover:border-primary transition-colors text-sm flex items-center gap-2 cursor-pointer">
                    <Upload className="w-4 h-4" />
                    Gorsel Yukle
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  {images.map((image, index) => (
                    <div key={index} className="relative aspect-square glass border border-border rounded-lg overflow-hidden group">
                      <img src={image} alt={`Product ${index + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {index === 0 && (
                        <div className="absolute bottom-2 left-2 px-2 py-1 bg-primary text-primary-foreground text-xs rounded-lg font-semibold">
                          Ana Gorsel
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {images.length === 0 && (
                    <div className="col-span-4 aspect-video glass border-2 border-dashed border-border rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <ImageIcon className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mb-1">Henuz gorsel eklenmedi</p>
                        <p className="text-xs text-muted-foreground">Yukle butonunu kullanin</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="glass border border-border rounded-xl p-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-5 h-5 rounded accent-primary"
                  />
                  <div>
                    <p className="font-semibold">Urun Aktif</p>
                    <p className="text-sm text-muted-foreground">
                      Aktif urunler magazada gorunur ve satin alinabilir
                    </p>
                  </div>
                </label>
              </div>
            </form>

            <div className="p-6 border-t border-border flex justify-end gap-3 bg-gradient-to-r from-primary/5 to-primary/10">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 glass border border-border rounded-xl hover:border-primary transition-colors font-semibold"
              >
                Iptal
              </button>
              <button
                onClick={handleSubmit}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center gap-2"
              >
                {product ? "Guncelle" : "Ekle"}
              </button>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}