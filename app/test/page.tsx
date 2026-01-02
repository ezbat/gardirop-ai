"use client"

import { useSession } from "next-auth/react"
import { useState } from "react"
import { supabase } from "@/lib/supabase"

export default function TestPage() {
  const { data: session, status } = useSession()
  const [result, setResult] = useState<any>(null)

  console.log('SESSION STATUS:', status)
  console.log('SESSION DATA:', session)

 const testSupabase = async () => {
  console.log('Full session:', session)
  
  const userId = session?.user?.id
  const userEmail = session?.user?.email

  console.log('User ID:', userId)
  console.log('User Email:', userEmail)

  if (!userId) {
    alert('❌ GİRİŞ YAPMADINIZ!')
    return
  }

  // Notifications test
  console.log('📥 Testing notifications...')
  const { data: notifs, error: notifsError } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)

  console.log('Notifications data:', notifs)
  console.log('Notifications error:', notifsError)

  // Users test
  const { data: users } = await supabase.from('users').select('*')
  
  // Clothes test
  const { data: clothes } = await supabase.from('clothes').select('*')

  setResult({ 
    session: { userId, userEmail },
    notifications: notifs,
    notificationsError: notifsError,
    users, 
    clothes 
  })
}


  return (
    <div className="min-h-screen p-8">
      <h1 className="text-3xl mb-6">TEST</h1>
      
      <div className="mb-4 p-4 bg-gray-100 rounded">
        <p><strong>Status:</strong> {status}</p>
        <p><strong>Logged in:</strong> {session ? 'YES ✅' : 'NO ❌'}</p>
        {session && (
          <>
            <p><strong>Email:</strong> {session.user?.email}</p>
            <p><strong>ID:</strong> {session.user?.id || 'UNDEFINED!'}</p>
          </>
        )}
      </div>

      {!session && (
        <div className="mb-4 p-4 bg-red-100 border border-red-500 rounded">
          <p className="text-red-700 font-bold">⚠️ GİRİŞ YAPMADINIZ!</p>
          <a href="/api/auth/signin" className="text-blue-500 underline">
            Giriş Yap
          </a>
        </div>
      )}

      <button
        onClick={testSupabase}
        className="px-6 py-3 bg-blue-500 text-white rounded"
      >
        Test Et
      </button>

      {result && (
        <pre className="mt-4 p-4 bg-gray-100 rounded text-xs overflow-auto">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  )
}