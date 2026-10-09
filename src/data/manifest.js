// Centralized manifest database — the single source of truth for WASModrinth mods.
// The frontend fetches this manifest at runtime and resolves download URLs based on
// each mod's license type (MIT → raw GitHub, ARR → Hugging Face repositories).

const DEFAULT_MANIFEST_URL = '/manifest.json'

// In-memory store so user-submitted mods persist for the session.
let localMods = []

/**
 * Fetch and parse the centralized manifest.json database.
 * Returns an array of normalized mod entries.
 */
export async function fetchManifest(manifestUrl = DEFAULT_MANIFEST_URL) {
  try {
    const res = await fetch(manifestUrl)
    if (!res.ok) {
      console.warn(`[WASModrinth] manifest fetch returned ${res.status}, using local mods only`)
      return [...localMods]
    }
    const data = await res.json()
    const remoteMods = Array.isArray(data) ? data : data.mods ?? []
    return [...remoteMods, ...localMods]
  } catch (err) {
    console.warn('[WASModrinth] manifest fetch failed, using local mods only:', err.message)
    return [...localMods]
  }
}

/**
 * Resolve a download URL based on the mod's license / hosting strategy.
 *
 * MIT / Apache (open-source) mods use absolute `download_url` paths that point
 * directly to raw GitHub endpoints:
 *   https://raw.githubusercontent.com/<owner>/<repo>/<ref>/<path>
 *
 * All Rights Reserved mods use absolute `download_url` paths that point to
 * Hugging Face repository file endpoints:
 *   https://huggingface.co/<repo>/resolve/main/<path>
 *
 * Both are absolute URLs stored in the manifest — the handler simply opens
 * whichever `download_url` the mod entry provides, so dual-hosting is seamless.
 */
export function resolveDownloadUrl(mod) {
  if (!mod.download_url) return null
  // Relative paths (native repos proxied through the auth server)
  if (mod.download_url.startsWith('/')) {
    return mod.download_url
  }
  // The manifest stores fully-qualified absolute URLs for both hosting providers.
  try {
    const url = new URL(mod.download_url)
    if (url.protocol === 'https:' || url.protocol === 'http:') {
      return mod.download_url
    }
  } catch {
    // not a valid absolute URL
  }
  return null
}

/**
 * Determine hosting provider from the download_url domain.
 */
export function getHostingProvider(mod) {
  if (!mod.download_url) return 'unknown'
  // Native repos are relative paths proxied through the auth server
  if (mod.download_url.startsWith('/api/repos/')) {
    return 'native'
  }
  try {
    const host = new URL(mod.download_url).hostname
    if (host === 'raw.githubusercontent.com' || host.endsWith('.githubusercontent.com')) {
      return 'github'
    }
    if (host === 'huggingface.co' || host.endsWith('.huggingface.co')) {
      return 'huggingface'
    }
  } catch {
    // ignore
  }
  return 'unknown'
}

/**
 * Add a user-submitted mod to the in-memory store.
 * Validates the entry against the mod schema before registering.
 */
export async function submitMod(entry) {
  const validated = validateModEntry(entry)
  if (!validated.valid) {
    return { success: false, errors: validated.errors }
  }
  const newMod = {
    ...entry,
    id: entry.slug || crypto.randomUUID(),
    status: 'approved',
    downloads: 0,
    created_at: new Date().toISOString(),
  }
  localMods = [newMod, ...localMods]
  return { success: true, mod: newMod }
}

/**
 * Schema validation for mod entries before registration.
 * Enforces required fields and .js file extension for Eaglercraft mods.
 */
export function validateModEntry(entry) {
  const errors = []

  if (!entry.slug || entry.slug.trim().length < 3) {
    errors.push('Slug must be at least 3 characters')
  }
  if (!entry.slug || !/^[a-z0-9-]+$/.test(entry.slug)) {
    errors.push('Slug must be lowercase with only letters, numbers, and hyphens')
  }
  if (!entry.title || entry.title.trim().length < 3) {
    errors.push('Title must be at least 3 characters')
  }
  if (!entry.description || entry.description.trim().length < 10) {
    errors.push('Description must be at least 10 characters')
  }
  if (!entry.author || entry.author.trim().length < 1) {
    errors.push('Author is required')
  }
  if (!entry.category) {
    errors.push('Category is required')
  }
  if (!entry.license) {
    errors.push('License is required')
  }

  // Client-side file extension check — .js mods and .epk Eaglerpacks supported
  if (!entry.filename || !entry.filename.trim()) {
    errors.push('Filename is required')
  } else {
    const ext = entry.filename.split('.').pop().toLowerCase()
    if (!['js', 'epk'].includes(ext)) {
      errors.push('File must have a .js or .epk extension — Eaglercraft mods are .js files, Eaglerpacks are .epk files')
    }
  }

  // download_url must be an absolute URL (raw GitHub or Hugging Face)
  if (!entry.download_url || entry.download_url.trim() === '') {
    errors.push('Download URL is required')
  } else {
    try {
      const url = new URL(entry.download_url)
      if (url.protocol !== 'https:' && url.protocol !== 'http:') {
        errors.push('Download URL must use http or https protocol')
      }
    } catch {
      errors.push('Download URL must be a valid absolute URL')
    }
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Format download counts in Modrinth's style (1.2k, 34.5k, 1.2M).
 */
export function formatDownloads(count) {
  if (count >= 1_000_000) return (count / 1_000_000).toFixed(1) + 'M'
  if (count >= 1_000) return (count / 1_000).toFixed(1) + 'k'
  return String(count)
}
