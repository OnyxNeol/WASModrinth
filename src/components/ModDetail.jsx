import { LICENSES, CATEGORIES, MOD_STATUSES } from '../data/constants.js'
import { resolveDownloadUrl, getHostingProvider, formatDownloads } from '../data/manifest.js'

/**
 * ModDetail — adapts Modrinth's mod detail page with full description,
 * metadata sidebar, and dual-hosting download button.
 */
export default function ModDetail({ mod, onNavigate }) {
  const license = LICENSES[mod.license]
  const category = CATEGORIES.find((c) => c.id === mod.category)
  const status = MOD_STATUSES[mod.status]
  const downloadUrl = resolveDownloadUrl(mod)
  const hosting = getHostingProvider(mod)

  const handleDownload = () => {
    if (downloadUrl) {
      window.open(downloadUrl, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Back */}
      <button onClick={() => onNavigate('/')} className="btn-ghost mb-4">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Back to Mods
      </button>

      {/* Header */}
      <div className="card p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 rounded-xl overflow-hidden bg-surface-3 flex-shrink-0 flex items-center justify-center">
            {mod.icon_url ? (
              <img src={mod.icon_url} alt={mod.title} className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl">{category?.icon ?? '📦'}</span>
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-extrabold text-content-primary">{mod.title}</h1>
            <p className="text-sm text-content-secondary mt-1">by {mod.author}</p>
            <div className="flex flex-wrap items-center gap-1.5 mt-3">
              {license && <span className={license.badgeClass}>{license.label}</span>}
              {category && (
                <span className="badge-gray">{category.icon} {category.label}</span>
              )}
              {hosting === 'github' && <span className="badge-blue">GitHub</span>}
              {hosting === 'huggingface' && <span className="badge-purple">Hugging Face</span>}
              {hosting === 'gitea' && <span className="badge-green">Gitea</span>}
              {status && <span className={status.badgeClass}>{status.label}</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="card p-6">
            <h2 className="text-lg font-bold text-content-primary mb-3">About</h2>
            <p className="text-content-default leading-relaxed">{mod.description}</p>
          </div>

          {/* Download section */}
          <div className="card p-6">
            <h2 className="text-lg font-bold text-content-primary mb-3">Downloads</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-surface-3 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-content-primary">{mod.filename}</p>
                  <p className="text-xs text-content-secondary mt-0.5">v{mod.version}</p>
                </div>
                <button
                  onClick={handleDownload}
                  disabled={!downloadUrl}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round"/>
                    <polyline points="7 10 12 15 17 10" strokeLinecap="round" strokeLinejoin="round"/>
                    <line x1="12" y1="15" x2="12" y2="3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Download
                </button>
              </div>
              {downloadUrl && (
                <p className="text-xs text-content-secondary break-all">
                  Source: {hosting === 'github' ? 'raw.githubusercontent.com' : hosting === 'gitea' ? 'Gitea' : 'huggingface.co'} —{' '}
                  <a href={downloadUrl} target="_blank" rel="noopener noreferrer" className="text-content-link">
                    {downloadUrl}
                  </a>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="card p-4 space-y-3">
            <h3 className="text-sm font-bold text-content-primary">Info</h3>
            <div className="flex justify-between text-sm">
              <span className="text-content-secondary">Downloads</span>
              <span className="text-content-primary font-medium">{formatDownloads(mod.downloads ?? 0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-content-secondary">Followers</span>
              <span className="text-content-primary font-medium">{formatDownloads(mod.followers ?? 0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-content-secondary">Version</span>
              <span className="text-content-primary font-medium">{mod.version}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-content-secondary">License</span>
              <span className="text-content-primary font-medium">{license?.label ?? '—'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-content-secondary">Hosting</span>
              <span className="text-content-primary font-medium">
                {hosting === 'github' ? 'GitHub' : hosting === 'huggingface' ? 'Hugging Face' : hosting === 'gitea' ? 'Gitea' : '—'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-content-secondary">Created</span>
              <span className="text-content-primary font-medium">
                {new Date(mod.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
