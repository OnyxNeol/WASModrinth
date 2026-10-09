import { CATEGORIES } from '../data/constants.js'

/**
 * CategoriesPage — grid of all mod categories in Modrinth card style.
 */
export default function CategoriesPage({ mods, onCategorySelect, onNavigate }) {
  const counts = mods.reduce((acc, mod) => {
    acc[mod.category] = (acc[mod.category] || 0) + 1
    return acc
  }, {})

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-extrabold text-content-primary mb-6">Categories</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => {
              onCategorySelect(cat.id)
              onNavigate('/')
            }}
            className="card card-hover p-5 flex flex-col items-center gap-2 text-center"
          >
            <span className="text-3xl">{cat.icon}</span>
            <span className="font-bold text-content-primary">{cat.label}</span>
            <span className="text-xs text-content-secondary">{counts[cat.id] ?? 0} mods</span>
          </button>
        ))}
      </div>
    </div>
  )
}
