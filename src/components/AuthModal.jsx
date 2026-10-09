import { useState } from 'react'
import { signUp, verifySignUp, signIn } from '../data/auth.js'

/**
 * AuthModal — Sign Up (with email verification) and Sign In flows.
 * mode: 'signup' | 'signin' (initial)
 */
export default function AuthModal({ onClose, onAuthed, initialMode = 'signin' }) {
  const [mode, setMode] = useState(initialMode) // 'signup' | 'signin'
  const [step, setStep] = useState('form') // 'form' | 'code' | 'success'
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [devCode, setDevCode] = useState(null)

  const switchMode = (newMode) => {
    setMode(newMode)
    setStep('form')
    setError('')
    setDevCode(null)
  }

  // --- Sign Up: submit form → send code ---
  const handleSignUp = async (e) => {
    e.preventDefault()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address')
      return
    }
    if (!username || username.trim().length < 2) {
      setError('Username must be at least 2 characters')
      return
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setLoading(true)
    setError('')
    try {
      const result = await signUp(email, username, password)
      if (result.error) {
        setError(result.error)
      } else {
        if (result.devCode) setDevCode(result.devCode)
        setStep('code')
      }
    } catch {
      setError('Failed to connect to server. Please try again.')
    }
    setLoading(false)
  }

  // --- Verify signup code ---
  const handleVerify = async (e) => {
    e.preventDefault()
    if (!code || code.length !== 6) {
      setError('Please enter the 6-digit code')
      return
    }
    setLoading(true)
    setError('')
    try {
      const result = await verifySignUp(email, code)
      if (result.error) {
        setError(result.error)
      } else {
        setStep('success')
        onAuthed?.(result.account)
      }
    } catch {
      setError('Failed to verify. Please try again.')
    }
    setLoading(false)
  }

  // --- Sign In: submit form → authenticate ---
  const handleSignIn = async (e) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Email and password are required')
      return
    }
    setLoading(true)
    setError('')
    try {
      const result = await signIn(email, password)
      if (result.error) {
        setError(result.error)
      } else {
        setStep('success')
        onAuthed?.(result.account)
      }
    } catch {
      setError('Failed to connect to server. Please try again.')
    }
    setLoading(false)
  }

  const handleClose = () => onClose()

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div className="modal-panel max-w-md" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-surface-4">
          <div>
            <h2 className="text-xl font-bold text-content-primary">
              {step === 'success' ? 'Welcome!' : mode === 'signup' ? 'Create Account' : 'Sign In'}
            </h2>
            <p className="text-sm text-content-secondary mt-0.5">
              {step === 'code' && 'Enter the code we sent you'}
              {step === 'success' && 'Your account is ready'}
              {step === 'form' && mode === 'signup' && 'Verify your email to get started'}
              {step === 'form' && mode === 'signin' && 'Welcome back to WASModrinth'}
            </p>
          </div>
          <button onClick={handleClose} className="btn-ghost p-2 rounded-lg">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round"/>
              <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Success */}
        {step === 'success' ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-brand-green/15 flex items-center justify-center">
              <svg className="w-8 h-8 text-brand-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-content-primary">
                {mode === 'signup' ? 'Account Created!' : 'Signed In!'}
              </h3>
              <p className="text-sm text-content-secondary mt-1">
                Logged in as <span className="text-content-primary font-medium">{username || email.split('@')[0]}</span>
              </p>
            </div>
            <button onClick={onClose} className="btn-primary mx-auto">Continue</button>
          </div>
        ) : step === 'code' ? (
          /* Code verification step (signup only) */
          <form onSubmit={handleVerify} className="p-5 space-y-4">
            {error && (
              <div className="bg-accent-red/10 border border-accent-red/30 rounded-lg p-3">
                <p className="text-sm text-accent-red">{error}</p>
              </div>
            )}

            {devCode && (
              <div className="bg-accent-orange/10 border border-accent-orange/30 rounded-lg p-3">
                <p className="text-sm text-accent-orange">
                  <span className="font-bold">Dev mode:</span> Your code is <span className="font-mono font-bold tracking-wider">{devCode}</span>
                </p>
                <p className="text-xs text-accent-orange/70 mt-1">No email service configured — add RESEND_API_KEY to send real emails.</p>
              </div>
            )}

            <div className="text-center">
              <p className="text-sm text-content-secondary">
                We sent a 6-digit code to <span className="text-content-primary font-medium">{email}</span>
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-content-secondary uppercase tracking-wide mb-1.5">
                Verification Code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                autoComplete="one-time-code"
                className="input w-full text-center text-2xl tracking-[0.5em] font-bold"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => { setStep('form'); setCode(''); setError('') }}
                className="text-sm text-content-secondary hover:text-content-primary"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={handleSignUp}
                className="text-sm text-content-link hover:text-accent-blue"
                disabled={loading}
              >
                Resend code
              </button>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center disabled:opacity-50">
              {loading ? 'Verifying...' : 'Verify & Create Account'}
            </button>
          </form>
        ) : (
          /* Form step */
          <form onSubmit={mode === 'signup' ? handleSignUp : handleSignIn} className="p-5 space-y-4">
            {error && (
              <div className="bg-accent-red/10 border border-accent-red/30 rounded-lg p-3">
                <p className="text-sm text-accent-red">{error}</p>
              </div>
            )}

            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-bold text-content-secondary uppercase tracking-wide mb-1.5">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="YourName"
                  className="input w-full"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-content-secondary uppercase tracking-wide mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="input w-full"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-content-secondary uppercase tracking-wide mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'}
                className="input w-full"
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center disabled:opacity-50">
              {loading
                ? (mode === 'signup' ? 'Sending...' : 'Signing in...')
                : (mode === 'signup' ? 'Send Verification Code' : 'Sign In')}
            </button>

            {/* Mode toggle */}
            <div className="text-center text-sm text-content-secondary">
              {mode === 'signup' ? (
                <>Already have an account?{' '}
                  <button type="button" onClick={() => switchMode('signin')} className="text-content-link hover:text-accent-blue font-medium">
                    Sign In
                  </button>
                </>
              ) : (
                <>Don't have an account?{' '}
                  <button type="button" onClick={() => switchMode('signup')} className="text-content-link hover:text-accent-blue font-medium">
                    Sign Up
                  </button>
                </>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
