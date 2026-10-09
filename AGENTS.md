# WASModrinth — Base44 Development Notes

## Project Overview
WASModrinth is a Modrinth-style mod repository for Eaglercraft, built with Vite + React (frontend) and Express (auth backend).

## Architecture
- **web** (port 3000 → 5173 inside): Vite dev server serving the React SPA.
- **auth** (port 3001): Express server handling email verification via Resend API.
- The frontend calls the auth API at `VITE_API_URL`, which is set to the public URL of port 3001 (`https://3001-${BASE44_PUBLIC_HOST_SUFFIX}`).

## Setup
```
docker compose -f docker-compose.base44.yml up -d --build
```
Both services auto-install dependencies on startup via `npm install` then run the dev command.

## Secrets
- `RESEND_API_KEY` — Resend API key for sending verification emails. Optional: without it, verification codes are returned in the API response (dev mode). A generated placeholder is present for development.
- `RESEND_FROM_EMAIL` — From-email for Resend. Optional, defaults to Resend's onboarding@resend.dev testing sender.

## Verification
- Frontend: `curl http://localhost:3000/` should return the Vite-served HTML.
- Auth: `curl http://localhost:3001/` should return `{"status":"ok"}`.
- Preview: the homepage renders with a header, sidebar filters, and a grid of mod cards from `public/manifest.json`.

## Key Files
- `src/App.jsx` — main app component with routing via react-router-dom.
- `src/data/manifest.js` — fetches and validates the mod manifest from `/manifest.json`.
- `src/data/auth.js` — client-side auth functions calling the Express backend.
- `server/index.js` — Express auth server with Resend email integration.
- `public/manifest.json` — the mod database (29 real mod entries).
