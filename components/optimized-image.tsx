"use client"

import Image from 'next/image'
import { useState } from 'react'
import { Loader2 } from 'lucide-react'

interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  fill?: boolean
  className?: string
  priority?: boolean
  quality?: number
  sizes?: string
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down'
}

export default function OptimizedImage({
  src,
  alt,
  width,
  height,
  fill = false,
  className = '',
  priority = false,
  quality = 75,
  sizes,
  objectFit = 'cover'
}: OptimizedImageProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  // Default placeholder image
  const placeholderSrc = '/images/placeholder.png'

  // Handle image load error
  const handleError = () => {
    setError(true)
    setLoading(false)
  }

  // Handle image load success
  const handleLoad = () => {
    setLoading(false)
  }

  if (error) {
    return (
      <div className={`bg-muted flex items-center justify-center ${className}`}>
        <div className="text-center p-4">
          <p className="text-sm text-muted-foreground">Resim yüklenemedi</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted z-10">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {fill ? (
        <Image
          src={src || placeholderSrc}
          alt={alt}
          fill
          className={`transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'}`}
          style={{ objectFit }}
          quality={quality}
          priority={priority}
          sizes={sizes}
          onLoad={handleLoad}
          onError={handleError}
        />
      ) : (
        <Image
          src={src || placeholderSrc}
          alt={alt}
          width={width || 800}
          height={height || 600}
          className={`transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'}`}
          style={{ objectFit }}
          quality={quality}
          priority={priority}
          sizes={sizes}
          onLoad={handleLoad}
          onError={handleError}
        />
      )}
    </div>
  )
}
