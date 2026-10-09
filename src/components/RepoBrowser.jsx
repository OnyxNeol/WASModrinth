import { useState, useEffect, useCallback } from 'react'
import { fetchRepos, fetchRepo, deleteFile } from '../data/repositories.js'
import { submitMod } from '../data/manifest.js'
import { isLoggedIn, getCurrentUser } from '../data/auth.js'
import { CATEGORIES, LICENSES } from '../data/constants.js'

/**
 * RepoBrowser — native in-platform repository browser.
 * Lists all repositories, shows files, and lets owners manage their repos.
 */
export default function RepoBrowser({ onNavigate }) {
  const [repos, setRepos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedRepo, setSelectedRepo] = useState(null)
  const [files, setFiles] = useState([])
  const [filesLoading, setFilesLoading] = useState(false)
  const [importStatus, setImportStatus] = useState(null)
  const [deleteStatus, setDeleteStatus] = useState(null)

  const loggedIn = isLoggedIn()
  const currentUser = getCurrentUser()

  const loadRepos = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await fetchRepos()
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

  const handleRepoClick = async (repo) => {
    setSelectedRepo(repo)
    setFiles([])
    setImportStatus(null)
    setDeleteStatus(null)
    setFilesLoading(true)
    try {
      const data = await fetchRepo(repo.slug)
      setFiles(data.files || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setFilesLoading(false)
    }
  }

  const handleImport = async (file) => {
    setImportStatus(null)
    const downloadUrl = `/api/repos/${selectedRepo.slug}/files/${encodeURIComponent(file.filename)}`
    const mod = {
      slug: selectedRepo.slug,
      title: selectedRepo.title,
      description: selectedRepo.description || `Imported from ${selectedRepo.title}`,
      author: selectedRepo.author,
      category: selectedRepo.category || 'eaglerforge',
      license: selectedRepo.license || 'MIT',
      version: selectedRepo.version || '1.0.0',
      filename: file.filename,
      download_url: downloadUrl,
      icon_url: selectedRepo.icon_url || '',
    }
    const result = await submitMod(mod)
    if (result.success) {
      setImportStatus({ success: true, mod: result.mod })
    } else {
      setImportStatus({ success: false, errors: result.errors })
    }
  }

  const handleDeleteFile = async (file) => {
    setDeleteStatus(null)
    try {
      await deleteFile(selectedRepo.slug, file.filename)
      setFiles((prev) => prev.filter((f) => f.filename !== file.filename))
      setDeleteStatus({ success: true, message: `Deleted ${file.filename}` })
    } catch (e) {
      setDeleteStatus({ success: false, message: e.message })
    }
  }

  const isOwner = selectedRepo && currentUser && selectedRepo.owner_id === currentUser.id

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <button onClick={() => onNavigate('/')} className="btn-ghost mb-4">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Back to Mods
      </button>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-surface-3 flex items-center justify-center">
            <svg className="w-6 h-6 text-content-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 3h18v18H3V3zm2 2v14h14V5H5z" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M7 7h10v2H7V7zm0 4h10v2H7v-2zm0 4h7v2H7v-2z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-content-primary">Repositories</h1>
            <p className="text-sm text-content-secondary">Browse native mod repositories and import files</p>
          </div>
        </div>
        {loggedIn && (
          <button onClick={() => onNavigate('/upload')} className="btn-primary">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="17 8 12 3 7 8" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="hidden sm:inline">Create Repo</span>
          </button>
        )}
      </div>

      {error && (
        <div className="bg-accent-red/10 border border-accent-red/30 rounded-lg p-3 mb-4">
          <p className="text-sm text-accent-red">{error}</p>
        </div>
      )}

      {selectedRepo ? (
        <div className="space-y-4">
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-content-primary">{selectedRepo.title}</h2>
                <p className="text-sm text-content-secondary">{selectedRepo.description || 'No description'}</p>
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="badge-gray">by {selectedRepo.author}</span>
                  {selectedRepo.category && (
                    <span className="badge-blue">{CATEGORIES.find(c => c.id === selectedRepo.category)?.label || selectedRepo.category}</span>
                  )}
                  {selectedRepo.license && (
                    <span className="badge-green">{LICENSES[selectedRepo.license]?.label || selectedRepo.license}</span>
                  )}
                  {isOwner && <span className="badge-purple">Owner</span>}
                </div>
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

          {deleteStatus && (
            <div className={`rounded-lg p-3 border ${deleteStatus.success ? 'bg-brand-green/10 border-brand-green/30' : 'bg-accent-red/10 border-accent-red/30'}`}>
              <p className={`text-sm ${deleteStatus.success ? 'text-brand-green' : 'text-accent-red'}`}>{deleteStatus.message}</p>
            </div>
          )}

          {filesLoading ? (
            <div className="text-content-secondary py-8 text-center">Loading files...</div>
          ) : files.length === 0 ? (
            <div className="card p-6 text-center text-content-secondary">
              No files in this repository yet.
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-bold text-content-secondary uppercase tracking-wide">Files ({files.length})</p>
              {files.map((file) => (
                <div key={file.id} className="card p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <svg className={`w-5 h-5 ${file.file_type === 'epk' ? 'text-accent-purple' : 'text-accent-orange'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round"/>
                      <polyline points="14 2 14 8 20 8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-content-primary">{file.filename}</p>
                      <p className="text-xs text-content-secondary">
                        .{file.file_type} · {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleImport(file)} className="btn-primary text-sm">
                      Import as Mod
                    </button>
                    {isOwner && (
                      <button
                        onClick={() => handleDeleteFile(file)}
                        className="btn-ghost text-sm text-accent-red hover:bg-accent-red/10"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        loading ? (
          <div className="text-content-secondary py-8 text-center">Loading repositories...</div>
        ) : repos.length === 0 ? (
          <div className="card p-6 text-center">
            <p className="text-content-primary font-medium mb-1">No repositories yet</p>
            <p className="text-sm text-content-secondary">
              {loggedIn
                ? 'Click "Create Repo" to upload a mod and create your first repository.'
                : 'Sign in and upload a mod to create your first repository.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {repos.map((repo) => (
              <button
                key={repo.id}
                onClick={() => handleRepoClick(repo)}
                className="card card-hover p-4 text-left"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-surface-3 flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-content-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 3h18v18H3V3zm2 2v14h14V5H5z" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-content-primary truncate">{repo.title}</p>
                    <p className="text-xs text-content-secondary truncate">{repo.description || 'No description'}</p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="text-xs text-content-secondary">by {repo.author}</span>
                      {currentUser && repo.owner_id === currentUser.id && (
                        <span className="badge-purple text-xs">Owner</span>
                      )}
                    </div>
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
