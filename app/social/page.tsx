"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function SocialPage() {
  const router = useRouter()
  
  useEffect(() => {
    router.push('/explore')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p>Yönlendiriliyor...</p>
    </div>
  )
}