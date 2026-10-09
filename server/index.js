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
    role TEXT NOT NULL DEFAULT 'user',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS repositories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    author TEXT NOT NULL,
    owner_id INTEGER NOT NULL,
    category TEXT,
    license TEXT,
    version TEXT DEFAULT '1.0.0',
    icon_url TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (owner_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS repository_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repo_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    file_type TEXT NOT NULL,
    content BLOB,
    size INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (repo_id) REFERENCES repositories(id),
    UNIQUE(repo_id, filename)
  );
  CREATE TABLE IF NOT EXISTS download_counts (
    slug TEXT PRIMARY KEY,
    count INTEGER NOT NULL DEFAULT 0
  );
`)

// --- In-memory verification codes (short-lived, no need to persist) ---
const verificationCodes = new Map()

// --- CORS ---
app.use(cors({ origin: true, credentials: true }))
app.use(express.json({ limit: '50mb' }))

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
      subject: `${code} is your WASModrinth verification code`,
      html: `
        <div style="font-family: Inter, system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; background: #1a1c20; border-radius: 12px; padding: 6px;">
              <svg width="40" height="40" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="64" height="64" rx="14" fill="#1a1c20"/>
                <g stroke="#34d399" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none">
                  <path d="M12 18 L20 44 L28 24 L36 44 L44 24"/>
                  <path d="M44 24 L44 14 M40 18 L44 14 L48 18"/>
                </g>
              </svg>
            </div>
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
      console.warn('[WASModrinth] Resend send failed, using dev mode:', err.slice(0, 120))
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
  return { id: user.id, username: user.username, email: user.email, role: user.role || 'user', createdAt: user.created_at }
}

// Auto-assign owner role to the project owner's email
const OWNER_EMAIL = 'onyxneol@proton.me'
function ensureOwnerRole(user) {
  if (user.email === OWNER_EMAIL && user.role !== 'owner') {
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run('owner', user.id)
    return { ...user, role: 'owner' }
  }
  return user
}

// --- Auth middleware ---
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  const user = getUserByToken(token)
  if (!user) return res.status(401).json({ error: 'Not authenticated' })
  req.user = user
  next()
}

// --- Auth routes ---

app.get('/', (req, res) => res.json({ status: 'ok' }))

app.post('/api/signup', async (req, res) => {
  const { username, password } = req.body
  const email = String(req.body.email || '').trim().toLowerCase()
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

  const pending = verificationCodes.get(email)
  const code = (pending && pending.purpose === 'signup' && Date.now() < pending.expires)
    ? pending.code
    : String(Math.floor(100000 + Math.random() * 900000))
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
    console.log(`[WASModrinth] Resend failed — dev code for ${email}: ${code}`)
    res.json({ success: true, devCode: code, message: 'Email sending failed — code shown in dev mode' })
  }
})

app.post('/api/verify-signup', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase()
  const code = String(req.body.code || '').trim()
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
    return res.status(400).json({ error: 'Invalid verification code.' })
  }

  verificationCodes.delete(email)
  const hash = bcrypt.hashSync(stored.password, 10)
  const info = db.prepare(
    'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)'
  ).run(stored.username, email, hash)

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid)
  const userWithRole = ensureOwnerRole(user)
  const token = createSession(user.id)
  res.json({ success: true, account: publicUser(userWithRole), token })
})

app.post('/api/signin', (req, res) => {
  const { password } = req.body
  const email = String(req.body.email || '').trim().toLowerCase()
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

  const userWithRole = ensureOwnerRole(user)
  const token = createSession(user.id)
  res.json({ success: true, account: publicUser(userWithRole), token })
})

app.post('/api/me', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  const user = getUserByToken(token)
  if (!user) return res.status(401).json({ error: 'Not authenticated' })
  res.json({ account: publicUser(ensureOwnerRole(user)) })
})

app.post('/api/signout', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (token) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token)
  }
  res.json({ success: true })
})

// --- Native repository routes ---

// List all repositories
app.get('/api/repos', (req, res) => {
  const repos = db.prepare(`
    SELECT r.id, r.slug, r.title, r.description, r.author, r.owner_id,
           r.category, r.license, r.version, r.icon_url, r.created_at,
           u.username as owner_name
    FROM repositories r
    JOIN users u ON r.owner_id = u.id
    ORDER BY r.created_at DESC
  `).all()
  res.json({ repos })
})

// Get repository with file listing
app.get('/api/repos/:slug', (req, res) => {
  const repo = db.prepare(`
    SELECT r.*, u.username as owner_name
    FROM repositories r
    JOIN users u ON r.owner_id = u.id
    WHERE r.slug = ?
  `).get(req.params.slug)
  if (!repo) return res.status(404).json({ error: 'Repository not found' })

  const files = db.prepare(`
    SELECT id, filename, file_type, size, created_at
    FROM repository_files WHERE repo_id = ?
    ORDER BY filename
  `).all(repo.id)

  res.json({ repo, files })
})

