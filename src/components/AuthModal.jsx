import { useState } from 'react'
import { sendVerificationCode, verifyCode } from '../data/auth.js'

/**
 * AuthModal — account creation with email verification via Resend.
 * Two-step flow: enter email → receive 6-digit code → paste to verify.
 */
export default function AuthModal({ onClose, onAuthed }) {
  const [step, setStep] = useState('email') // 'email' | 'code' | 'success'
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [devCode, setDevCode] = useState(null)

  const handleSendCode = async (e) => {
    e.preventDefault()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address')
      return
    }
    setLoading(true)
    setError('')
    try {
      const result = await sendVerificationCode(email)
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

  const handleVerify = async (e) => {
    e.preventDefault()
    if (!code || code.length !== 6) {
      setError('Please enter the 6-digit code')
      return
    }
    setLoading(true)
    setError('')
    try {
      const result = await verifyCode(email, code, username || undefined)
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

  const handleClose = () => onClose()

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div className="modal-panel max-w-md" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-surface-4">
          <div>
            <h2 className="text-xl font-bold text-content-primary">
              {step === 'success' ? 'Welcome!' : 'Create Account'}
            </h2>
            <p className="text-sm text-content-secondary mt-0.5">
              {step === 'email' && 'Verify your email to get started'}
              {step === 'code' && 'Enter the code we sent you'}
              {step === 'success' && 'Your account is ready'}
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
              <h3 className="text-lg font-bold text-content-primary">Account Created!</h3>
              <p className="text-sm text-content-secondary mt-1">
                Logged in as <span className="text-content-primary font-medium">{username || email.split('@')[0]}</span>
              </p>
            </div>
            <button onClick={onClose} className="btn-primary mx-auto">Continue</button>
          </div>
        ) : step === 'code' ? (
          /* Code verification step */
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
                onClick={() => { setStep('email'); setCode(''); setError('') }}
                className="text-sm text-content-secondary hover:text-content-primary"
              >
                ← Change email
              </button>
              <button
                type="button"
                onClick={handleSendCode}
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
          /* Email entry step */
          <form onSubmit={handleSendCode} className="p-5 space-y-4">
            {error && (
              <div className="bg-accent-red/10 border border-accent-red/30 rounded-lg p-3">
                <p className="text-sm text-accent-red">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-content-secondary uppercase tracking-wide mb-1.5">
                Username <span className="normal-case text-content-secondary/60">(optional)</span>
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="YourName"
                className="input w-full"
              />
            </div>

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

            <p className="text-xs text-content-secondary">
              We'll send a 6-digit verification code to this email. WASModrinth will use this to verify your account.
            </p>

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center disabled:opacity-50">
              {loading ? 'Sending...' : 'Send Verification Code'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
