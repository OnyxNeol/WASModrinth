import { useState } from 'react'
import { CATEGORIES, LICENSES } from '../data/constants.js'
import { validateModEntry, submitMod, getHostingProvider } from '../data/manifest.js'

/**
 * SubmitModal — adapts Modrinth's mod submission workflow with a form modal
 * that performs client-side .js file extension checks and schema validation
 * before registering entries in the manifest store.
 */
export default function SubmitModal({ onClose, onSubmitted }) {
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
  const [errors, setErrors] = useState([])
  const [success, setSuccess] = useState(null)

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors([])
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
    const validation = validateModEntry(form)
    if (!validation.valid) {
      setErrors(validation.errors)
      return
    }

    const result = await submitMod(form)
    if (result.success) {
      setSuccess(result.mod)
      onSubmitted?.(result.mod)
    } else {
      setErrors(result.errors)
    }
  }

  const handleClose = () => {
    if (success) {
      onClose()
    } else {
      onClose()
    }
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
                <span className="text-content-primary font-medium">{success.title}</span> has been registered.
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
                  onChange={(e) => {
                    update('license', e.target.value)
                    // Provide a URL template hint based on license hosting
                    const lic = LICENSES[e.target.value]
                    if (lic && !form.download_url) {
                      if (lic.hosting === 'github') {
                        update('download_url', 'https://raw.githubusercontent.com/owner/repo/main/dist/mod.js')
                      } else if (lic.hosting === 'huggingface') {
                        update('download_url', 'https://huggingface.co/owner/repo/resolve/main/dist/mod.js')
                      }
                    }
                  }}
                  className="input w-full"
                >
                  <option value="">Select...</option>
                  {Object.values(LICENSES).map((lic) => (
                    <option key={lic.id} value={lic.id}>{lic.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Filename (.js check) */}
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

            {/* Download URL (dual-hosting) */}
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
              <button type="submit" className="btn-primary">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Submit Mod
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
