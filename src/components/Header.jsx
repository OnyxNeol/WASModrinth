import { useState } from 'react'
import { isLoggedIn, getCurrentUser, logout } from '../data/auth.js'

/**
 * Header — adapts Modrinth's top navigation bar with WASModrinth branding,
 * search bar, navigation links, and account auth controls.
 */
export default function Header({ onSearch, onNavigate, currentPath, onAuthClick }) {
  // onAuthClick(mode) — 'signin' or 'signup'
  const [query, setQuery] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const loggedIn = isLoggedIn()
  const user = getCurrentUser()

  const navItems = [
    { label: 'Mods', path: '/' },
    { label: 'Categories', path: '/categories' },
    { label: 'Repos', path: '/repos' },
  ]

  const handleSearch = (e) => {
    e.preventDefault()
    onSearch?.(query)
  }

  const handleLogout = () => {
    logout()
    setMenuOpen(false)
    onNavigate('/')
  }

  return (
    <header className="sticky top-0 z-40 bg-surface-2/95 backdrop-blur-md border-b border-surface-3">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
        {/* Logo */}
        <button
          onClick={() => onNavigate('/')}
          className="flex items-center gap-2 flex-shrink-0"
        >
          <img src="/logo.png" alt="WASModrinth" className="w-8 h-8 rounded-lg object-cover" />
          <span className="font-extrabold text-lg text-content-primary hidden sm:inline">
            WASModrinth
          </span>
        </button>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => onNavigate(item.path)}
              className={`btn-ghost text-sm ${
                currentPath === item.path ? 'text-content-primary bg-surface-3' : ''
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1 max-w-md mx-auto">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-secondary"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search mods..."
              className="input w-full pl-9"
            />
          </div>
        </form>

        {/* Auth / Upload */}
        {loggedIn ? (
          <div className="flex items-center gap-2 flex-shrink-0 relative">
            <button onClick={() => onNavigate('/upload')} className="btn-primary flex-shrink-0">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="17 8 12 3 7 8" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="hidden sm:inline">Upload</span>
            </button>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-9 h-9 rounded-lg bg-surface-4 flex items-center justify-center font-bold text-content-primary text-sm border border-surface-5 hover:bg-surface-5 transition-all"
            >
              {(user?.username || user?.email || 'U')[0].toUpperCase()}
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 card p-2 z-50">
                <div className="px-3 py-2 border-b border-surface-3 mb-1">
                  <p className="text-sm font-medium text-content-primary truncate">{user?.username || user?.email}</p>
                  <p className="text-xs text-content-secondary truncate">{user?.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="btn-ghost w-full justify-start text-sm"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeLinecap="round" strokeLinejoin="round"/>
                    <polyline points="16 17 21 12 16 7" strokeLinecap="round" strokeLinejoin="round"/>
                    <line x1="21" y1="12" x2="9" y2="12" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={() => onAuthClick('signin')} className="btn-secondary text-sm">
              Sign In
            </button>
            <button onClick={() => onAuthClick('signup')} className="btn-primary text-sm">
              Sign Up
            </button>
            <button onClick={() => onNavigate('/upload')} className="btn-secondary flex-shrink-0">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="17 8 12 3 7 8" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="hidden sm:inline">Upload</span>
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
