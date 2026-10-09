// Gitea API client for WASModrinth
// Handles repo creation, file browsing, and raw file access via the Gitea REST API.

const GITEA_URL = process.env.GITEA_URL || 'http://gitea:3000'
const GITEA_USER = process.env.GITEA_ADMIN_USER || 'wasmodrinth'
const GITEA_PASS = process.env.GITEA_ADMIN_PASS || 'gitea_admin_123'

function authHeader() {
  return 'Basic ' + Buffer.from(`${GITEA_USER}:${GITEA_PASS}`).toString('base64')
}

async function giteaApi(path, options = {}) {
  return fetch(`${GITEA_URL}/api/v1${path}`, {
    ...options,
    headers: {
      'Authorization': authHeader(),
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
}

/** Search/list repos on the Gitea instance. */
export async function searchRepos(query) {
  const q = query ? `&q=${encodeURIComponent(query)}` : ''
  const res = await giteaApi(`/repos/search?limit=50${q}`)
  if (!res.ok) throw new Error(`Gitea search failed: ${res.status}`)
  const data = await res.json()
  return data.data || []
}

/** Get contents (file listing) of a repo path. */
export async function getRepoContents(owner, repo, path = '') {
  const p = path ? encodeURIComponent(path) : ''
  const res = await giteaApi(`/repos/${owner}/${repo}/contents/${p}`)
  if (!res.ok) throw new Error(`Gitea contents failed: ${res.status}`)
  return res.json()
}

/** Create a new repo, push the mod .js file and a README, return the download URL. */
export async function createModRepo(modData, fileContent) {
  // 1. Create the repository
  const repoRes = await giteaApi('/user/repos', {
    method: 'POST',
    body: JSON.stringify({
      name: modData.slug,
      description: (modData.description || modData.title || '').slice(0, 255),
      private: false,
      auto_init: true,
      default_branch: 'main',
    }),
  })
  if (!repoRes.ok) {
    const err = await repoRes.json().catch(() => ({}))
    throw new Error(err.message || `Failed to create repository (${repoRes.status})`)
  }
  const repo = await repoRes.json()

  // 2. Push the mod .js file
  const fileRes = await giteaApi(`/repos/${GITEA_USER}/${modData.slug}/contents/${modData.filename}`, {
    method: 'POST',
    body: JSON.stringify({
      content: Buffer.from(fileContent).toString('base64'),
      message: `Add ${modData.filename}`,
    }),
  })
  if (!fileRes.ok) {
    const err = await fileRes.json().catch(() => ({}))
    throw new Error(err.message || `Failed to upload mod file (${fileRes.status})`)
  }

  // 3. Push a README with mod metadata (non-critical)
  const readme = `# ${modData.title}\n\n${modData.description}\n\n## Metadata\n- **Author:** ${modData.author}\n- **Version:** ${modData.version || '1.0.0'}\n- **License:** ${modData.license}\n- **Category:** ${modData.category}\n`
  await giteaApi(`/repos/${GITEA_USER}/${modData.slug}/contents/README.md`, {
    method: 'POST',
    body: JSON.stringify({
      content: Buffer.from(readme).toString('base64'),
      message: 'Add README',
    }),
  }).catch(() => {})

  // 4. Return the download URL (proxied through the auth server)
  const downloadUrl = `/api/gitea/raw/${GITEA_USER}/${modData.slug}/main/${modData.filename}`
  return { repo, downloadUrl }
}

/** Fetch a raw file from Gitea for proxy streaming. */
export async function streamRawFile(owner, repo, branch, filepath) {
  return fetch(`${GITEA_URL}/${owner}/${repo}/raw/branch/${branch}/${filepath}`, {
    headers: { 'Authorization': authHeader() },
  })
}
