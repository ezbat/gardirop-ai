'use client'

/**
 * <TrackEvent> — mount-once analytics side-effect for server-rendered pages.
 *
 * Drop inside any server component to fire an event when the page hydrates.
 *
 * Example (PDP):
 *   <TrackEvent type="product_view" sellerId={dto.seller.id} productId={dto.id} />
 */

import { useEffect } from 'react'
import { track, type EventType, type TrackPayload } from '@/lib/tracking'

interface Props {
  type:       EventType
  userId?:    string
  sellerId?:  string
  productId?: string
  orderId?:   string
  value?:     number
}

export default function TrackEvent({ type, userId, sellerId, productId, orderId, value }: Props) {
  useEffect(() => {
    const payload: TrackPayload = {}
    if (userId)    payload.user_id    = userId
    if (sellerId)  payload.seller_id  = sellerId
    if (productId) payload.product_id = productId
    if (orderId)   payload.order_id   = orderId
    if (value != null) payload.value  = value
    track(type, payload)
    // Only fire once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
