'use client'

import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'

// Quality presets for video compression
const PRESETS = {
  low: { width: 480, bitrate: '500k', crf: '32' },     // ~3.75MB/min
  medium: { width: 720, bitrate: '1M', crf: '28' },    // ~7.5MB/min
  high: { width: 1080, bitrate: '2M', crf: '23' }      // ~15MB/min
}

interface VideoMetadata {
  duration: number
  width: number
  height: number
  size: number
}

export class VideoCompressor {
  private ffmpeg: FFmpeg | null = null
  private loading: boolean = false

  /**
   * Initialize FFmpeg.wasm
   * Loads FFmpeg core and wasm files from CDN
   */
  async init(): Promise<FFmpeg> {
    if (this.ffmpeg) return this.ffmpeg

    if (this.loading) {
      // Wait for existing init to complete
      while (this.loading) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      if (this.ffmpeg) return this.ffmpeg
    }

    this.loading = true

    try {
      const ffmpeg = new FFmpeg()

      // Load FFmpeg WASM files from CDN
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm'

      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm')
      })

      this.ffmpeg = ffmpeg
      return ffmpeg
    } finally {
      this.loading = false
    }
  }

  /**
   * Compress video file with specified quality
   * @param file - Input video file (WebM, MP4, etc.)
   * @param quality - Compression quality: 'low' | 'medium' | 'high'
   * @param onProgress - Optional progress callback (0-100)
   * @returns Compressed video blob (MP4)
   */
  async compressVideo(
    file: File,
    quality: 'low' | 'medium' | 'high' = 'medium',
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    const ffmpeg = await this.init()
    const preset = PRESETS[quality]

    // Determine input format from file
    const inputExt = file.name.split('.').pop()?.toLowerCase() || 'webm'
    const inputFile = `input.${inputExt}`

    try {
      // Write input file to FFmpeg virtual filesystem
      await ffmpeg.writeFile(inputFile, await fetchFile(file))

      // Setup progress monitoring
      if (onProgress) {
        ffmpeg.on('progress', ({ progress }) => {
          onProgress(Math.round(progress * 100))
        })
      }

      // Run compression with H.264 codec (maximum compatibility)
      await ffmpeg.exec([
        '-i', inputFile,
        '-c:v', 'libx264',              // H.264 codec for wide compatibility
        '-preset', 'fast',               // Encoding speed (ultrafast, fast, medium, slow)
        '-crf', preset.crf,              // Quality (0=lossless, 23=high, 28=medium, 32=low, 51=worst)
        '-vf', `scale=${preset.width}:-2`, // Scale to width, keep aspect ratio (must be divisible by 2)
        '-b:v', preset.bitrate,          // Target video bitrate
        '-maxrate', preset.bitrate,      // Max bitrate
        '-bufsize', '2M',                // Buffer size
        '-c:a', 'aac',                   // Audio codec
        '-b:a', '128k',                  // Audio bitrate
        '-pix_fmt', 'yuv420p',           // Pixel format (required for iOS compatibility)
        '-movflags', '+faststart',       // Enable progressive download (metadata at start)
        'output.mp4'
      ])

      // Read compressed file
      const data = await ffmpeg.readFile('output.mp4')

      // Cleanup virtual filesystem
      await ffmpeg.deleteFile(inputFile)
      await ffmpeg.deleteFile('output.mp4')

      return new Blob([(data as any).buffer || data], { type: 'video/mp4' })
    } catch (error) {
      // Cleanup on error
      try {
        await ffmpeg.deleteFile(inputFile).catch(() => {})
        await ffmpeg.deleteFile('output.mp4').catch(() => {})
      } catch {}
      throw error
    }
  }

  /**
   * Generate thumbnail from video at specified time
   * @param file - Input video file
   * @param timeSeconds - Time position to extract frame (default: 2s)
   * @returns Thumbnail blob (JPEG)
   */
  async generateThumbnail(file: File, timeSeconds: number = 2): Promise<Blob> {
    const ffmpeg = await this.init()

    // Determine input format from file
    const inputExt = file.name.split('.').pop()?.toLowerCase() || 'mp4'
    const inputFile = `input.${inputExt}`

    try {
      await ffmpeg.writeFile(inputFile, await fetchFile(file))

      // Extract single frame at specified time
      await ffmpeg.exec([
        '-i', inputFile,
        '-ss', String(timeSeconds),     // Seek to time (in seconds)
        '-vframes', '1',                 // Extract 1 frame only
        '-vf', 'scale=480:-2',           // Thumbnail size (480px width, maintain aspect)
        '-q:v', '2',                     // JPEG quality (2-5 is high quality)
        'thumbnail.jpg'
      ])

      const data = await ffmpeg.readFile('thumbnail.jpg')

      // Cleanup
      await ffmpeg.deleteFile(inputFile)
      await ffmpeg.deleteFile('thumbnail.jpg')

      return new Blob([(data as any).buffer || data], { type: 'image/jpeg' })
    } catch (error) {
      // Cleanup on error
      try {
        await ffmpeg.deleteFile(inputFile).catch(() => {})
        await ffmpeg.deleteFile('thumbnail.jpg').catch(() => {})
      } catch {}
      throw error
    }
  }

  /**
   * Get video metadata without processing
   * @param file - Input video file
   * @returns Video metadata (duration, width, height, size)
   */
  async getMetadata(file: File): Promise<VideoMetadata> {
    return new Promise<VideoMetadata>((resolve, reject) => {
      const video = document.createElement('video')
      video.preload = 'metadata'

      video.onloadedmetadata = () => {
        resolve({
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight,
          size: file.size
        })
        URL.revokeObjectURL(video.src)
      }

      video.onerror = () => {
        reject(new Error('Failed to load video metadata'))
        URL.revokeObjectURL(video.src)
      }

      video.src = URL.createObjectURL(file)
    })
  }

  /**
   * Validate video file before processing
   * @param file - Input file
   * @param maxSizeMB - Maximum file size in MB (default: 100MB)
   * @param maxDurationSeconds - Maximum duration in seconds (default: 60s)
   * @returns Validation result with error message if invalid
   */
  async validateVideo(
    file: File,
    maxSizeMB: number = 100,
    maxDurationSeconds: number = 60
  ): Promise<{ valid: boolean; error?: string }> {
    // Check file type
    if (!file.type.startsWith('video/')) {
      return { valid: false, error: 'File must be a video' }
    }

    // Check file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024
    if (file.size > maxSizeBytes) {
      return { valid: false, error: `File size must be less than ${maxSizeMB}MB` }
    }

    // Check duration
    try {
      const metadata = await this.getMetadata(file)
      if (metadata.duration > maxDurationSeconds) {
        return { valid: false, error: `Video must be less than ${maxDurationSeconds} seconds` }
      }
    } catch (error) {
      return { valid: false, error: 'Invalid video file' }
    }

    return { valid: true }
  }
}

// Singleton instance
export const videoCompressor = new VideoCompressor()
