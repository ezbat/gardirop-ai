import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function POST(request: Request) {
  try {
    // Auth kontrolü
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { message, sessionId, chatHistory } = await request.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const webhookUrl = process.env.N8N_WEBHOOK_URL

    if (!webhookUrl) {
      console.error('N8N_WEBHOOK_URL is not configured')
      return NextResponse.json(
        { error: 'Support chat is not configured' },
        { status: 503 }
      )
    }

    // n8n webhook'una POST
    const n8nResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        userId: session.user.id,
        userName: session.user.name || 'Kullanıcı',
        userEmail: session.user.email || '',
        sessionId,
        chatHistory: chatHistory || [],
      }),
    })

    if (!n8nResponse.ok) {
      console.error('n8n webhook error:', n8nResponse.status, await n8nResponse.text())
      return NextResponse.json(
        { error: 'Support service unavailable' },
        { status: 502 }
      )
    }

    const data = await n8nResponse.json()

    return NextResponse.json({
      reply: data.reply || data.output || data.message || 'Yanıt alınamadı.',
      timestamp: data.timestamp || new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Support chat API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message },
      { status: 500 }
    )
  }
}
