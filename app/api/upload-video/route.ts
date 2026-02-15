import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { createClient } from '@supabase/supabase-js'
import { authOptions } from '../auth/[...nextauth]/route'

export async function POST(req: NextRequest) {
  try {
    // 1. Verify NextAuth session
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Get video data from request
    const formData = await req.formData()
    const videoFile = formData.get('video') as File
    const thumbnailFile = formData.get('thumbnail') as File
    const caption = formData.get('caption') as string
    const duration = parseInt(formData.get('duration') as string)
    const productIdsJson = formData.get('product_ids') as string | null
    const productIds = productIdsJson ? JSON.parse(productIdsJson) : []

    if (!videoFile || !thumbnailFile) {
      return NextResponse.json({ error: 'Missing files' }, { status: 400 })
    }

    // 3. Use admin Supabase client (bypasses RLS)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const userId = session.user.id
    const videoId = crypto.randomUUID()

    // 4. Upload video
    const videoExtension = videoFile.type === 'video/mp4' ? 'mp4' : 'webm'
    const videoBuffer = await videoFile.arrayBuffer()

    const { data: videoData, error: videoError } = await supabaseAdmin.storage
      .from('videos')
      .upload(
        `${userId}/${videoId}.${videoExtension}`,
        videoBuffer,
        {
          contentType: videoFile.type,
          upsert: false
        }
      )

    if (videoError) throw videoError

    // 5. Upload thumbnail
    const thumbnailBuffer = await thumbnailFile.arrayBuffer()

    const { data: thumbData, error: thumbError } = await supabaseAdmin.storage
      .from('videos')
      .upload(
        `${userId}/${videoId}-thumb.jpg`,
        thumbnailBuffer,
        {
          contentType: 'image/jpeg',
          upsert: false
        }
      )

    if (thumbError) throw thumbError

    // 6. Get public URLs
    const { data: { publicUrl: videoUrl } } = supabaseAdmin.storage
      .from('videos')
      .getPublicUrl(videoData.path)

    const { data: { publicUrl: thumbnailUrl } } = supabaseAdmin.storage
      .from('videos')
      .getPublicUrl(thumbData.path)

    // 7. Create post in database
    const postId = crypto.randomUUID()
    const { error: postError } = await supabaseAdmin
      .from('posts')
      .insert({
        id: postId,
        user_id: userId,
        video_url: videoUrl,
        thumbnail_url: thumbnailUrl,
        caption: caption || 'New video',
        video_duration: duration,
        is_video: true,
        likes_count: 0,
        comments_count: 0,
        view_count: 0
      })

    if (postError) throw postError

    // 8. Add product tags if provided (MULTIPLE appearances per product!)
    if (productIds.length > 0) {
      const productTags: any[] = []

      // Each product appears MULTIPLE times throughout the video
      productIds.forEach((productId: string, productIndex: number) => {
        // Calculate how many times this product should appear (3-5 times)
        const appearanceCount = Math.min(5, Math.max(3, Math.floor(duration / 8)))

        for (let i = 0; i < appearanceCount; i++) {
          // Spread appearances throughout the video
          const baseTime = Math.floor((duration / (appearanceCount + 1)) * (i + 1))
          // Add slight variation to make it feel more natural
          const variation = Math.floor(Math.random() * 3) - 1
          const timestamp = Math.max(2, Math.min(duration - 3, baseTime + variation))

          // Vary position slightly for each appearance (more dynamic)
          const positions = [
            { x: 0.5, y: 0.4 },   // Center-top
            { x: 0.5, y: 0.6 },   // Center-bottom
            { x: 0.3, y: 0.5 },   // Left-center
            { x: 0.7, y: 0.5 },   // Right-center
            { x: 0.5, y: 0.5 },   // Pure center
          ]
          const position = positions[i % positions.length]

          productTags.push({
            id: crypto.randomUUID(),
            post_id: postId,
            product_id: productId,
            position_x: position.x,
            position_y: position.y,
            timestamp_seconds: timestamp
          })
        }
      })

      const { error: tagError } = await supabaseAdmin
        .from('post_product_tags')
        .insert(productTags)

      if (tagError) {
        console.error('Product tag error:', tagError)
        // Don't fail the upload, just log the error
      }
    }

    // 9. Success response
    return NextResponse.json({
      success: true,
      videoUrl,
      thumbnailUrl,
      productsTagged: productIds.length
    })

  } catch (error: any) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: error.message || 'Upload failed' },
      { status: 500 }
    )
  }
}
