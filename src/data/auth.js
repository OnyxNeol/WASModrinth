const API_BASE = import.meta.env.VITE_API_URL || ''

// Session state
let currentUser = null
let sessionToken = null

// Load from sessionStorage on init
try {
  const storedUser = sessionStorage.getItem('wasmodrinth_user')
  const storedToken = sessionStorage.getItem('wasmodrinth_token')
  if (storedUser) currentUser = JSON.parse(storedUser)
  if (storedToken) sessionToken = storedToken
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
  if (sessionToken) {
    fetch(`${API_BASE}/api/signout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${sessionToken}` },
    }).catch(() => {})
  }
  currentUser = null
  sessionToken = null
  sessionStorage.removeItem('wasmodrinth_user')
  sessionStorage.removeItem('wasmodrinth_token')
}

/**
 * Sign Up: request a verification code for a new account.
 */
export async function signUp(email, username, password) {
  const res = await fetch(`${API_BASE}/api/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, username, password }),
  })
  return res.json()
}

/**
 * Verify the signup code and create the account.
 */
export async function verifySignUp(email, code) {
  const res = await fetch(`${API_BASE}/api/verify-signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  })
  const data = await res.json()
  if (data.success) {
    currentUser = data.account
    sessionToken = data.token
    sessionStorage.setItem('wasmodrinth_user', JSON.stringify(data.account))
    sessionStorage.setItem('wasmodrinth_token', data.token)
  }
  return data
}

/**
 * Sign In: validate email + password against the database.
 */
export async function signIn(email, password) {
  const res = await fetch(`${API_BASE}/api/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const data = await res.json()
  if (data.success) {
    currentUser = data.account
    sessionToken = data.token
    sessionStorage.setItem('wasmodrinth_user', JSON.stringify(data.account))
    sessionStorage.setItem('wasmodrinth_token', data.token)
  }
  return data
}
