"use client"

import { useState, useRef, useEffect } from 'react'
import { X, RotateCcw, ArrowRight, Play, Pause } from 'lucide-react'
import { motion } from 'framer-motion'

interface VideoPreviewProps {
  videoBlob: Blob
  duration: number
  onRetake: () => void
  onNext: (videoBlob: Blob) => void
}

export default function VideoPreview({ videoBlob, duration, onRetake, onNext }: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoUrl, setVideoUrl] = useState<string>('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const url = URL.createObjectURL(videoBlob)
    setVideoUrl(url)

    return () => {
      URL.revokeObjectURL(url)
    }
  }, [videoBlob])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)

    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)

    return () => {
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
    }
  }, [])

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="fixed inset-0 bg-black z-50">
      {/* Video player */}
      <div className="relative w-full h-full">
        {videoUrl ? (
          <video
            ref={videoRef}
            src={videoUrl}
            className="absolute inset-0 w-full h-full object-cover"
            loop
            playsInline
            preload="metadata"
            onLoadedData={() => setIsLoading(false)}
            onWaiting={() => setIsLoading(true)}
            onCanPlay={() => setIsLoading(false)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        )}

        {/* Loading spinner */}
        {isLoading && videoUrl && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        )}

        {/* Play/Pause overlay */}
        <button
          onClick={togglePlayPause}
          className="absolute inset-0 flex items-center justify-center tap-highlight-none"
        >
          {!isPlaying && !isLoading && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
            >
              <Play className="w-10 h-10 text-white ml-1" />
            </motion.div>
          )}
        </button>
      </div>

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent safe-area-top">
        <div className="flex items-center justify-between">
          <div className="text-white font-semibold">
            Duration: {formatDuration(duration)}
          </div>
        </div>
      </div>

      {/* Bottom controls */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent safe-area-bottom">
        <div className="flex items-center justify-between gap-3">
          {/* Retake */}
          <button
            onClick={onRetake}
            className="flex-1 h-14 rounded-full bg-white/20 backdrop-blur-sm text-white font-semibold flex items-center justify-center gap-2 tap-highlight-none active:scale-95 transition-transform"
          >
            <RotateCcw className="w-5 h-5" />
            <span>Retake</span>
          </button>

          {/* Next */}
          <button
            onClick={() => onNext(videoBlob)}
            className="flex-1 h-14 rounded-full bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 tap-highlight-none active:scale-95 transition-transform"
          >
            <span>Next</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
