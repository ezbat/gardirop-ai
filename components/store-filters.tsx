"use client"

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SlidersHorizontal, X, ChevronDown } from 'lucide-react'

interface FilterOptions {
  minPrice: number
  maxPrice: number
  colors: string[]
  sizes: string[]
  brands: string[]
  sortBy: string
}

interface StoreFiltersProps {
  onFilterChange: (filters: FilterOptions) => void
  availableColors?: string[]
  availableSizes?: string[]
  availableBrands?: string[]
}

export default function StoreFilters({
  onFilterChange,
  availableColors = ['Siyah', 'Beyaz', 'Kırmızı', 'Mavi', 'Yeşil', 'Sarı', 'Gri', 'Kahverengi', 'Pembe', 'Mor'],
  availableSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '36', '37', '38', '39', '40', '41', '42', '43', '44'],
  availableBrands = []
}: StoreFiltersProps) {
  const [showFilters, setShowFilters] = useState(false)
  const [minPrice, setMinPrice] = useState(0)
  const [maxPrice, setMaxPrice] = useState(1000)
  const [selectedColors, setSelectedColors] = useState<string[]>([])
  const [selectedSizes, setSelectedSizes] = useState<string[]>([])
  const [selectedBrands, setSelectedBrands] = useState<string[]>([])
  const [sortBy, setSortBy] = useState('newest')

  const applyFilters = () => {
    onFilterChange({
      minPrice,
      maxPrice,
      colors: selectedColors,
      sizes: selectedSizes,
      brands: selectedBrands,
      sortBy
    })
    setShowFilters(false)
  }

  const resetFilters = () => {
    setMinPrice(0)
    setMaxPrice(1000)
    setSelectedColors([])
    setSelectedSizes([])
    setSelectedBrands([])
    setSortBy('newest')
    onFilterChange({
      minPrice: 0,
      maxPrice: 1000,
      colors: [],
      sizes: [],
      brands: [],
      sortBy: 'newest'
    })
  }

  const toggleColor = (color: string) => {
    setSelectedColors(prev =>
      prev.includes(color) ? prev.filter(c => c !== color) : [...prev, color]
    )
  }

  const toggleSize = (size: string) => {
    setSelectedSizes(prev =>
      prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]
    )
  }

  const toggleBrand = (brand: string) => {
    setSelectedBrands(prev =>
      prev.includes(brand) ? prev.filter(b => b !== brand) : [...prev, brand]
    )
  }

  const activeFilterCount = selectedColors.length + selectedSizes.length + selectedBrands.length +
    (minPrice > 0 || maxPrice < 1000 ? 1 : 0)

  return (
    <div className="relative">
      {/* Filter Button */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        className="flex items-center gap-2 px-4 py-2 glass border border-border rounded-xl hover:border-primary transition-colors"
      >
        <SlidersHorizontal className="w-5 h-5" />
        Filtrele
        {activeFilterCount > 0 && (
          <span className="px-2 py-0.5 bg-primary text-primary-foreground text-xs rounded-full">
            {activeFilterCount}
          </span>
        )}
      </button>

      {/* Filter Panel */}
      <AnimatePresence>
        {showFilters && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFilters(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            />

            {/* Filter Sidebar */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="fixed right-0 top-0 h-full w-full md:w-96 glass border-l border-border z-50 overflow-y-auto"
            >
              {/* Header */}
              <div className="sticky top-0 glass border-b border-border p-4 flex items-center justify-between">
                <h2 className="text-xl font-bold">Filtreler</h2>
                <button
                  onClick={() => setShowFilters(false)}
                  className="p-2 hover:bg-secondary rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-4 space-y-6">
                {/* Sort By */}
                <div>
                  <h3 className="font-bold mb-3">Sıralama</h3>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full px-4 py-3 glass border border-border rounded-xl focus:border-primary outline-none"
                  >
                    <option value="newest">En Yeni</option>
                    <option value="price-low">Fiyat: Düşükten Yükseğe</option>
                    <option value="price-high">Fiyat: Yüksekten Düşüğe</option>
                    <option value="popular">En Popüler</option>
                    <option value="rating">En Yüksek Puan</option>
                  </select>
                </div>

                {/* Price Range */}
                <div>
                  <h3 className="font-bold mb-3">Fiyat Aralığı</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        value={minPrice}
                        onChange={(e) => setMinPrice(parseInt(e.target.value) || 0)}
                        placeholder="Min"
                        className="flex-1 px-4 py-2 glass border border-border rounded-xl focus:border-primary outline-none"
                      />
                      <span>-</span>
                      <input
                        type="number"
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(parseInt(e.target.value) || 1000)}
                        placeholder="Max"
                        className="flex-1 px-4 py-2 glass border border-border rounded-xl focus:border-primary outline-none"
                      />
                    </div>
                    {/* Price Slider */}
                    <div className="space-y-2">
                      <input
                        type="range"
                        min="0"
                        max="1000"
                        step="10"
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(parseInt(e.target.value))}
                        className="w-full accent-primary"
                      />
                      <p className="text-sm text-muted-foreground text-center">
                        €{minPrice} - €{maxPrice}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Colors */}
                <div>
                  <h3 className="font-bold mb-3">Renk</h3>
                  <div className="flex flex-wrap gap-2">
                    {availableColors.map(color => (
                      <button
                        key={color}
                        onClick={() => toggleColor(color)}
                        className={`px-3 py-2 rounded-lg text-sm transition-all ${
                          selectedColors.includes(color)
                            ? 'bg-primary text-primary-foreground'
                            : 'glass border border-border hover:border-primary'
                        }`}
                      >
                        {color}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sizes */}
                <div>
                  <h3 className="font-bold mb-3">Beden</h3>
                  <div className="grid grid-cols-4 gap-2">
                    {availableSizes.map(size => (
                      <button
                        key={size}
                        onClick={() => toggleSize(size)}
                        className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                          selectedSizes.includes(size)
                            ? 'bg-primary text-primary-foreground'
                            : 'glass border border-border hover:border-primary'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Brands */}
                {availableBrands.length > 0 && (
                  <div>
                    <h3 className="font-bold mb-3">Marka</h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {availableBrands.map(brand => (
                        <label
                          key={brand}
                          className="flex items-center gap-3 p-2 glass rounded-lg cursor-pointer hover:bg-secondary/50"
                        >
                          <input
                            type="checkbox"
                            checked={selectedBrands.includes(brand)}
                            onChange={() => toggleBrand(brand)}
                            className="w-5 h-5 accent-primary"
                          />
                          <span>{brand}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="sticky bottom-0 glass border-t border-border p-4 space-y-3">
                <button
                  onClick={applyFilters}
                  className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity"
                >
                  Uygula
                </button>
                <button
                  onClick={resetFilters}
                  className="w-full px-6 py-3 glass border border-border rounded-xl font-semibold hover:border-primary transition-colors"
                >
                  Sıfırla
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
