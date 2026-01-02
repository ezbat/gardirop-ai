import { supabase } from './supabase'

export interface CartItem {
  id: string
  product_id: string
  quantity: number
  product?: {
    id: string
    store_name: string
    product_name: string
    price: number
    image_url: string
  }
}

export async function getCart(userId: string): Promise<CartItem[]> {
  try {
    const { data: cartData, error: cartError } = await supabase
      .from('cart')
      .select('*')
      .eq('user_id', userId)

    if (cartError) throw cartError

    // Her cart item için product bilgisini çek
    const cartWithProducts = await Promise.all(
      (cartData || []).map(async (item) => {
        const { data: product } = await supabase
          .from('store_products')
          .select('id, store_name, product_name, price, image_url')
          .eq('id', item.product_id)
          .single()

        return {
          ...item,
          product: product || undefined
        }
      })
    )

    return cartWithProducts
  } catch (error) {
    console.error('Get cart error:', error)
    return []
  }
}

export async function addToCart(userId: string, productId: string, quantity: number = 1) {
  try {
    // Zaten sepette var mı?
    const { data: existing } = await supabase
      .from('cart')
      .select('*')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .single()

    if (existing) {
      // Miktarı artır
      const { error } = await supabase
        .from('cart')
        .update({ quantity: existing.quantity + quantity })
        .eq('id', existing.id)

      if (error) throw error
    } else {
      // Yeni ekle
      const { error } = await supabase
        .from('cart')
        .insert({ user_id: userId, product_id: productId, quantity })

      if (error) throw error
    }

    console.log('✅ Added to cart')
    return true
  } catch (error) {
    console.error('Add to cart error:', error)
    return false
  }
}

export async function updateCartQuantity(cartItemId: string, quantity: number) {
  try {
    const { error } = await supabase
      .from('cart')
      .update({ quantity })
      .eq('id', cartItemId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Update cart error:', error)
    return false
  }
}

export async function removeFromCart(cartItemId: string) {
  try {
    const { error } = await supabase
      .from('cart')
      .delete()
      .eq('id', cartItemId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Remove from cart error:', error)
    return false
  }
}

export async function clearCart(userId: string) {
  try {
    const { error } = await supabase
      .from('cart')
      .delete()
      .eq('user_id', userId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Clear cart error:', error)
    return false
  }
}

export async function getCartTotal(userId: string): Promise<number> {
  const cart = await getCart(userId)
  return cart.reduce((total, item) => {
    return total + (item.product?.price || 0) * item.quantity
  }, 0)
}