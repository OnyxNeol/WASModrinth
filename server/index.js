import express from 'express'
import cors from 'cors'
import Database from 'better-sqlite3'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

const app = express()

// --- Database setup ---
const db = new Database('/data/wasmodrinth.db')
db.pragma('journal_mode = WAL')

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`)

// --- In-memory verification codes (short-lived, no need to persist) ---
const verificationCodes = new Map() // email -> { code, expires, purpose: 'signup'|'signin' }

// --- CORS ---
app.use(cors({ origin: true, credentials: true }))
app.use(express.json())

// --- Helpers ---
function sendVerificationEmail(email, code) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.log(`[WASModrinth] No RESEND_API_KEY — code for ${email}: ${code}`)
    return { devCode: code }
  }

  const configuredFrom = process.env.RESEND_FROM_EMAIL
  const emailPattern = /^("[^"]*"|[^<>]+)\s*<[^@]+@[^@]+\.[^@]+>$|^[^@]+@[^@]+\.[^@]+$/
  const fromEmail = (configuredFrom && emailPattern.test(configuredFrom))
    ? configuredFrom
    : 'WASModrinth <onboarding@resend.dev>'

  return fetch('https://api.resend.com/emails', {
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
            <p style="color: #b0bac5; font-size: 16px; margin: 0 0 24px;">Enter this code to verify your email:</p>
            <div style="text-align: center; margin: 24px 0;">
              <span style="display: inline-block; background: #27292e; border: 1px solid #42444a; border-radius: 12px; padding: 16px 40px; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #1bd96a;">${code}</span>
            </div>
            <p style="color: #96a2b0; font-size: 14px; margin: 24px 0 0;">This code expires in 10 minutes.</p>
          </div>
        </div>
      `,
    }),
  }).then(async (r) => {
    if (!r.ok) {
      const err = await r.text()
      console.error('[WASModrinth] Resend API error:', err)
      throw new Error('send_failed')
    }
    return {}
  })
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex')
}

function createSession(userId) {
  const token = generateToken()
  db.prepare('INSERT INTO sessions (token, user_id) VALUES (?, ?)').run(token, userId)
  return token
}

function getUserByToken(token) {
  if (!token) return null
  const row = db.prepare(`
    SELECT u.* FROM sessions s JOIN users u ON s.user_id = u.id
    WHERE s.token = ?
  `).get(token)
  return row || null
}

function publicUser(user) {
  return { id: user.id, username: user.username, email: user.email, createdAt: user.created_at }
}

// --- Routes ---

// Health
app.get('/', (req, res) => res.json({ status: 'ok' }))

// POST /api/signup — validate input, check email not taken, send verification code
app.post('/api/signup', async (req, res) => {
  const { email, username, password } = req.body
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Valid email is required' })
  }
  if (!username || username.trim().length < 2) {
    return res.status(400).json({ error: 'Username must be at least 2 characters' })
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' })
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists' })
  }

  const code = String(Math.floor(100000 + Math.random() * 900000))
  verificationCodes.set(email, {
    code,
    expires: Date.now() + 10 * 60 * 1000,
    purpose: 'signup',
    username: username.trim(),
    password,
  })

  try {
    const result = await sendVerificationEmail(email, code)
    res.json({ success: true, ...result, message: 'Verification code sent' })
  } catch {
    // Resend failed (e.g. unverified domain, non-owner recipient in free tier)
    // Fall back to dev mode so the flow still works
    console.log(`[WASModrinth] Resend failed — dev code for ${email}: ${code}`)
    res.json({ success: true, devCode: code, message: 'Email sending failed — code shown in dev mode' })
  }
})

// POST /api/verify-signup — verify code and create account in DB
app.post('/api/verify-signup', (req, res) => {
  const { email, code } = req.body
  if (!email || !code) {
    return res.status(400).json({ error: 'Email and code are required' })
  }

  const stored = verificationCodes.get(email)
  if (!stored || stored.purpose !== 'signup') {
    return res.status(400).json({ error: 'No verification code found. Please request a new code.' })
  }
  if (Date.now() > stored.expires) {
    verificationCodes.delete(email)
    return res.status(400).json({ error: 'Code expired. Please request a new code.' })
  }
  if (stored.code !== code) {
    return res.status(400).json({ error: 'Invalid verification code' })
  }

  // Create the account
  verificationCodes.delete(email)
  const hash = bcrypt.hashSync(stored.password, 10)
  const info = db.prepare(
    'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)'
  ).run(stored.username, email, hash)

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid)
  const token = createSession(user.id)
  res.json({ success: true, account: publicUser(user), token })
})

// POST /api/signin — validate email + password, return account + token
app.post('/api/signin', (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' })
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' })
  }

  if (!bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' })
  }

  const token = createSession(user.id)
  res.json({ success: true, account: publicUser(user), token })
})

// POST /api/me — validate token, return current user
app.post('/api/me', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  const user = getUserByToken(token)
  if (!user) return res.status(401).json({ error: 'Not authenticated' })
  res.json({ account: publicUser(user) })
})

// POST /api/signout — invalidate token
app.post('/api/signout', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (token) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token)
  }
  res.json({ success: true })
})

const PORT = process.env.PORT || 3001
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[WASModrinth] Auth server running on port ${PORT}`)
})
