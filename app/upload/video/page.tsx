"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Camera, Upload, X, Loader2, ShoppingBag, Plus, Check, Tag } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import VideoRecorder from '@/components/video-recorder'
import VideoPreview from '@/components/video-preview'
import { supabase } from '@/lib/supabase'

type Step = 'select' | 'record' | 'preview' | 'caption' | 'products' | 'uploading'

interface Product {
  id: string
  title: string
  price: number
  images: string[]
}

interface SellerInfo {
  id: string
  status: string
  products: Product[]
}

// Simple thumbnail generation using canvas (no FFmpeg needed)
async function generateSimpleThumbnail(videoBlob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.src = URL.createObjectURL(videoBlob)
    video.crossOrigin = 'anonymous'

    video.onloadeddata = () => {
      video.currentTime = 2 // Seek to 2 seconds
    }

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas')
        const aspectRatio = video.videoHeight / video.videoWidth
        canvas.width = 480
        canvas.height = Math.floor(480 * aspectRatio)

        const ctx = canvas.getContext('2d')!
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to create thumbnail'))
          }
          URL.revokeObjectURL(video.src)
        }, 'image/jpeg', 0.8)
      } catch (error) {
        URL.revokeObjectURL(video.src)
        reject(error)
      }
    }

    video.onerror = () => {
      URL.revokeObjectURL(video.src)
      reject(new Error('Failed to load video'))
    }
  })
}

