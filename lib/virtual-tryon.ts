import * as fal from "@fal-ai/serverless-client"

fal.config({
  credentials: process.env.FAL_KEY || ""
})

interface FalResult {
  data: {
    image: {
      url: string
    }
  }
}

export async function generateVirtualTryOn(clothingImageUrl: string): Promise<string | null> {
  try {
    console.log('🎨 Fal.ai try-on başlatılıyor...')

    const result = await fal.subscribe("fal-ai/idm-vton", {
      input: {
        human_image_url: "https://storage.googleapis.com/falserverless/model_tests/idm-vton/model_1.png",
        garment_image_url: clothingImageUrl,
        description: "A person wearing the garment"
      }
    }) as FalResult

    console.log('✅ Fal.ai result:', result)
    return result.data.image.url
  } catch (error: any) {
    console.error('❌ Fal.ai try-on hatası:', error)
    console.error('❌ Error body:', JSON.stringify(error.body, null, 2))
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