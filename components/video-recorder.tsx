"use client"

import { useState, useRef, useEffect } from 'react'
import { Camera, Square, RotateCw, X } from 'lucide-react'
import { motion } from 'framer-motion'

interface VideoRecorderProps {
  onRecordingComplete: (blob: Blob, duration: number) => void
  onCancel: () => void
}

export default function VideoRecorder({ onRecordingComplete, onCancel }: VideoRecorderProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')
  const [error, setError] = useState<string | null>(null)

  const MAX_DURATION = 60 // seconds

  // Initialize camera
  useEffect(() => {
    startCamera()
    return () => {
      stopCamera()
    }
  }, [facingMode])

  // Recording timer
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1
          if (newTime >= MAX_DURATION) {
            stopRecording()
          }
          return newTime
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isRecording])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1080 },
          height: { ideal: 1920 },
          frameRate: { ideal: 30 }
        },
        audio: true
      })

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setError(null)
    } catch (err) {
      console.error('Camera error:', err)
      setError('Camera permission denied. Please allow camera access.')
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }

  const startRecording = () => {
    if (!streamRef.current) return

    chunksRef.current = []

    const options: MediaRecorderOptions = {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: 2500000 // 2.5 Mbps
    }

    // Fallback for Safari
    if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
      options.mimeType = 'video/webm'
    }

    const mediaRecorder = new MediaRecorder(streamRef.current, options)
    mediaRecorderRef.current = mediaRecorder

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data)
      }
    }

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' })
      onRecordingComplete(blob, recordingTime)
    }

    mediaRecorder.start()
    setIsRecording(true)
    setRecordingTime(0)
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user')
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center p-8 z-50">
        <div className="text-center text-white space-y-4">
          <div className="text-6xl mb-4">📹</div>
          <p className="text-xl font-semibold">Camera Access Required</p>
          <p className="text-white/60">{error}</p>
          <button
            onClick={onCancel}
            className="mt-8 px-6 py-3 bg-white/20 backdrop-blur-sm rounded-full tap-highlight-none"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black z-50">
      {/* Video preview */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Close button */}
      <button
        onClick={onCancel}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center tap-highlight-none safe-area-top"
      >
        <X className="w-5 h-5 text-white" />
      </button>

      {/* Recording timer */}
      {isRecording && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-4 left-4 z-10 flex items-center gap-2 px-4 py-2 bg-red-500/90 backdrop-blur-sm rounded-full safe-area-top"
        >
          <div className="w-3 h-3 rounded-full bg-white animate-pulse" />
          <span className="text-white font-mono font-semibold">
            {formatTime(recordingTime)} / {formatTime(MAX_DURATION)}
          </span>
        </motion.div>
      )}

      {/* Bottom controls */}
      <div className="absolute bottom-0 left-0 right-0 p-8 pb-12 bg-gradient-to-t from-black/80 to-transparent safe-area-bottom">
        <div className="flex items-center justify-between max-w-md mx-auto">
          {/* Flip camera */}
          <button
            onClick={toggleCamera}
            disabled={isRecording}
            className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center tap-highlight-none active:scale-95 transition-transform disabled:opacity-50"
          >
            <RotateCw className="w-6 h-6 text-white" />
          </button>

          {/* Record button */}
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className="relative tap-highlight-none active:scale-95 transition-transform"
          >
            <div className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center">
              {isRecording ? (
                <Square className="w-8 h-8 text-white fill-white" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-red-500" />
              )}
            </div>
          </button>

          {/* Spacer for alignment */}
          <div className="w-14 h-14" />
        </div>
      </div>
    </div>
  )
}
