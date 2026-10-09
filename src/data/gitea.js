// Frontend API client for Gitea integration endpoints (served by the auth server).

const API_BASE = import.meta.env.VITE_API_URL || ''

/** Search/list repos on the Gitea instance. */
export async function fetchGiteaRepos(query) {
  const q = query ? `?q=${encodeURIComponent(query)}` : ''
  const res = await fetch(`${API_BASE}/api/gitea/repos${q}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to fetch repos')
  return data.repos || []
}

/** Get file listing for a repo path. */
export async function getRepoContents(owner, repo, path = '') {
  const p = path ? `?path=${encodeURIComponent(path)}` : ''
  const res = await fetch(`${API_BASE}/api/gitea/repos/${owner}/${repo}/contents${p}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to fetch contents')
  return data.contents || []
}

/** Create a Gitea repo with the mod file. Returns { repo, downloadUrl }. */
export async function createGiteaMod(mod, fileContent) {
  const res = await fetch(`${API_BASE}/api/gitea/create-mod`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mod, fileContent }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to create mod repo')
  return data
}
