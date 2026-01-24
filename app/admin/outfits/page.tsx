"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Shirt, Check, X, Eye, Search, Image as ImageIcon } from "lucide-react"
import { Input } from "@/components/ui/input"

interface Outfit {
  id: string
  name: string
  description: string
  season?: string
  occasion?: string
  style_tags?: string[]
  cover_image_url?: string
  moderation_status: 'pending' | 'approved' | 'rejected'
  moderation_notes?: string
  created_at: string
  seller: {
    id: string
    shop_name: string
    email: string
  }
}

export default function AdminOutfitsPage() {
  const [outfits, setOutfits] = useState<Outfit[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedOutfit, setSelectedOutfit] = useState<Outfit | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    fetchOutfits()
  }, [filter])

  const fetchOutfits = async () => {
    try {
      setLoading(true)
      const url = filter === 'all'
        ? '/api/admin/outfits'
        : `/api/admin/outfits?status=${filter}`

      const response = await fetch(url, {
        headers: {
          'x-user-id': 'm3000'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setOutfits(data.outfits || [])
      }
    } catch (error) {
      console.error('Failed to fetch outfits:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (outfitId: string, action: 'approve' | 'reject', notes?: string) => {
    try {
      setActionLoading(true)
      const response = await fetch('/api/admin/outfits', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'm3000'
        },
        body: JSON.stringify({
          outfitId,
          action,
          notes
        })
      })

      if (response.ok) {
        await fetchOutfits()
        setSelectedOutfit(null)
      }
    } catch (error) {
      console.error('Action failed:', error)
    } finally {
      setActionLoading(false)
    }
  }

  const filteredOutfits = outfits.filter(outfit =>
    outfit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    outfit.seller.shop_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    outfit.season?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-500 bg-green-500/10 border-green-500/20'
      case 'pending': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20'
      case 'rejected': return 'text-red-500 bg-red-500/10 border-red-500/20'
      default: return 'text-gray-500 bg-gray-500/10 border-gray-500/20'
    }
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <Shirt className="w-10 h-10 text-primary" />
            Kombin Moderasyonu
          </h1>
          <p className="text-muted-foreground">
            Satici kombinlerini onaylayın veya reddedin
          </p>
        </div>

        {/* Filters */}
        <div className="glass border border-border rounded-2xl p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Status Filter */}
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                  filter === 'all'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                Tumu ({outfits.length})
              </button>
              <button
                onClick={() => setFilter('pending')}
                className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                  filter === 'pending'
                    ? 'bg-yellow-500 text-white'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                Bekleyen
              </button>
              <button
                onClick={() => setFilter('approved')}
                className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                  filter === 'approved'
                    ? 'bg-green-500 text-white'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                Onaylanan
              </button>
              <button
                onClick={() => setFilter('rejected')}
                className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                  filter === 'rejected'
                    ? 'bg-red-500 text-white'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                Reddedilen
              </button>
            </div>

            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Kombin, magaza veya sezon ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        {/* Outfits Grid */}
        {loading ? (
          <div className="text-center py-12">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto"
            />
            <p className="text-muted-foreground mt-4">Yukleniyor...</p>
          </div>
        ) : filteredOutfits.length === 0 ? (
          <div className="text-center py-12 glass border border-border rounded-2xl">
            <Shirt className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Kombin bulunamadi</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOutfits.map((outfit) => (
              <motion.div
                key={outfit.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass border border-border rounded-2xl overflow-hidden hover:border-primary/50 transition-colors"
              >
                {/* Outfit Cover Image */}
                <div className="relative h-48 bg-secondary">
                  {outfit.cover_image_url ? (
                    <img
                      src={outfit.cover_image_url}
                      alt={outfit.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Shirt className="w-16 h-16 text-muted-foreground" />
                    </div>
                  )}

                  {/* Status Badge */}
                  <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(outfit.moderation_status)}`}>
                    {outfit.moderation_status === 'pending' && 'Bekleyen'}
                    {outfit.moderation_status === 'approved' && 'Onaylandi'}
                    {outfit.moderation_status === 'rejected' && 'Reddedildi'}
                  </div>
                </div>

                {/* Outfit Info */}
                <div className="p-4">
                  <h3 className="font-bold text-lg mb-1 truncate">{outfit.name}</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    {outfit.seller.shop_name}
                  </p>

                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {outfit.description}
                  </p>

                  <div className="flex gap-2 mb-3 flex-wrap">
                    {outfit.season && (
                      <span className="px-2 py-1 bg-secondary rounded-lg text-xs">
                        {outfit.season}
                      </span>
                    )}
                    {outfit.occasion && (
                      <span className="px-2 py-1 bg-secondary rounded-lg text-xs">
                        {outfit.occasion}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedOutfit(outfit)}
                      className="flex-1 px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      Detay
                    </button>
                    {outfit.moderation_status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleAction(outfit.id, 'approve')}
                          disabled={actionLoading}
                          className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleAction(outfit.id, 'reject', 'Uygunsuz icerik')}
                          disabled={actionLoading}
                          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Outfit Detail Modal */}
        {selectedOutfit && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass border border-border rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-bold">Kombin Detaylari</h2>
                <button
                  onClick={() => setSelectedOutfit(null)}
                  className="p-2 hover:bg-secondary rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Cover Image */}
              {selectedOutfit.cover_image_url && (
                <div className="mb-6">
                  <img
                    src={selectedOutfit.cover_image_url}
                    alt={selectedOutfit.name}
                    className="w-full h-64 object-cover rounded-xl"
                  />
                </div>
              )}

              {/* Outfit Details */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground">Kombin Adi</label>
                  <p className="font-semibold">{selectedOutfit.name}</p>
                </div>

                <div>
                  <label className="text-sm text-muted-foreground">Aciklama</label>
                  <p className="text-sm">{selectedOutfit.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground">Sezon</label>
                    <p className="font-semibold">{selectedOutfit.season || 'Belirtilmemis'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Durum</label>
                    <p className="font-semibold">{selectedOutfit.occasion || 'Belirtilmemis'}</p>
                  </div>
                </div>

                {selectedOutfit.style_tags && selectedOutfit.style_tags.length > 0 && (
                  <div>
                    <label className="text-sm text-muted-foreground">Stil Etiketleri</label>
                    <div className="flex gap-2 mt-2">
                      {selectedOutfit.style_tags.map((tag, index) => (
                        <span key={index} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-sm text-muted-foreground">Satici</label>
                  <p className="font-semibold">{selectedOutfit.seller.shop_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedOutfit.seller.email}</p>
                </div>

                <div>
                  <label className="text-sm text-muted-foreground">Moderasyon Durumu</label>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold border ${getStatusColor(selectedOutfit.moderation_status)}`}>
                    {selectedOutfit.moderation_status === 'pending' && 'Bekleyen'}
                    {selectedOutfit.moderation_status === 'approved' && 'Onaylandi'}
                    {selectedOutfit.moderation_status === 'rejected' && 'Reddedildi'}
                  </span>
                </div>

                {selectedOutfit.moderation_notes && (
                  <div>
                    <label className="text-sm text-muted-foreground">Moderasyon Notu</label>
                    <p className="text-sm">{selectedOutfit.moderation_notes}</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              {selectedOutfit.moderation_status === 'pending' && (
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => handleAction(selectedOutfit.id, 'approve')}
                    disabled={actionLoading}
                    className="flex-1 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Check className="w-5 h-5" />
                    Onayla
                  </button>
                  <button
                    onClick={() => handleAction(selectedOutfit.id, 'reject', 'Uygunsuz icerik')}
                    disabled={actionLoading}
                    className="flex-1 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <X className="w-5 h-5" />
                    Reddet
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </div>
    </div>
  )
}
