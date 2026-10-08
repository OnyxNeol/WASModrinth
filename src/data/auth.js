const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// Session state for the current user
let currentUser = null

// Load from sessionStorage on init
try {
  const stored = sessionStorage.getItem('wasmodrinth_user')
  if (stored) currentUser = JSON.parse(stored)
} catch {
  // ignore
}

export function getCurrentUser() {
  return currentUser
}

export function isLoggedIn() {
  return currentUser !== null
}

export function logout() {
  currentUser = null
  sessionStorage.removeItem('wasmodrinth_user')
}

/**
 * Request a verification code to be sent to the given email.
 */
export async function sendVerificationCode(email) {
  const res = await fetch(`${API_BASE}/api/send-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  return res.json()
}

/**
 * Verify the code and create the account.
 */
export async function verifyCode(email, code, username) {
  const res = await fetch(`${API_BASE}/api/verify-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code, username }),
  })
  const data = await res.json()
  if (data.success) {
    currentUser = data.account
    sessionStorage.setItem('wasmodrinth_user', JSON.stringify(data.account))
  }
  return data
}
