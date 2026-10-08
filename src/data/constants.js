// Modrinth-style license categories for the WASModrinth mod repository.
// MIT mods pull from raw GitHub; All Rights Reserved mods pull from Hugging Face.
export const LICENSES = {
  MIT: {
    id: 'MIT',
    label: 'MIT',
    short: 'MIT',
    hosting: 'github',
    badgeClass: 'badge-green',
  },
  ARR: {
    id: 'ARR',
    label: 'All Rights Reserved',
    short: 'ARR',
    hosting: 'huggingface',
    badgeClass: 'badge-red',
  },
  APACHE: {
    id: 'APACHE',
    label: 'Apache 2.0',
    short: 'Apache',
    hosting: 'github',
    badgeClass: 'badge-blue',
  },
}

export const CATEGORIES = [
  { id: 'eaglerforge', label: 'EaglerForge', icon: '🔧' },
  { id: 'eaglercraft', label: 'Eaglercraft', icon: '🦅' },
  { id: 'wasm', label: 'WebAssembly', icon: '⚡' },
  { id: 'utility', label: 'Utility', icon: '🛠️' },
  { id: 'cosmetic', label: 'Cosmetic', icon: '🎨' },
  { id: 'game-mechanic', label: 'Game Mechanic', icon: '⚙️' },
  { id: 'library', label: 'Library', icon: '📚' },
  { id: 'world', label: 'World', icon: '🌍' },
]

export const MOD_STATUSES = {
  approved: { label: 'Approved', badgeClass: 'badge-green' },
  pending: { label: 'Pending', badgeClass: 'badge-gray' },
  draft: { label: 'Draft', badgeClass: 'badge-gray' },
}
