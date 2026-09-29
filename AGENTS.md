# AGENTS.md

## quintschat

Built from scratch (the original repo only contained a README and a product-spec `.docx` for
an Android app) as a web messenger that re-creates the described feature set: phone-number
signup, individual & group chat, real-time messaging, media sharing, status updates, presence,
and call UI.

## Architecture

Monorepo with npm workspaces:

- `server/` — Express + Socket.io + better-sqlite3. REST API under `/api`, live messaging via
  `/socket.io` websockets. SQLite DB persisted at `server/data/quintschat.db`.
- `frontend/` — Vite + React. Dev server on 5173.

## Running

`docker compose -f docker compose.base44.yml up -d`

Two services (single-origin wiring via Vite proxy):

- `server` on internal port 8080.
- `web` (Vite) exposed on host port 3000. Vite proxies `/api` and `/socket.io` to
  `http://server:8080` so the browser only talks to one origin.

Live reload: server uses `node --watch`; frontend uses Vite HMR. Both auto-restart on edits.

## Backend gotchas

- **Route order matters**: `/api/user/all` must be declared BEFORE `/api/user/:phoneNumber` in
  `server/src/index.js`, otherwise "all" is matched as a phone number.
- `Store` auto-seeds 4 demo contacts on construction so the Contacts/Status tabs always have
  people to message.
- The server container is `node:22` with the whole repo bind-mounted at `/app`; npm installs run
  on container startup (lockfile-preserving).

## Verify it works

- Health: `curl localhost:3000/api/health` → `{"ok":true}`
- Contacts seeded: `curl localhost:3000/api/user/all`
- Chat creation: `POST /api/chats/individual` with `{userId, otherId}`
- Groups: `POST /api/groups` with `{name, memberIds, createdBy}`
- In the UI: login with any phone + name → Contacts tab → pick someone → send a message.