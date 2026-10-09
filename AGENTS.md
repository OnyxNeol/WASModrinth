# WASModrinth — Base44 Dev Environment

## Stack
- **Frontend**: Vite + React + Tailwind CSS (port 3000 → 5173 inside container)
- **Auth server**: Express + SQLite + bcrypt (port 3001, `server/index.js`)
- **Gitea**: Self-hosted Git instance for mod repo hosting (port 3002 → 3000 inside container)

## Services (docker-compose.base44.yml)
- `web` — Vite dev server, proxies `/api` to the auth server via `AUTH_PROXY_TARGET`
- `auth` — Express API server with SQLite DB volume; talks to Gitea via basic auth
- `gitea` — Gitea with SQLite storage; auto-creates admin user via `gitea-init` one-shot service
- `gitea-init` — One-shot service that creates the `wasmodrinth` admin user; runs as UID 1000

## Gitea Integration
- Admin credentials: `wasmodrinth` / `gitea_admin_123` (set in compose `environment:`)
- The auth server proxies all Gitea API operations — the frontend never talks to Gitea directly
- Submitting a mod with "Gitea Repository" mode creates a real Gitea repo with the .js file
- The "Gitea" nav link lets users browse repos and import .js files as mods
- Raw file downloads are proxied through `/api/gitea/raw/:owner/:repo/:branch/*`

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
- `curl http://localhost:3001/` — auth server health
- `curl http://localhost:3000/api/gitea/repos` — Gitea repo list (proxied)
- `curl http://localhost:3002/api/v1/version` — Gitea health (direct)
