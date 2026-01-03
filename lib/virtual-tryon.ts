import Replicate from 'replicate'

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || '',
})

const BASE_MODEL_URL = 'https://replicate.delivery/pbxt/Jd6Gxt5pNhKGdwK3fYCYBpLLSRgTzPfJWnCGBjJCFMgUrJjQA/model.png'

export async function generateVirtualTryOn(clothingImageUrl: string): Promise<string | null> {
  try {
    console.log('🎨 Virtual try-on başlatılıyor...')

    const output = await replicate.run(
      "cuuupid/idm-vton:c871bb9b046607b680449ecbae55fd8c6d945e0a1948644bf2361b3d021d3ff4",
      {
        input: {
          human_img: BASE_MODEL_URL,
          garm_img: clothingImageUrl,
          garment_des: "clothing item"
        }
      }
    )

    // Output array veya string olabilir
    const imageUrl = Array.isArray(output) ? output[0] : output
    
    if (typeof imageUrl !== 'string') {
      console.error('Unexpected output type:', typeof imageUrl)
      return null
    }

    console.log('✅ Virtual try-on tamamlandı:', imageUrl)
    return imageUrl
  } catch (error) {
    console.error('❌ Virtual try-on hatası:', error)
    return null
  }
}

export async function generateFullOutfitTryOn(clothingUrls: string[]): Promise<string | null> {
  if (clothingUrls.length === 0) return null

  try {
    let currentModel = BASE_MODEL_URL

    for (let i = 0; i < Math.min(clothingUrls.length, 3); i++) {
      console.log(`🎨 Kıyafet ${i + 1}/${clothingUrls.length} ekleniyor...`)

      const output = await replicate.run(
        "cuuupid/idm-vton:c871bb9b046607b680449ecbae55fd8c6d945e0a1948644bf2361b3d021d3ff4",
        {
          input: {
            human_img: currentModel,
            garm_img: clothingUrls[i],
            garment_des: "clothing item"
          }
        }
      )

      const imageUrl = Array.isArray(output) ? output[0] : output
      
      if (typeof imageUrl !== 'string') {
        console.error('Unexpected output type:', typeof imageUrl)
        return null
      }

      currentModel = imageUrl
    }

    console.log('✅ Full outfit try-on tamamlandı!')
    return currentModel
  } catch (error) {
    console.error('❌ Full outfit try-on hatası:', error)
    return null
  }
}