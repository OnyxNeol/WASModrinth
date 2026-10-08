import { CATEGORIES, LICENSES, MOD_STATUSES } from '../data/constants.js'
import { formatDownloads, getHostingProvider } from '../data/manifest.js'

/**
 * ModCard — adapts Modrinth's mod card layout: icon, title, description,
 * author, download count, license badge, and category badge in a rounded card.
 */
export default function ModCard({ mod, onClick }) {
  const license = LICENSES[mod.license]
  const category = CATEGORIES.find((c) => c.id === mod.category)
  const status = MOD_STATUSES[mod.status]
  const hosting = getHostingProvider(mod)

  return (
    <div
      className="card card-hover p-4 cursor-pointer flex flex-col gap-3"
      onClick={() => onClick?.(mod)}
    >
      {/* Header: icon + title + author */}
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-surface-3 flex-shrink-0 flex items-center justify-center">
          {mod.icon_url ? (
            <img src={mod.icon_url} alt={mod.title} className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl">{category?.icon ?? '📦'}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-content-primary text-base truncate leading-tight">
            {mod.title}
          </h3>
          <p className="text-xs text-content-secondary mt-0.5">by {mod.author}</p>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-content-default line-clamp-2 leading-relaxed">
        {mod.description}
      </p>

      {/* Badges */}
      <div className="flex flex-wrap items-center gap-1.5">
        {license && <span className={license.badgeClass}>{license.short}</span>}
        {category && (
          <span className="badge-gray">
            {category.icon} {category.label}
          </span>
        )}
        {hosting === 'github' && <span className="badge-blue">GitHub</span>}
        {hosting === 'huggingface' && <span className="badge-purple">HF</span>}
      </div>

      {/* Footer: downloads + version */}
      <div className="flex items-center justify-between text-xs text-content-secondary mt-auto pt-2 border-t border-divider">
        <span className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round"/>
            <polyline points="7 10 12 15 17 10" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="12" y1="15" x2="12" y2="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {formatDownloads(mod.downloads ?? 0)}
        </span>
        <span>v{mod.version ?? '—'}</span>
      </div>
    </div>
  )
}
