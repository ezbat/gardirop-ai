import { supabase } from './supabase'

export async function createNotification(
  userId: string,
  fromUserId: string,
  type: 'like' | 'comment' | 'follow' | 'outfit_saved',
  content: string
) {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        from_user_id: fromUserId,
        type,
        content,
        is_read: false
      })

    if (error) throw error
    console.log('✅ Notification created')
  } catch (error) {
    console.error('Create notification error:', error)
  }
}