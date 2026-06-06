# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Start server
npm start               # node server.js

# Development (hot reload)
npx nodemon server.js
```

No test suite exists yet.

## Architecture

ES Modules throughout (`"type": "module"` in package.json). Top-level `await` is used in several files — `utils/db.js` connects to MongoDB and creates indexes at import time; `directories.js` creates the uploads dir at import time. Import order in `server.js` matters: `env.js` must be first (loads dotenv), then `db.js` (uses env vars).

### Entry points

- **`server.js`** — Express app + Socket.io server setup. Registers all middleware, mounts routes under `/api`, wires WebSocket auth and event handlers.
- **`websocket.js`** — `ConnectionManager` singleton. Holds `activeConnections: Map<userId, socket>` and `userStatus: Map<userId, status>` in memory. All real-time broadcasts go through this.
- **`socketEvents.js`** — Enum of all Socket.io event name strings, imported wherever events are emitted or listened to.

### Key utilities

| File | Purpose |
|------|---------|
| `utils/db.js` | Mongoose models (`User`, `Chat`, `Message`, `Cluster`, `ClusterMessage`, `Invitation`), MongoDB index creation, shared projection constants |
| `utils/auth.js` | JWT `generateToken`/`verifyToken`, `authenticate` Express middleware (populates `req.user`) |
| `utils/schemas.js` | All Mongoose schema definitions |
| `utils/cryption.js` | AES-256-GCM encrypt/decrypt, SHA-256 `hashRecoveryPhrase` |
| `utils/limiters.js` | Global rate limiter (100 req/min via `rate-limiter-flexible`) + auth limiter (55 req/15 min via `express-rate-limit`) |
| `utils/upload.js` | Multer config, `ALLOWED_IMAGE_TYPES`, `upload` middleware |
| `directories.js` | `UPLOAD_DIR` path, ensures directory exists |

### Data model notes

- **Disappearing messages**: `expires_at` field with MongoDB TTL index (`expires: 0`). Set per-message on send or inherited from chat/topic `disappearing_minutes`. `VALID_EXPIRING_MESSAGE_TIMERS = [1, 5, 30, 60, 1440, 10080]` (minutes).
- **Clusters vs Chats**: Clusters are group chats with topics (sub-channels). Each cluster has an embedded `topics[]` array. Messages go to `ClusterMessage` collection scoped by `cluster_id` + `topic_id`.
- **Status**: `VALID_STATUSES = ["online", "away", "dnd", "invisible", "offline"]`. Invisible status suppresses WebSocket broadcasts.
- **Recovery**: BIP-39 12-word mnemonic generated at registration, SHA-256 hashed and stored. Used to reset password.
- **Reactions**: `Map<emoji, [userId]>` on both `Message` and `ClusterMessage`. Updated with `$addToSet`/`$pull`.

### Route structure

All routes mounted under `/api`:

| Prefix | File |
|--------|------|
| `/auth` | `authRoutes.js` |
| `/users` | `usersRoutes.js` |
| `/chats` | `chatsRoutes.js` |
| `/messages` | `messagesRoutes.js` |
| `/clusters` | `clustersRoutes.js` |
| `/clusterMessages` | `clusterMessagesRoutes.js` |
| `/invitations` | `invitationsRoutes.js` |

File serving: `GET /api/files/:file_id` is defined inline in `server.js`.

### WebSocket flow

1. Socket.io middleware in `server.js` verifies JWT from `socket.handshake.auth.token`, attaches `socket.userId`.
2. On `connection`, calls `websocketManager.connect(socket, userId)` — stores socket, broadcasts `status_update: online` to all shared-chat participants.
3. Routes that need to push real-time events import `websocketManager` directly and call `broadcastToChat`, `sendPersonalMessage`, or `broadcastStatus`.

## Environment variables

```
MONGO_URL        MongoDB connection string (required)
JWT_SECRET       JWT signing key (auto-generated random if missing — sessions won't survive restarts)
ENCRYPTION_KEY   16-byte hex key for AES-256-GCM (auto-generated if missing)
CORS_ORIGINS     Comma-separated allowed origins (defaults to *)
PORT             Listen port (default 3000)
```

See `.example.env` for reference values.
