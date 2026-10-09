import { CATEGORIES, LICENSES } from '../data/constants.js'

/**
 * Sidebar — adapts Modrinth's left filter sidebar with category and license filters.
 */
export default function Sidebar({ selectedCategory, selectedLicense, onCategoryChange, onLicenseChange }) {
  return (
    <aside className="w-full md:w-56 flex-shrink-0 space-y-6">
      {/* Categories */}
      <div>
        <h3 className="text-xs font-bold text-content-secondary uppercase tracking-wide mb-3">
          Categories
        </h3>
        <div className="space-y-1">
          <button
            onClick={() => onCategoryChange(null)}
            className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-all ${
              !selectedCategory
                ? 'bg-surface-3 text-content-primary font-medium'
                : 'text-content-secondary hover:bg-surface-2 hover:text-content-default'
            }`}
          >
            All
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onCategoryChange(cat.id)}
              className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-all ${
                selectedCategory === cat.id
                  ? 'bg-surface-3 text-content-primary font-medium'
                  : 'text-content-secondary hover:bg-surface-2 hover:text-content-default'
              }`}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* License / Hosting */}
      <div>
        <h3 className="text-xs font-bold text-content-secondary uppercase tracking-wide mb-3">
          License
        </h3>
        <div className="space-y-1">
          <button
            onClick={() => onLicenseChange(null)}
            className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-all ${
              !selectedLicense
                ? 'bg-surface-3 text-content-primary font-medium'
                : 'text-content-secondary hover:bg-surface-2 hover:text-content-default'
            }`}
          >
            All
          </button>
          {Object.values(LICENSES).map((lic) => (
            <button
              key={lic.id}
              onClick={() => onLicenseChange(lic.id)}
              className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-all ${
                selectedLicense === lic.id
                  ? 'bg-surface-3 text-content-primary font-medium'
                  : 'text-content-secondary hover:bg-surface-2 hover:text-content-default'
              }`}
            >
              {lic.label}
            </button>
          ))}
        </div>
      </div>
    </aside>
  )
}
