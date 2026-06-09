# CLAUDE.md

Guidance for Claude Code when working in this monorepo.

## Structure

```
cipher-chat/
├── web/      # React 19 SPA (TypeScript, Vite, Tailwind CSS)
├── server/   # Node.js API (Express, Socket.io, MongoDB)
├── package.json   # npm workspaces root
└── CLAUDE.md      # this file
```

Per-app guidance lives in each workspace:
- **Frontend**: [`web/CLAUDE.md`](web/CLAUDE.md)
- **Backend**: [`server/CLAUDE.md`](server/CLAUDE.md)

## Commands

```bash
# Install all workspace deps from root
npm install

# Frontend
npm run dev:web          # dev server → http://localhost:5173
npm run build:web        # production build
npm run lint:web         # eslint

# Backend (Windows)
npm run dev:server       # development, loads server/.env.dev → http://localhost:8001

# Or cd into workspace and use native scripts
cd web && npm run dev
cd server && npm run dev:win    # Windows
cd server && npm run dev:mac    # macOS / Linux
```

No test suite exists in either workspace yet.

## Environment

Both workspaces need their own `.env` files:

| File | App | Copy from |
|------|-----|-----------|
| `web/.env` | Frontend | `web/.env.example` |
| `server/.env.dev` | Backend (dev) | `server/.example.env` |
| `server/.env` | Backend (prod) | `server/.example.env` |

Key variables:
- `web`: `VITE_BACKEND_URL` — points to backend base URL (e.g. `http://localhost:8001`)
- `server`: `MONGO_URL`, `DB_NAME`, `JWT_SECRET`, `ENCRYPTION_KEY`, `CORS_ORIGINS`, `PORT`

## Workspaces

npm workspaces shares `node_modules` between apps. Each workspace still has its own `package.json` and its own scripts. Running `npm install` from root is enough — no need to `cd` into each app.

## Key facts

- Messages are **end-to-end encrypted**: server never sees plaintext. Crypto logic lives in `web/src/services/CryptoService.ts` and `web/src/services/KeyService.ts`.
- Backend is **pure ES Modules** (`"type": "module"`). Import order in `server/server.js` matters — `env.js` must load first.
- No shared code between `web/` and `server/` — they communicate only via REST + WebSocket.
