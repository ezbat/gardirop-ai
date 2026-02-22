'use client'

export interface CompressionResult {
  blob: Blob
  originalSize: number
  compressedSize: number
  compressionRatio: number
  duration: number
}

export async function compressVideo(
  file: File,
  _quality: string = 'medium'
): Promise<CompressionResult> {
  // Passthrough - return original file without compression
  // Install @ffmpeg/ffmpeg and @ffmpeg/util for actual compression
  return {
    blob: file,
    originalSize: file.size,
    compressedSize: file.size,
    compressionRatio: 1,
    duration: 0
  }
}

export function getCompressionPresets() {
  return {
    low: { label: 'Niedrig', maxSize: '50MB', bitrate: '500k' },
    medium: { label: 'Mittel', maxSize: '25MB', bitrate: '1000k' },
    high: { label: 'Hoch', maxSize: '10MB', bitrate: '2000k' },
  }
}
