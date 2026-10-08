import express from 'express'
import cors from 'cors'

const app = express()

// In-memory store for verification codes and accounts (session-persistent)
const verificationCodes = new Map() // email -> { code, expires }
const accounts = new Map() // email -> { username, email, createdAt }

// CORS — allow the preview origin
app.use(cors({
  origin: true,
  credentials: true,
}))
app.use(express.json())

/**
 * POST /api/send-code
 * Generates a 6-digit verification code and sends it via Resend email API.
 * Email is sent from "WASModrinth <wasmodrinth@resend.dev>" (or configured domain).
 */
app.post('/api/send-code', async (req, res) => {
  const { email } = req.body
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Valid email is required' })
  }

  // Generate 6-digit code
  const code = String(Math.floor(100000 + Math.random() * 900000))
  const expires = Date.now() + 10 * 60 * 1000 // 10 minutes

  verificationCodes.set(email, { code, expires })

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    // No API key — return code in response for development/testing
    console.log(`[WASModrinth] No RESEND_API_KEY — verification code for ${email}: ${code}`)
    return res.json({ success: true, devCode: code, message: 'Email service not configured — code shown in response (dev mode)' })
  }

  try {
    // Use configured from-email, or fall back to Resend's default testing sender
    const configuredFrom = process.env.RESEND_FROM_EMAIL
    const emailPattern = /^("[^"]*"|[^<>]+)\s*<[^@]+@[^@]+\.[^@]+>$|^[^@]+@[^@]+\.[^@]+$/
    const fromEmail = (configuredFrom && emailPattern.test(configuredFrom))
      ? configuredFrom
      : 'WASModrinth <onboarding@resend.dev>'
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [email],
        subject: 'Your WASModrinth Verification Code',
        html: `
          <div style="font-family: Inter, system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
            <div style="text-align: center; margin-bottom: 24px;">
              <div style="display: inline-block; background: #1bd96a; color: #000; font-weight: 800; font-size: 24px; padding: 8px 16px; border-radius: 12px;">W</div>
              <h1 style="color: #ffffff; margin: 16px 0 0;">WASModrinth</h1>
            </div>
            <div style="background: #1d1f23; border: 1px solid #34363c; border-radius: 16px; padding: 32px;">
              <p style="color: #b0bac5; font-size: 16px; margin: 0 0 24px;">Enter this code to verify your email and create your account:</p>
              <div style="text-align: center; margin: 24px 0;">
                <span style="display: inline-block; background: #27292e; border: 1px solid #42444a; border-radius: 12px; padding: 16px 40px; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #1bd96a;">${code}</span>
              </div>
              <p style="color: #96a2b0; font-size: 14px; margin: 24px 0 0;">This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.</p>
            </div>
            <p style="color: #42444a; font-size: 12px; text-align: center; margin-top: 24px;">WASModrinth — Eaglercraft Mod Repository</p>
          </div>
        `,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('[WASModrinth] Resend API error:', err)
      return res.status(500).json({ error: 'Failed to send email. Please try again.' })
    }

    res.json({ success: true, message: 'Verification code sent to your email' })
  } catch (err) {
    console.error('[WASModrinth] Email send failed:', err.message)
    res.status(500).json({ error: 'Failed to send email. Please try again.' })
  }
})

/**
 * POST /api/verify-code
 * Verifies the code and creates the account if valid.
 */
app.post('/api/verify-code', (req, res) => {
  const { email, code, username } = req.body
  if (!email || !code) {
    return res.status(400).json({ error: 'Email and code are required' })
  }

  const stored = verificationCodes.get(email)
  if (!stored) {
    return res.status(400).json({ error: 'No verification code found. Please request a new code.' })
  }

  if (Date.now() > stored.expires) {
    verificationCodes.delete(email)
    return res.status(400).json({ error: 'Verification code expired. Please request a new code.' })
  }

  if (stored.code !== code) {
    return res.status(400).json({ error: 'Invalid verification code. Please check and try again.' })
  }

  // Code verified — create account
  verificationCodes.delete(email)
  const account = {
    email,
    username: username || email.split('@')[0],
    createdAt: new Date().toISOString(),
  }
  accounts.set(email, account)

  res.json({ success: true, account })
})

// Simple health endpoint
app.get('/', (req, res) => res.json({ status: 'ok' }))

const PORT = process.env.PORT || 3001
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[WASModrinth] Auth server running on port ${PORT}`)
})
