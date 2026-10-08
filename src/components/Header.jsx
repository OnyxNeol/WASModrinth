import { useState } from 'react'

/**
 * Header — adapts Modrinth's top navigation bar with WASModrinth branding,
 * search bar, and navigation links.
 */
export default function Header({ onSearch, onNavigate, currentPath }) {
  const [query, setQuery] = useState('')

  const navItems = [
    { label: 'Mods', path: '/' },
    { label: 'Categories', path: '/categories' },
  ]

  const handleSearch = (e) => {
    e.preventDefault()
    onSearch?.(query)
  }

  return (
    <header className="sticky top-0 z-40 bg-surface-2/95 backdrop-blur-md border-b border-surface-3">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
        {/* Logo */}
        <button
          onClick={() => onNavigate('/')}
          className="flex items-center gap-2 flex-shrink-0"
        >
          <div className="w-8 h-8 rounded-lg bg-brand-green flex items-center justify-center">
            <span className="text-black font-extrabold text-lg">W</span>
          </div>
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

        {/* Upload button */}
        <button onClick={() => onNavigate('/upload')} className="btn-primary flex-shrink-0">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round"/>
            <polyline points="17 8 12 3 7 8" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="hidden sm:inline">Upload</span>
        </button>
      </div>
    </header>
  )
}
