import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Header from './components/Header.jsx'
import Sidebar from './components/Sidebar.jsx'
import ModCard from './components/ModCard.jsx'
import ModDetail from './components/ModDetail.jsx'
import CategoriesPage from './components/CategoriesPage.jsx'
import SubmitModal from './components/SubmitModal.jsx'
import AuthModal from './components/AuthModal.jsx'
import { fetchManifest } from './data/manifest.js'
import { isLoggedIn } from './data/auth.js'

export default function App() {
  const navigate = useNavigate()
  const location = useLocation()

  const [mods, setMods] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [selectedLicense, setSelectedLicense] = useState(null)
  const [sortBy, setSortBy] = useState('downloads')
  const [selectedModSlug, setSelectedModSlug] = useState(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState('signin')

  // Derive modal visibility from the route
  const showSubmitModal = location.pathname === '/upload'

  // Extract slug from /mod/:slug route for deep linking
  useEffect(() => {
    const match = location.pathname.match(/^\/mod\/(.+)$/)
    if (match) {
      setSelectedModSlug(match[1])
    } else if (location.pathname !== '/mod/') {
      setSelectedModSlug(null)
    }
  }, [location.pathname])

  // Fetch manifest on mount
  useEffect(() => {
    fetchManifest()
      .then((data) => {
        setMods(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const refreshMods = useCallback(() => {
    fetchManifest().then(setMods)
  }, [])

  // Filter and sort mods
  const filteredMods = mods
    .filter((mod) => {
      if (selectedCategory && mod.category !== selectedCategory) return false
      if (selectedLicense && mod.license !== selectedLicense) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        return (
          mod.title?.toLowerCase().includes(q) ||
          mod.description?.toLowerCase().includes(q) ||
          mod.author?.toLowerCase().includes(q)
        )
      }
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'downloads') return (b.downloads ?? 0) - (a.downloads ?? 0)
      if (sortBy === 'followers') return (b.followers ?? 0) - (a.followers ?? 0)
      if (sortBy === 'newest') return new Date(b.created_at) - new Date(a.created_at)
      if (sortBy === 'name') return (a.title ?? '').localeCompare(b.title ?? '')
      return 0
    })

  const selectedMod = selectedModSlug ? mods.find((m) => m.slug === selectedModSlug) : null

  const handleNavigate = (path) => {
    if (path !== '/') {
      setSelectedModSlug(null)
    }
    navigate(path)
  }

  const handleSearch = (query) => {
    setSearchQuery(query)
    if (location.pathname !== '/') {
      navigate('/')
    }
  }

  const handleModClick = (mod) => {
    setSelectedModSlug(mod.slug)
    navigate(`/mod/${mod.slug}`)
  }

  // Route rendering
  const renderRoute = () => {
    const path = location.pathname

    // Mod detail
    if (path.startsWith('/mod/') && selectedMod) {
      return <ModDetail mod={selectedMod} onNavigate={handleNavigate} />
    }

    // Categories
    if (path === '/categories') {
      return (
        <CategoriesPage
          mods={mods}
          onCategorySelect={(cat) => setSelectedCategory(cat)}
          onNavigate={handleNavigate}
        />
      )
    }

    // Upload — show modal
    if (path === '/upload') {
      return null // modal is rendered separately below
    }

    // Home — mod grid
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-extrabold text-content-primary">
            {selectedCategory
              ? `${CATEGORIES_LABELS[selectedCategory] ?? 'Mods'}`
              : 'Discover Mods'}
          </h1>
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="input text-sm py-1.5"
            >
              <option value="downloads">Most Downloads</option>
              <option value="followers">Most Followers</option>
              <option value="newest">Newest</option>
              <option value="name">Name (A-Z)</option>
            </select>
          </div>
        </div>

        <div className="flex gap-6">
          <Sidebar
            selectedCategory={selectedCategory}
            selectedLicense={selectedLicense}
            onCategoryChange={setSelectedCategory}
            onLicenseChange={setSelectedLicense}
          />
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-content-secondary">Loading mods...</div>
              </div>
            ) : filteredMods.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-lg text-content-primary font-medium mb-1">No mods found</p>
                <p className="text-sm text-content-secondary">Try adjusting your filters or search query.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMods.map((mod) => (
                  <ModCard key={mod.id} mod={mod} onClick={handleModClick} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-1">
      <Header
        onSearch={handleSearch}
        onNavigate={handleNavigate}
        currentPath={location.pathname}
        onAuthClick={(mode) => { setAuthMode(mode || 'signin'); setShowAuthModal(true) }}
      />
      {renderRoute()}
      {showSubmitModal && isLoggedIn() && (
        <SubmitModal
          onClose={() => navigate('/')}
          onSubmitted={() => {
            refreshMods()
          }}
        />
      )}
      {showSubmitModal && !isLoggedIn() && (
        <AuthModal
          onClose={() => navigate('/')}
          onAuthed={() => setShowAuthModal(false)}
          initialMode="signup"
        />
      )}
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onAuthed={() => setShowAuthModal(false)}
          initialMode={authMode}
        />
      )}
      {/* Footer */}
      <footer className="border-t border-surface-3 mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between text-sm text-content-secondary">
          <span>WASModrinth — Eaglercraft Mod Repository</span>
          <span>Adapted from Modrinth's open-source design system</span>
        </div>
      </footer>
    </div>
  )
}

const CATEGORIES_LABELS = {
  eaglerforge: 'EaglerForge',
  eaglercraft: 'Eaglercraft',
  wasm: 'WebAssembly',
  utility: 'Utility',
  cosmetic: 'Cosmetic',
  'game-mechanic': 'Game Mechanic',
  library: 'Library',
  world: 'World',
}