export default function VideoUploadPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [step, setStep] = useState<Step>('select')
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null)
  const [videoDuration, setVideoDuration] = useState(0)
  const [caption, setCaption] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)

  // Seller & Product states
  const [isSeller, setIsSeller] = useState(false)
  const [sellerProducts, setSellerProducts] = useState<Product[]>([])
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [isLoadingProducts, setIsLoadingProducts] = useState(true)

  if (!session) {
    router.push('/auth/signin')
    return null
  }

  // Check if user is seller and load their products
  useEffect(() => {
    const checkSellerStatus = async () => {
      if (!session?.user?.id) return

      try {
        // Check seller status
        const { data: sellerData } = await supabase
          .from('sellers')
          .select('id, status')
          .eq('user_id', session.user.id)
          .eq('status', 'approved')
          .single()

        if (sellerData) {
          setIsSeller(true)

          // Load seller's products
          const { data: products } = await supabase
            .from('products')
            .select('id, title, price, images')
            .eq('seller_id', sellerData.id)
            .order('created_at', { ascending: false })

          setSellerProducts(products || [])
        }
      } catch (error) {
        console.error('Error checking seller status:', error)
      } finally {
        setIsLoadingProducts(false)
      }
    }

    checkSellerStatus()
  }, [session])

  const handleRecordingComplete = (blob: Blob, duration: number) => {
    setVideoBlob(blob)
    setVideoDuration(duration)
    setStep('preview')
  }

  const handleGallerySelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Get video duration
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.onloadedmetadata = () => {
        setVideoDuration(Math.floor(video.duration))
        URL.revokeObjectURL(video.src)
      }
      video.src = URL.createObjectURL(file)

      setVideoBlob(file)
      setStep('preview')
    }
  }

  const handlePreviewNext = (blob: Blob) => {
    setVideoBlob(blob)
    setStep('caption')
  }

  const handleUpload = async () => {
    if (!videoBlob || !session?.user?.id) return

    // File size validation (max 100MB)
    const maxSize = 100 * 1024 * 1024 // 100MB
    if (videoBlob.size > maxSize) {
      alert(`Video file is too large (${(videoBlob.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 100MB.`)
      return
    }

    setStep('uploading')
    setIsUploading(true)
    setUploadProgress(0)

    try {
      // Step 1: Generate thumbnail using canvas (0-20%)
      setUploadProgress(10)
      const thumbnailBlob = await generateSimpleThumbnail(videoBlob)
      setUploadProgress(20)

      // Step 2: Create FormData for API upload (20-30%)
      const formData = new FormData()
      const videoExtension = videoBlob.type === 'video/mp4' ? 'mp4' : 'webm'
      formData.append('video', videoBlob, `video.${videoExtension}`)
      formData.append('thumbnail', thumbnailBlob, 'thumbnail.jpg')
      formData.append('caption', caption || 'New video')
      formData.append('duration', videoDuration.toString())

      // Add selected products if seller
      if (selectedProducts.length > 0) {
        formData.append('product_ids', JSON.stringify(selectedProducts))
      }

      setUploadProgress(30)

      // Step 3: Upload via API route (30-90%)
      const response = await fetch('/api/upload-video', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Upload failed')
      }

      setUploadProgress(90)

      const result = await response.json()
      setUploadProgress(100)

      // Success - redirect to explore
      setTimeout(() => {
        router.push('/explore')
      }, 500)

    } catch (error: any) {
      console.error('Upload error:', error)
      alert(`Upload failed: ${error.message || 'Please try again.'}`)
      setIsUploading(false)
      setStep('caption')
    }
  }

  return (
    <div className="fixed inset-0 bg-black z-50">
      {/* Step 1: Source Selection - TikTok Style */}
      {step === 'select' && (
        <div className="h-full flex flex-col bg-black">
          {/* Header */}
          <div className="flex items-center justify-between p-4 safe-area-top">
            <button
              onClick={() => router.back()}
              className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center tap-highlight-none active:scale-90 transition-transform"
            >
              <X className="w-5 h-5 text-white" />
            </button>
            <h1 className="text-lg font-semibold text-white">Create</h1>
            <div className="w-10" /> {/* Spacer */}
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col items-center justify-center px-6 pb-safe">
            {/* Icon Animation */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", duration: 0.8 }}
              className="mb-8"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full blur-2xl opacity-50" />
                <div className="relative text-7xl">🎬</div>
              </div>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-2xl font-bold text-white mb-3 text-center"
            >
              Share Your Style
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-white/60 text-center mb-12 max-w-xs"
            >
              Record or upload a video to showcase products
            </motion.p>

            {/* Action Buttons - Full Width */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="w-full space-y-3 max-w-sm"
            >
              {/* Camera Button - Primary */}
              <button
                onClick={() => setStep('record')}
                className="group w-full h-16 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 flex items-center justify-center gap-3 tap-highlight-none active:scale-95 transition-all shadow-lg shadow-purple-500/30"
              >
                <Camera className="w-6 h-6 text-white group-active:scale-90 transition-transform" />
                <span className="text-white font-semibold text-lg">Camera</span>
              </button>

              {/* Gallery Button - Secondary */}
              <label className="block">
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleGallerySelect}
                  className="hidden"
                />
                <div className="group w-full h-16 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center gap-3 tap-highlight-none active:scale-95 transition-all cursor-pointer">
                  <Upload className="w-6 h-6 text-white group-active:scale-90 transition-transform" />
                  <span className="text-white font-semibold text-lg">Gallery</span>
                </div>
              </label>
            </motion.div>

            {/* Info Footer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-auto mb-8 flex items-center gap-2 text-white/40 text-sm"
            >
              <div className="flex items-center gap-1">
                <div className="w-1 h-1 rounded-full bg-white/40" />
                <span>Max 60s</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-white/40" />
              <div className="flex items-center gap-1">
                <div className="w-1 h-1 rounded-full bg-white/40" />
                <span>MP4, WebM</span>
              </div>
            </motion.div>
          </div>
        </div>
      )}

      {/* Step 2: Recording */}
      {step === 'record' && (
        <VideoRecorder
          onRecordingComplete={handleRecordingComplete}
          onCancel={() => setStep('select')}
        />
      )}

      {/* Step 3: Preview */}
      {step === 'preview' && videoBlob && (
        <VideoPreview
          videoBlob={videoBlob}
          duration={videoDuration}
          onRetake={() => setStep('select')}
          onNext={handlePreviewNext}
        />
      )}

      {/* Step 4: Caption - Instagram/TikTok Style */}
      {step === 'caption' && (
        <div className="h-full flex flex-col bg-black">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10 safe-area-top">
            <button
              onClick={() => setStep('preview')}
              className="text-white tap-highlight-none active:scale-90 transition-transform"
            >
              <X className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-semibold text-white">New Post</h1>
            <button
              onClick={() => {
                // If seller with products, go to product selection
                if (isSeller && sellerProducts.length > 0) {
                  setStep('products')
                } else {
                  handleUpload()
                }
              }}
              disabled={isUploading}
              className="px-4 py-1.5 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold text-sm tap-highlight-none active:scale-95 transition-transform disabled:opacity-50"
            >
              {isSeller && sellerProducts.length > 0 ? 'Next' : 'Post'}
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-4 py-6">
            {/* Video Thumbnail Preview */}
            {videoBlob && (
              <div className="flex items-start gap-3 mb-6">
                <div className="w-20 h-28 rounded-xl bg-white/5 overflow-hidden flex-shrink-0">
                  <video
                    src={URL.createObjectURL(videoBlob)}
                    className="w-full h-full object-cover"
                    muted
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Add a caption..."
                    className="w-full h-28 bg-transparent text-white placeholder:text-white/40 resize-none focus:outline-none text-base"
                    maxLength={500}
                    autoFocus
                  />
                  <p className="text-xs text-white/40 mt-1">
                    {caption.length}/500
                  </p>
                </div>
              </div>
            )}

            {/* Divider */}
            <div className="h-px bg-white/10 mb-6" />

            {/* Quick Tags */}
            <div className="mb-6">
              <p className="text-sm text-white/60 mb-3">Quick tags</p>
              <div className="flex flex-wrap gap-2">
                {['#fashion', '#style', '#ootd', '#outfit', '#shopping', '#trend', '#new'].map(tag => (
                  <motion.button
                    key={tag}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setCaption(prev => prev ? `${prev} ${tag}` : tag)}
                    className="px-4 py-2 bg-white/10 hover:bg-white/15 rounded-full text-white/80 text-sm tap-highlight-none transition-colors border border-white/10"
                  >
                    {tag}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Video Info */}
            {videoBlob && (
              <div className="space-y-3">
                <div className="flex items-center justify-between py-3 border-b border-white/5">
                  <span className="text-white/60 text-sm">Duration</span>
                  <span className="text-white text-sm font-medium">{videoDuration}s</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-white/5">
                  <span className="text-white/60 text-sm">Size</span>
                  <span className="text-white text-sm font-medium">
                    {(videoBlob.size / 1024 / 1024).toFixed(1)} MB
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Padding */}
          <div className="safe-area-bottom" />
        </div>
      )}

      {/* Step 5: Product Selection - Only for Sellers */}
      {step === 'products' && isSeller && (
        <div className="h-full flex flex-col bg-black">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10 safe-area-top">
            <button
              onClick={() => setStep('caption')}
              className="text-white tap-highlight-none active:scale-90 transition-transform"
            >
              <X className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-semibold text-white">Tag Products</h1>
            <button
              onClick={handleUpload}
              disabled={isUploading}
              className="px-4 py-1.5 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold text-sm tap-highlight-none active:scale-95 transition-transform disabled:opacity-50"
            >
              Post
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Info Banner */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-2xl"
            >
              <div className="flex items-start gap-3">
                <Tag className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white font-medium text-sm mb-1">
                    Tag your products in this video
                  </p>
                  <p className="text-white/60 text-xs leading-relaxed">
                    Select products to feature. Viewers can tap to buy directly from the video!
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Selected Products Count */}
            {selectedProducts.length > 0 && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="mb-4 flex items-center justify-between p-3 bg-white/5 rounded-xl"
              >
                <span className="text-white/80 text-sm">
                  {selectedProducts.length} {selectedProducts.length === 1 ? 'product' : 'products'} selected
                </span>
                {selectedProducts.length > 0 && (
                  <button
                    onClick={() => setSelectedProducts([])}
                    className="text-xs text-pink-400 font-medium tap-highlight-none"
                  >
                    Clear all
                  </button>
                )}
              </motion.div>
            )}

            {/* Product Grid */}
            {isLoadingProducts ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-white/40 animate-spin" />
              </div>
            ) : sellerProducts.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingBag className="w-16 h-16 text-white/20 mx-auto mb-4" />
                <p className="text-white/60 text-sm mb-2">No products yet</p>
                <button
                  onClick={() => router.push('/seller/products')}
                  className="text-sm text-purple-400 font-medium tap-highlight-none"
                >
                  Create your first product →
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {sellerProducts.map((product) => {
                  const isSelected = selectedProducts.includes(product.id)

                  return (
                    <motion.button
                      key={product.id}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedProducts(prev => prev.filter(id => id !== product.id))
                        } else {
                          setSelectedProducts(prev => [...prev, product.id])
                        }
                      }}
                      whileTap={{ scale: 0.95 }}
                      className="relative group tap-highlight-none"
                    >
                      {/* Product Card */}
                      <div className={`relative rounded-2xl overflow-hidden transition-all ${
                        isSelected
                          ? 'ring-2 ring-purple-500 shadow-lg shadow-purple-500/20'
                          : 'ring-1 ring-white/10'
                      }`}>
                        {/* Product Image */}
                        <div className="aspect-[3/4] bg-white/5">
                          {product.images && product.images.length > 0 && (
                            <img
                              src={product.images[0]}
                              alt={product.title}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>

                        {/* Product Info */}
                        <div className="p-3 bg-black/80 backdrop-blur-sm">
                          <p className="text-white text-sm font-medium line-clamp-1 mb-1">
                            {product.title}
                          </p>
                          <p className="text-purple-400 text-sm font-semibold">
                            €{product.price}
                          </p>
                        </div>

                        {/* Selection Indicator */}
                        <AnimatePresence>
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              exit={{ scale: 0 }}
                              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center shadow-lg"
                            >
                              <Check className="w-4 h-4 text-white" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Bottom CTA */}
          {selectedProducts.length > 0 && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="p-4 bg-gradient-to-t from-black via-black to-transparent safe-area-bottom"
            >
              <button
                onClick={handleUpload}
                disabled={isUploading}
                className="w-full h-14 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold flex items-center justify-center gap-2 tap-highlight-none active:scale-95 transition-transform disabled:opacity-50 shadow-lg shadow-purple-500/30"
              >
                <ShoppingBag className="w-5 h-5" />
                <span>Post with {selectedProducts.length} {selectedProducts.length === 1 ? 'Product' : 'Products'}</span>
              </button>
            </motion.div>
          )}
        </div>
      )}

      {/* Step 6: Uploading - Modern Minimal */}
      {step === 'uploading' && (
        <div className="h-full flex items-center justify-center bg-black p-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm"
          >
            {/* Animated Circle Progress */}
            <div className="relative w-32 h-32 mx-auto mb-8">
              {/* Background Circle */}
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="8"
                  fill="none"
                />
                <motion.circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="url(#gradient)"
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: uploadProgress / 100 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  strokeDasharray="351.86"
                  strokeDashoffset={351.86 * (1 - uploadProgress / 100)}
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ec4899" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Percentage Text */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl font-bold text-white">
                  {uploadProgress}%
                </span>
              </div>
            </div>

            {/* Status Text with Animation */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center mb-8"
            >
              <motion.p
                key={uploadProgress}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xl font-semibold text-white mb-2"
              >
                {uploadProgress < 100 ? 'Uploading...' : '✨ Upload Complete!'}
              </motion.p>
              <motion.p
                key={`status-${uploadProgress}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-white/50 text-sm"
              >
                {uploadProgress < 20 && '📸 Generating thumbnail from video'}
                {uploadProgress >= 20 && uploadProgress < 30 && '📦 Preparing files for upload'}
                {uploadProgress >= 30 && uploadProgress < 70 && '🎬 Uploading video to cloud'}
                {uploadProgress >= 70 && uploadProgress < 85 && '🖼️ Uploading thumbnail'}
                {uploadProgress >= 85 && uploadProgress < 95 && selectedProducts.length > 0 ? '🏷️ Tagging products' : '📝 Creating post'}
                {uploadProgress >= 95 && uploadProgress < 100 && '✅ Finalizing'}
                {uploadProgress === 100 && '🚀 Redirecting to your video...'}
              </motion.p>
            </motion.div>

            {/* Upload Details */}
            {videoBlob && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-2"
              >
                {/* Video Size */}
                <div className="flex items-center justify-between py-3 px-4 bg-white/5 rounded-xl border border-white/5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                      <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span className="text-white/70 text-sm">File Size</span>
                  </div>
                  <span className="text-white text-sm font-semibold">
                    {(videoBlob.size / 1024 / 1024).toFixed(1)} MB
                  </span>
                </div>

                {/* Duration */}
                <div className="flex items-center justify-between py-3 px-4 bg-white/5 rounded-xl border border-white/5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center">
                      <svg className="w-4 h-4 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <span className="text-white/70 text-sm">Duration</span>
                  </div>
                  <span className="text-white text-sm font-semibold">
                    {videoDuration}s
                  </span>
                </div>

                {/* Caption Preview */}
                {caption && (
                  <div className="py-3 px-4 bg-white/5 rounded-xl border border-white/5">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                        <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                        </svg>
                      </div>
                      <span className="text-white/70 text-sm">Caption</span>
                    </div>
                    <p className="text-white text-xs leading-relaxed line-clamp-2 ml-10">
                      {caption}
                    </p>
                  </div>
                )}

                {/* Products Tagged */}
                {selectedProducts.length > 0 && (
                  <div className="flex items-center justify-between py-3 px-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-500/20">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/30 flex items-center justify-center">
                        <ShoppingBag className="w-4 h-4 text-purple-300" />
                      </div>
                      <span className="text-white/70 text-sm">Products</span>
                    </div>
                    <span className="text-purple-300 text-sm font-semibold">
                      {selectedProducts.length} tagged
                    </span>
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  )
}
