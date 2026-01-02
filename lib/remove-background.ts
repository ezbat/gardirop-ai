import { supabase } from './supabase'

// ============================================================================
// ARKA PLAN SİLME - REMOVE.BG API (DIREKT FETCH)
// ============================================================================

export async function removeBackgroundWithAPI(
  file: File
): Promise<Blob> {
  const formData = new FormData()
  formData.append('image_file', file)
  formData.append('size', 'auto')
  formData.append('format', 'png')

  const response = await fetch('https://api.remove.bg/v1.0/removebg', {
    method: 'POST',
    headers: {
      'X-Api-Key': process.env.NEXT_PUBLIC_REMOVEBG_API_KEY || '',
    },
    body: formData,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Remove.bg API error: ${response.status} - ${error}`)
  }

  return await response.blob()
}

// ============================================================================
// CANVAS API (ÜCRETSIZ, BASIT ARKA PLAN SİLME)
// ============================================================================

export async function removeBackgroundWithCanvas(
  file: File
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const reader = new FileReader()

    reader.onload = (e) => {
      img.src = e.target?.result as string
    }

    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        reject(new Error('Canvas context not available'))
        return
      }
      
      canvas.width = img.width
      canvas.height = img.height
      
      ctx.drawImage(img, 0, 0)
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data
      
      const threshold = 100
      
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        
        // Beyaz arka plan
        if (r > 200 && g > 200 && b > 200) {
          data[i + 3] = 0
        }
        // Yeşil arka plan
        else if (g > r + threshold && g > b + threshold) {
          data[i + 3] = 0
        }
        // Mavi arka plan
        else if (b > r + threshold && b > g + threshold) {
          data[i + 3] = 0
        }
      }
      
      ctx.putImageData(imageData, 0, 0)
      
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Canvas blob creation failed'))
        }
      }, 'image/png')
    }

    img.onerror = () => reject(new Error('Image load failed'))
    reader.readAsDataURL(file)
  })
}

// ============================================================================
// ANA FONKSİYON
// ============================================================================

export async function processImage(
  file: File,
  useAPI: boolean = false
): Promise<Blob> {
  if (useAPI && process.env.NEXT_PUBLIC_REMOVEBG_API_KEY) {
    try {
      return await removeBackgroundWithAPI(file)
    } catch (error) {
      console.warn('API failed, using canvas fallback:', error)
      return await removeBackgroundWithCanvas(file)
    }
  }
  
  return await removeBackgroundWithCanvas(file)
}

// ============================================================================
// SUPABASE STORAGE'A YÜKLEME
// ============================================================================

export async function uploadClothingImage(
  userId: string,
  file: File,
  shouldRemoveBackground: boolean = true
): Promise<{
  originalUrl: string
  processedUrl: string
  publicUrl: string
}> {
  const fileExt = file.name.split('.').pop() || 'jpg'
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}`
  
  // 1. Orijinal dosyayı yükle
  const originalPath = `${userId}/original/${fileName}.${fileExt}`
  const { data: originalData, error: originalError } = await supabase.storage
    .from('clothes-images')
    .upload(originalPath, file)

  if (originalError) {
    console.error('Original upload error:', originalError)
    throw originalError
  }

  // 2. Arka planı silinmiş versiyonu yükle
  let processedPath = originalPath
  
  if (shouldRemoveBackground) {
    try {
      const processedBlob = await processImage(file, false) // Canvas kullan (ücretsiz)
      processedPath = `${userId}/processed/${fileName}.png`
      
      const { error: processedError } = await supabase.storage
        .from('clothes-images')
        .upload(processedPath, processedBlob, {
          contentType: 'image/png'
        })

      if (processedError) {
        console.error('Processed upload error:', processedError)
        throw processedError
      }
    } catch (error) {
      console.error('Background removal failed, using original:', error)
      processedPath = originalPath
    }
  }

  // 3. Public URL'leri al
  const { data: originalUrlData } = supabase.storage
    .from('clothes-images')
    .getPublicUrl(originalPath)

  const { data: processedUrlData } = supabase.storage
    .from('clothes-images')
    .getPublicUrl(processedPath)

  return {
    originalUrl: originalUrlData.publicUrl,
    processedUrl: processedUrlData.publicUrl,
    publicUrl: processedUrlData.publicUrl
  }
}

// ============================================================================
// RENK PALETİ ÇIKARMA
// ============================================================================

export async function extractColorPalette(imageUrl: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'Anonymous'
    
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        reject(new Error('Canvas context not available'))
        return
      }
      
      const maxSize = 200
      const scale = Math.min(maxSize / img.width, maxSize / img.height)
      canvas.width = img.width * scale
      canvas.height = img.height * scale
      
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data
      
      const colorMap = new Map<string, number>()
      
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        const a = data[i + 3]
        
        if (a < 128) continue
        
        const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
        
        colorMap.set(hex, (colorMap.get(hex) || 0) + 1)
      }
      
      const sortedColors = Array.from(colorMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([color]) => color)
      
      resolve(sortedColors)
    }
    
    img.onerror = () => reject(new Error('Image load failed'))
    img.src = imageUrl
  })
}