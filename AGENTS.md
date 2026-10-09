# WASModrinth — Base44 Dev Environment

## Stack
- **Frontend**: Vite + React + Tailwind CSS (port 3000 → 5173 inside container)
- **Auth/Repo server**: Express + SQLite + bcrypt (port 3001, `server/index.js`)

## Services (docker-compose.base44.yml)
- `web` — Vite dev server, proxies `/api` to the auth server via `AUTH_PROXY_TARGET`
- `auth` — Express API server with SQLite DB volume; handles auth + native repository CRUD

## Native Repository System
- Repositories are stored in SQLite (`repositories` + `repository_files` tables)
- The logged-in user is automatically the repository owner with full edit/manage permissions
- File uploads support `.js` (Eaglercraft mods) and `.epk` (Eaglerpack archives)
- Files are stored as BLOBs in SQLite and served via `/api/repos/:slug/files/:filename`
- The "Repos" nav link lets users browse repositories and import files as mods
- Submitting a mod with "Native Repository" mode creates a repo and uploads the file in one flow

## Dual-Hosting Manifest Integration
- The app fetches `public/manifest.json` at runtime — the centralized mod database
- Manifest entries use absolute `download_url` paths for:
  - Open-source mods → raw GitHub endpoints (`https://raw.githubusercontent.com/...`)
  - Private/ARR mods → Hugging Face repositories (`https://huggingface.co/.../resolve/main/...`)
- Native repos use relative paths (`/api/repos/:slug/files/:filename`) proxied through the auth server

## Auth Flow
- Sign-up sends a 6-digit code via Resend (or dev mode if Resend fails)
- Codes are stored in-memory and reused across resend requests (valid 10 min)
- Email addresses are normalized to lowercase
- Sessions use random tokens stored in SQLite

## Secrets
- `RESEND_API_KEY` — Optional; without it, verification codes are returned in the API response
- `RESEND_FROM_EMAIL` — Optional; defaults to Resend's testing sender
- Both delivered via `/run/base44/app.env`

## Verification
- `curl http://localhost:3000/` — frontend
- `curl http://localhost:3001/` — auth/repo server health
- `curl http://localhost:3000/api/repos` — repository list (proxied)