// Create repository (auth required — owner = logged-in user)
app.post('/api/repos', authMiddleware, (req, res) => {
  const { slug, title, description, category, license, version, icon_url } = req.body
  const author = req.user.username

  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    return res.status(400).json({ error: 'Slug must be lowercase with only letters, numbers, and hyphens' })
  }
  if (!title || title.trim().length < 3) {
    return res.status(400).json({ error: 'Title must be at least 3 characters' })
  }

  try {
    const info = db.prepare(`
      INSERT INTO repositories (slug, title, description, author, owner_id, category, license, version, icon_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(slug, title, description || '', author, req.user.id, category || '', license || '', version || '1.0.0', icon_url || '')

    const repo = db.prepare('SELECT * FROM repositories WHERE id = ?').get(info.lastInsertRowid)
    res.json({ success: true, repo })
  } catch (e) {
    if (e.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'A repository with this slug already exists' })
    }
    throw e
  }
})

// Upload file to repository (owner only)
app.post('/api/repos/:slug/files', authMiddleware, (req, res) => {
  const repo = db.prepare('SELECT * FROM repositories WHERE slug = ?').get(req.params.slug)
  if (!repo) return res.status(404).json({ error: 'Repository not found' })
  if (repo.owner_id !== req.user.id) {
    return res.status(403).json({ error: 'Only the repository owner can upload files' })
  }

  const { filename, content } = req.body
  if (!filename || !content) {
    return res.status(400).json({ error: 'Filename and content are required' })
  }

  // Validate file extension — .js and .epk supported
  const ext = filename.split('.').pop().toLowerCase()
  if (!['js', 'epk'].includes(ext)) {
    return res.status(400).json({ error: 'Only .js and .epk files are supported' })
  }

  const buffer = Buffer.from(content, 'base64')

  try {
    db.prepare(`
      INSERT INTO repository_files (repo_id, filename, file_type, content, size)
      VALUES (?, ?, ?, ?, ?)
    `).run(repo.id, filename, ext, buffer, buffer.length)
  } catch (e) {
    if (e.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'A file with this name already exists in this repository' })
    }
    throw e
  }

  const downloadUrl = `/api/repos/${repo.slug}/files/${encodeURIComponent(filename)}`
  res.json({ success: true, filename, download_url: downloadUrl, size: buffer.length })
})

// Download / serve a file
app.get('/api/repos/:slug/files/:filename', (req, res) => {
  const repo = db.prepare('SELECT * FROM repositories WHERE slug = ?').get(req.params.slug)
  if (!repo) return res.status(404).json({ error: 'Repository not found' })

  const filename = decodeURIComponent(req.params.filename)
  const file = db.prepare('SELECT * FROM repository_files WHERE repo_id = ? AND filename = ?')
    .get(repo.id, filename)
  if (!file) return res.status(404).json({ error: 'File not found' })

  const contentTypes = {
    js: 'application/javascript',
    epk: 'application/octet-stream',
  }
  res.setHeader('Content-Type', contentTypes[file.file_type] || 'application/octet-stream')
  res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`)
  res.send(file.content)
})

// Delete file (owner only)
app.delete('/api/repos/:slug/files/:filename', authMiddleware, (req, res) => {
  const repo = db.prepare('SELECT * FROM repositories WHERE slug = ?').get(req.params.slug)
  if (!repo) return res.status(404).json({ error: 'Repository not found' })
  if (repo.owner_id !== req.user.id) {
    return res.status(403).json({ error: 'Only the repository owner can delete files' })
  }

  const filename = decodeURIComponent(req.params.filename)
  const result = db.prepare('DELETE FROM repository_files WHERE repo_id = ? AND filename = ?')
    .run(repo.id, filename)
  if (result.changes === 0) return res.status(404).json({ error: 'File not found' })

  res.json({ success: true })
})

// Update repository metadata (owner only)
app.put('/api/repos/:slug', authMiddleware, (req, res) => {
  const repo = db.prepare('SELECT * FROM repositories WHERE slug = ?').get(req.params.slug)
  if (!repo) return res.status(404).json({ error: 'Repository not found' })
  if (repo.owner_id !== req.user.id) {
    return res.status(403).json({ error: 'Only the repository owner can update the repository' })
  }

  const { title, description, category, license, version, icon_url } = req.body
  db.prepare(`
    UPDATE repositories SET
      title = COALESCE(?, title),
      description = COALESCE(?, description),
      category = COALESCE(?, category),
      license = COALESCE(?, license),
      version = COALESCE(?, version),
      icon_url = COALESCE(?, icon_url)
    WHERE slug = ?
  `).run(title, description, category, license, version, icon_url, req.params.slug)

  const updated = db.prepare('SELECT * FROM repositories WHERE slug = ?').get(req.params.slug)
  res.json({ success: true, repo: updated })
})

// --- Download tracking ---

// Increment download count for a mod (by slug)
app.post('/api/downloads/:slug', (req, res) => {
  const slug = req.params.slug
  db.prepare(`
    INSERT INTO download_counts (slug, count) VALUES (?, 1)
    ON CONFLICT(slug) DO UPDATE SET count = count + 1
  `).run(slug)
  const row = db.prepare('SELECT count FROM download_counts WHERE slug = ?').get(slug)
  res.json({ slug, count: row?.count ?? 0 })
})

// Get download count for a mod (by slug)
app.get('/api/downloads/:slug', (req, res) => {
  const row = db.prepare('SELECT count FROM download_counts WHERE slug = ?').get(req.params.slug)
  res.json({ slug: req.params.slug, count: row?.count ?? 0 })
})

const PORT = process.env.PORT || 3001
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[WASModrinth] Server running on port ${PORT}`)
})
