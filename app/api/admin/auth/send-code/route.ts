import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// Store verification codes temporarily (in production, use Redis)
export const verificationCodes = new Map<string, {
  code: string
  timestamp: number
  attempts: number
}>()

export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json()

    // Only allow for admin username
    if (username !== 'm3000') {
      return NextResponse.json({ error: 'Invalid user' }, { status: 401 })
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString()

    // Store code (expires in 5 minutes)
    verificationCodes.set(username, {
      code,
      timestamp: Date.now(),
      attempts: 0,
    })

    // Send email
    try {
      await resend.emails.send({
        from: 'Admin Panel <onboarding@resend.dev>',
        to: process.env.ADMIN_EMAIL || 'admin@example.com',
        subject: '🔐 Admin Panel Login - Verification Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #333; border-bottom: 3px solid #4F46E5; padding-bottom: 10px;">
              🔐 Admin Panel Login Attempt
            </h1>

            <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #666;">Your verification code is:</p>
              <h2 style="margin: 10px 0; color: #4F46E5; font-size: 32px; letter-spacing: 5px;">
                ${code}
              </h2>
              <p style="margin: 0; color: #666; font-size: 14px;">
                This code will expire in <strong>5 minutes</strong>
              </p>
            </div>

            <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #92400E;">
                ⚠️ <strong>Security Alert:</strong> If you did not attempt to login, please ignore this email.
              </p>
            </div>

            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              Login Time: ${new Date().toLocaleString('tr-TR')}
            </p>

            <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 30px 0;">

            <p style="color: #9CA3AF; font-size: 12px; text-align: center;">
              This is an automated security email from WEARO Admin Panel
            </p>
          </div>
        `,
      })

      console.log('✅ Verification code sent to:', process.env.ADMIN_EMAIL)

      return NextResponse.json({
        success: true,
        message: 'Verification code sent to your email'
      })
    } catch (emailError) {
      console.error('❌ Email send error:', emailError)
      return NextResponse.json(
        { error: 'Failed to send verification email' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Send code error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
