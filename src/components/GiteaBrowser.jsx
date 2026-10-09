import { useState, useEffect, useCallback } from 'react'
import { fetchGiteaRepos, getRepoContents } from '../data/gitea.js'
import { submitMod } from '../data/manifest.js'
import { CATEGORIES, LICENSES } from '../data/constants.js'

/**
 * GiteaBrowser — optional page that lets users browse Gitea repos,
 * inspect their .js files, and import them as mods into the catalog.
 */
export default function GiteaBrowser({ onNavigate }) {
  const [repos, setRepos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [selectedRepo, setSelectedRepo] = useState(null)
  const [contents, setContents] = useState([])
  const [contentsLoading, setContentsLoading] = useState(false)
  const [importStatus, setImportStatus] = useState(null)

  const loadRepos = useCallback(async (q) => {
    setLoading(true)
    setError(null)
    try {
      const r = await fetchGiteaRepos(q)
      setRepos(r)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRepos()
  }, [loadRepos])

  const handleSearch = (e) => {
    e.preventDefault()
    loadRepos(search)
  }

  const handleRepoClick = async (repo) => {
    setSelectedRepo(repo)
    setContents([])
    setImportStatus(null)
    setContentsLoading(true)
    try {
      const files = await getRepoContents(repo.owner.login || repo.owner, repo.name)
      setContents(Array.isArray(files) ? files : [files])
    } catch (e) {
      setError(e.message)
    } finally {
      setContentsLoading(false)
    }
  }

  const handleImport = async (file) => {
    setImportStatus(null)
    const owner = selectedRepo.owner.login || selectedRepo.owner
    const downloadUrl = `/api/gitea/raw/${owner}/${selectedRepo.name}/main/${file.path}`
    const slug = selectedRepo.name.toLowerCase().replace(/[^a-z0-9-]/g, '-')
    const mod = {
      slug,
      title: selectedRepo.name,
      description: selectedRepo.description || `Imported from Gitea repo ${selectedRepo.name}`,
      author: owner,
      category: 'eaglerforge',
      license: 'MIT',
      version: '1.0.0',
      filename: file.name,
      download_url: downloadUrl,
      icon_url: '',
    }
    const result = await submitMod(mod)
    if (result.success) {
      setImportStatus({ success: true, mod: result.mod })
    } else {
      setImportStatus({ success: false, errors: result.errors })
    }
  }

  const jsFiles = contents.filter((f) => f.type === 'file' && f.name.endsWith('.js'))

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <button onClick={() => onNavigate('/')} className="btn-ghost mb-4">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Back to Mods
      </button>

      <div className="flex items-center gap-3 mb-6">
        <svg className="w-7 h-7 text-content-primary" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 3h18v18H3V3zm2 2v14h14V5H5zm2 2h10v2H7V7zm0 4h10v2H7v-2zm0 4h7v2H7v-2z"/>
        </svg>
        <div>
          <h1 className="text-2xl font-extrabold text-content-primary">Gitea Repositories</h1>
          <p className="text-sm text-content-secondary">Browse Gitea repos and import .js mod files</p>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="relative max-w-md">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search repos..."
            className="input w-full pl-9"
          />
        </div>
      </form>

      {error && (
        <div className="bg-accent-red/10 border border-accent-red/30 rounded-lg p-3 mb-4">
          <p className="text-sm text-accent-red">{error}</p>
        </div>
      )}

      {selectedRepo ? (
        /* Repo file browser */
        <div className="space-y-4">
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-content-primary">{selectedRepo.name}</h2>
                <p className="text-sm text-content-secondary">{selectedRepo.description || 'No description'}</p>
              </div>
              <button onClick={() => setSelectedRepo(null)} className="btn-ghost text-sm">
                ← Back to repos
              </button>
            </div>
          </div>

          {importStatus && (
            <div className={`rounded-lg p-3 border ${importStatus.success ? 'bg-brand-green/10 border-brand-green/30' : 'bg-accent-red/10 border-accent-red/30'}`}>
              {importStatus.success ? (
                <p className="text-sm text-brand-green">✓ Imported <span className="font-bold">{importStatus.mod.title}</span> — it's now in the catalog.</p>
              ) : (
                <ul className="text-sm text-accent-red list-disc list-inside">
                  {importStatus.errors?.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              )}
            </div>
          )}

          {contentsLoading ? (
            <div className="text-content-secondary py-8 text-center">Loading files...</div>
          ) : jsFiles.length === 0 ? (
            <div className="card p-6 text-center text-content-secondary">
              No .js files found in this repository.
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-bold text-content-secondary uppercase tracking-wide">JavaScript Files ({jsFiles.length})</p>
              {jsFiles.map((file) => (
                <div key={file.path} className="card p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-accent-orange" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round"/>
                      <polyline points="14 2 14 8 20 8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-content-primary">{file.name}</p>
                      <p className="text-xs text-content-secondary">{file.path}</p>
                    </div>
                  </div>
                  <button onClick={() => handleImport(file)} className="btn-primary text-sm">
                    Import as Mod
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Repo list */
        loading ? (
          <div className="text-content-secondary py-8 text-center">Loading repositories...</div>
        ) : repos.length === 0 ? (
          <div className="card p-6 text-center">
            <p className="text-content-primary font-medium mb-1">No repositories yet</p>
            <p className="text-sm text-content-secondary">Upload a mod with "Create Gitea repository" to see it here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {repos.map((repo) => (
              <button
                key={repo.id}
                onClick={() => handleRepoClick(repo)}
                className="card p-4 text-left hover:border-brand-green/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-content-secondary mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 3h18v18H3V3zm2 2v14h14V5H5z" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-content-primary truncate">{repo.name}</p>
                    <p className="text-xs text-content-secondary truncate">{repo.description || 'No description'}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )
      )}
    </div>
  )
}
