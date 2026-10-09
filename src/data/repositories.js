// Frontend API client for the native WASModrinth repository system.
// Repositories are created and managed in-platform — no external Git hosting required.

const API_BASE = import.meta.env.VITE_API_URL || ''

import { getAuthToken } from './auth.js'

function authHeaders() {
  const token = getAuthToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/** List all repositories. */
export async function fetchRepos() {
  const res = await fetch(`${API_BASE}/api/repos`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to fetch repositories')
  return data.repos || []
}

/** Get a single repository with its file listing. */
export async function fetchRepo(slug) {
  const res = await fetch(`${API_BASE}/api/repos/${slug}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to fetch repository')
  return data
}

/** Create a new repository. The logged-in user becomes the owner. */
export async function createRepo(repoData) {
  const res = await fetch(`${API_BASE}/api/repos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(repoData),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to create repository')
  return data
}

/** Upload a file (base64 content) to a repository. Owner only. */
export async function uploadFile(slug, filename, base64Content) {
  const res = await fetch(`${API_BASE}/api/repos/${slug}/files`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ filename, content: base64Content }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to upload file')
  return data
}

/** Update repository metadata. Owner only. */
export async function updateRepo(slug, updates) {
  const res = await fetch(`${API_BASE}/api/repos/${slug}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(updates),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to update repository')
  return data
}

/** Delete a file from a repository. Owner only. */
export async function deleteFile(slug, filename) {
  const res = await fetch(`${API_BASE}/api/repos/${slug}/files/${encodeURIComponent(filename)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to delete file')
  return data
}
