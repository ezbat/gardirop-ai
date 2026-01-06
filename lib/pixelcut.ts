const PIXELCUT_API_KEY = process.env.PIXELCUT_API_KEY || ''
const PIXELCUT_API_URL = 'https://api.pixelcut.ai/v1'

export async function removeBackground(imageUrl: string): Promise<string | null> {
  try {
    const response = await fetch(`${PIXELCUT_API_URL}/remove-background`, {
      method: 'POST',
      headers: {
        'X-API-Key': PIXELCUT_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        image_url: imageUrl,
        format: 'png'
      })
    })

    if (!response.ok) {
      throw new Error(`Pixelcut API error: ${response.status}`)
    }

    const data = await response.json()
    return data.result_url
  } catch (error) {
    console.error('Background removal error:', error)
    return null
  }
}

export async function virtualTryOn(
  personImageUrl: string,
  garmentImageUrl: string
): Promise<string | null> {
  try {
    const response = await fetch(`${PIXELCUT_API_URL}/try-on`, {
      method: 'POST',
      headers: {
        'X-API-Key': PIXELCUT_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        person_image_url: personImageUrl,
        garment_image_url: garmentImageUrl,
        wait_for_result: true
      })
    })

    if (!response.ok) {
      throw new Error(`Pixelcut API error: ${response.status}`)
    }

    const data = await response.json()
    return data.result_url
  } catch (error) {
    console.error('Virtual try-on error:', error)
    return null
  }
}