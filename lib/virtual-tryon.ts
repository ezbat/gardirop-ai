const HF_API_URL = "https://api-inference.huggingface.co/models/yisol/IDM-VTON"
const HF_TOKEN = process.env.HUGGINGFACE_API_TOKEN || ""

const BASE_MODEL_URL = "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=512&h=768&fit=crop"

export async function generateVirtualTryOn(clothingImageUrl: string): Promise<string | null> {
  try {
    console.log('🎨 Hugging Face try-on başlatılıyor...')

    const clothingResponse = await fetch(clothingImageUrl)
    const clothingBlob = await clothingResponse.blob()

    const modelResponse = await fetch(BASE_MODEL_URL)
    const modelBlob = await modelResponse.blob()

    const formData = new FormData()
    formData.append('cloth', clothingBlob, 'cloth.jpg')
    formData.append('model', modelBlob, 'model.jpg')

    const response = await fetch(HF_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_TOKEN}`
      },
      body: formData
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('HF API error:', response.status, errorText)
      throw new Error(`HF API failed: ${response.status}`)
    }

    const resultBlob = await response.blob()
    const base64 = await blobToBase64(resultBlob)
    
    console.log('✅ Hugging Face try-on tamamlandı!')
    return `data:image/jpeg;base64,${base64}`
  } catch (error) {
    console.error('❌ Hugging Face try-on hatası:', error)
    return null
  }
}

export async function generateFullOutfitTryOn(clothingUrls: string[]): Promise<string | null> {
  if (clothingUrls.length === 0) return null

  try {
    const result = await generateVirtualTryOn(clothingUrls[0])
    return result
  } catch (error) {
    console.error('❌ Full outfit try-on hatası:', error)
    return null
  }
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = reader.result as string
      resolve(base64.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}