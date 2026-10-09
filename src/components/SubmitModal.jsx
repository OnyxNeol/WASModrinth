import { useState } from 'react'
import { CATEGORIES, LICENSES } from '../data/constants.js'
import { validateModEntry, submitMod, getHostingProvider } from '../data/manifest.js'
import { createGiteaMod } from '../data/gitea.js'

/**
 * SubmitModal — adapts Modrinth's mod submission workflow with a form modal
 * that supports two storage modes: creating a Gitea repository (with file upload)
 * or using an external download URL (raw GitHub / Hugging Face).
 */
export default function SubmitModal({ onClose, onSubmitted }) {
  const [storageMode, setStorageMode] = useState('gitea') // 'gitea' | 'external'
  const [form, setForm] = useState({
    slug: '',
    title: '',
    description: '',
    author: '',
    category: '',
    license: '',
    version: '',
    filename: '',
    download_url: '',
    icon_url: '',
  })
  const [fileContent, setFileContent] = useState(null)
  const [errors, setErrors] = useState([])
  const [success, setSuccess] = useState(null)
  const [loading, setLoading] = useState(false)

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors([])
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return
    // Auto-fill filename and slug from the file name
    const name = file.name
    update('filename', name)
    if (!form.slug) {
      const slug = name.replace(/\.js$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      update('slug', slug)
    }
    const reader = new FileReader()
    reader.onload = () => setFileContent(reader.result)
    reader.readAsText(file)
  }

  // Auto-detect hosting provider hint from the download_url
  const hostingHint = (() => {
    if (!form.download_url) return null
    const provider = getHostingProvider({ download_url: form.download_url })
    if (provider === 'github') return 'Detected: raw GitHub endpoint (MIT/Apache)'
    if (provider === 'huggingface') return 'Detected: Hugging Face repository (ARR)'
    return null
  })()

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (storageMode === 'gitea') {
      // Gitea mode: validate without download_url (server generates it)
      const formForValidation = { ...form, download_url: 'https://gitea.local/placeholder' }
      const validation = validateModEntry(formForValidation)
      if (!validation.valid) {
        setErrors(validation.errors)
        return
      }
      if (!fileContent) {
        setErrors(['Please select a .js file to upload to Gitea'])
        return
      }

      setLoading(true)
      setErrors([])
      try {
        const giteaResult = await createGiteaMod(form, fileContent)
        const result = await submitMod({ ...form, download_url: giteaResult.downloadUrl })
        if (result.success) {
          setSuccess(result.mod)
          onSubmitted?.(result.mod)
        } else {
          setErrors(result.errors)
        }
      } catch (err) {
        setErrors([err.message])
      } finally {
        setLoading(false)
      }
    } else {
      // External URL mode: validate with download_url
      const validation = validateModEntry(form)
      if (!validation.valid) {
        setErrors(validation.errors)
        return
      }

      setLoading(true)
      setErrors([])
      try {
        const result = await submitMod(form)
        if (result.success) {
          setSuccess(result.mod)
          onSubmitted?.(result.mod)
        } else {
          setErrors(result.errors)
        }
      } catch (err) {
        setErrors([err.message])
      } finally {
        setLoading(false)
      }
    }
  }

  const handleClose = () => {
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-surface-4">
          <div>
            <h2 className="text-xl font-bold text-content-primary">Upload a Mod</h2>
            <p className="text-sm text-content-secondary mt-0.5">
              Submit your Eaglercraft / EaglerForge mod to WASModrinth
            </p>
          </div>
          <button onClick={handleClose} className="btn-ghost p-2 rounded-lg">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round"/>
              <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {success ? (
          /* Success state */
          <div className="p-6 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-brand-green/15 flex items-center justify-center">
              <svg className="w-8 h-8 text-brand-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-content-primary">Mod Submitted!</h3>
              <p className="text-sm text-content-secondary mt-1">
                <span className="text-content-primary font-medium">{success.title}</span> has been registered
                {storageMode === 'gitea' && ' and pushed to a Gitea repository'}.
              </p>
            </div>
            <button onClick={onClose} className="btn-primary mx-auto">Done</button>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Errors */}
            {errors.length > 0 && (
              <div className="bg-accent-red/10 border border-accent-red/30 rounded-lg p-3 space-y-1">
                <p className="text-sm font-medium text-accent-red">Please fix the following:</p>
                <ul className="text-sm text-accent-red/90 list-disc list-inside space-y-0.5">
                  {errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Storage mode toggle */}
            <div>
              <label className="block text-xs font-bold text-content-secondary uppercase tracking-wide mb-1.5">
                Storage
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setStorageMode('gitea')}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    storageMode === 'gitea'
                      ? 'border-brand-green bg-brand-green/10'
                      : 'border-surface-4 hover:border-surface-5'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h18v18H3V3zm2 2v14h14V5H5z"/></svg>
                    <span className="text-sm font-bold text-content-primary">Gitea Repository</span>
                  </div>
                  <p className="text-xs text-content-secondary">Upload .js file — creates a Gitea repo automatically</p>
                </button>
                <button
                  type="button"
                  onClick={() => setStorageMode('external')}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    storageMode === 'external'
                      ? 'border-brand-green bg-brand-green/10'
                      : 'border-surface-4 hover:border-surface-5'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" strokeLinecap="round" strokeLinejoin="round"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    <span className="text-sm font-bold text-content-primary">External URL</span>
                  </div>
                  <p className="text-xs text-content-secondary">Provide a raw GitHub or Hugging Face link</p>
                </button>
              </div>
            </div>

            {/* File upload (Gitea mode only) */}
            {storageMode === 'gitea' && (
              <div>
                <label className="block text-xs font-bold text-content-secondary uppercase tracking-wide mb-1.5">
                  Mod File <span className="text-accent-orange normal-case">(.js required)</span>
                </label>
                <input
                  type="file"
                  accept=".js"
                  onChange={handleFileSelect}
                  className="block w-full text-sm text-content-secondary file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-surface-3 file:text-content-primary file:font-medium file:cursor-pointer hover:file:bg-surface-4 cursor-pointer"
                />
                {form.filename && (
                  <p className="text-xs text-brand-green mt-1">✓ Selected: {form.filename}</p>
                )}
              </div>
            )}

            {/* Slug + Title */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-content-secondary uppercase tracking-wide mb-1.5">
                  Slug
                </label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => update('slug', e.target.value)}
                  placeholder="my-awesome-mod"
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-content-secondary uppercase tracking-wide mb-1.5">
                  Title
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => update('title', e.target.value)}
                  placeholder="My Awesome Mod"
                  className="input w-full"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-content-secondary uppercase tracking-wide mb-1.5">
                Description
              </label>
              <textarea
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                placeholder="Describe what your mod does..."
                rows={3}
                className="input w-full resize-none"
              />
            </div>

            {/* Author + Version */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-content-secondary uppercase tracking-wide mb-1.5">
                  Author
                </label>
                <input
                  type="text"
                  value={form.author}
                  onChange={(e) => update('author', e.target.value)}
                  placeholder="YourName"
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-content-secondary uppercase tracking-wide mb-1.5">
                  Version
                </label>
                <input
                  type="text"
                  value={form.version}
                  onChange={(e) => update('version', e.target.value)}
                  placeholder="1.0.0"
                  className="input w-full"
                />
              </div>
            </div>

            {/* Category + License */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-content-secondary uppercase tracking-wide mb-1.5">
                  Category
                </label>
                <select
                  value={form.category}
                  onChange={(e) => update('category', e.target.value)}
                  className="input w-full"
                >
                  <option value="">Select...</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.icon} {cat.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-content-secondary uppercase tracking-wide mb-1.5">
                  License
                </label>
                <select
                  value={form.license}
                  onChange={(e) => update('license', e.target.value)}
                  className="input w-full"
                >
                  <option value="">Select...</option>
                  {Object.values(LICENSES).map((lic) => (
                    <option key={lic.id} value={lic.id}>{lic.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Filename (external mode only — in Gitea mode it's auto-filled from the file) */}
            {storageMode === 'external' && (
              <div>
                <label className="block text-xs font-bold text-content-secondary uppercase tracking-wide mb-1.5">
                  Filename <span className="text-accent-orange normal-case">(.js required)</span>
                </label>
                <input
                  type="text"
                  value={form.filename}
                  onChange={(e) => update('filename', e.target.value)}
                  placeholder="my-mod.js"
                  className={`input w-full ${
                    form.filename && !form.filename.endsWith('.js')
                      ? 'border-accent-red focus:border-accent-red focus:ring-accent-red'
                      : ''
                  }`}
                />
                {form.filename && !form.filename.endsWith('.js') && (
                  <p className="text-xs text-accent-red mt-1">
                    ⚠ Eaglercraft mods must have a .js extension
                  </p>
                )}
              </div>
            )}

            {/* Download URL (external mode only) */}
            {storageMode === 'external' && (
              <div>
                <label className="block text-xs font-bold text-content-secondary uppercase tracking-wide mb-1.5">
                  Download URL (absolute)
                </label>
                <input
                  type="text"
                  value={form.download_url}
                  onChange={(e) => update('download_url', e.target.value)}
                  placeholder="https://raw.githubusercontent.com/... or https://huggingface.co/..."
                  className="input w-full text-sm"
                />
                {hostingHint && (
                  <p className="text-xs text-brand-green mt-1">✓ {hostingHint}</p>
                )}
                <p className="text-xs text-content-secondary mt-1">
                  MIT/Apache mods → raw GitHub · ARR mods → Hugging Face
                </p>
              </div>
            )}

            {/* Icon URL (optional) */}
            <div>
              <label className="block text-xs font-bold text-content-secondary uppercase tracking-wide mb-1.5">
                Icon URL <span className="normal-case text-content-secondary/60">(optional)</span>
              </label>
              <input
                type="text"
                value={form.icon_url}
                onChange={(e) => update('icon_url', e.target.value)}
                placeholder="https://..."
                className="input w-full text-sm"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2 border-t border-surface-4">
              <button type="button" onClick={onClose} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
                {loading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round"/>
                    </svg>
                    {storageMode === 'gitea' ? 'Creating repo...' : 'Submitting...'}
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Submit Mod
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
