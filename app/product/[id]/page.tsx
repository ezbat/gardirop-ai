import { redirect } from 'next/navigation'

/**
 * Permanent redirect from /product/[id] → /products/[id]
 * Handles old links / bookmarks that used the singular route.
 */
export default function ProductRedirect({ params }: { params: { id: string } }) {
  redirect(`/products/${params.id}`)
}
