# Cipher Chat Server

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue)](LICENSE)
[![ES Modules](https://img.shields.io/badge/ES-Modules-yellow)](https://nodejs.org/api/esm.html)

Real-time chat server with end-to-end encryption, file sharing, and cluster-based group chats. Built with Node.js, Express, Socket.io, and MongoDB.

## Features

- **JWT Authentication** — Register/login with 30-day tokens, 12-word BIP-39 recovery phrase
- **Private Chats** — One-on-one messaging
- **Cluster Chats** — Group chats with topic-based channels
- **End-to-End Encryption** — Per-member RSA-OAEP envelope key distribution, AES-256-GCM message encryption
- **Key Rotation** — Conversation key rotates automatically on member removal
- **Real-time** — Instant delivery, typing indicators, and presence via Socket.io
- **File Sharing** — Image and file uploads (up to 100 MB)
- **Message Features** — Edit, delete, reactions, replies, disappearing messages
- **User Controls** — Status (online/away/DND/invisible), block/unblock
- **Server-side Encryption** — AES-256-GCM for stored files

## Tech Stack

- **Runtime**: Node.js 18+ (ES Modules)
- **Framework**: Express.js
- **Real-time**: Socket.io
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT + bcrypt
- **File Upload**: Multer
- **Encryption**: Node.js `crypto` module
- **Rate Limiting**: `express-rate-limit`, `rate-limiter-flexible`

## Prerequisites

- Node.js 18+
- MongoDB 6+

## Installation

1. Clone the repository

```bash
git clone https://github.com/SalvM/cipher-chat-server.git
cd cipher-chat-server
```

2. Install dependencies

```bash
npm install
```

3. Configure environment — copy `.example.env` and fill in values:

**Development (`.env.dev`):**
```env
MONGO_URL=mongodb://localhost:27017/cipherchat
DB_NAME=cipherchat
JWT_SECRET=your-super-secret-jwt-key-change-this
ENCRYPTION_KEY=your-encryption-key-16-bytes
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
PORT=8001
NODE_ENV=development
```

**Production (`.env`):**
```env
MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/?ssl=true
DB_NAME=cipherchat
JWT_SECRET=strong-random-secret
ENCRYPTION_KEY=strong-16-byte-hex-key
CORS_ORIGINS=https://yourdomain.com
PORT=3000
NODE_ENV=production
```

4. Start MongoDB (local or Atlas)

5. Run the server

```bash
# Development — loads .env.dev
npm run dev:win    # Windows
npm run dev:mac    # macOS / Linux

# Production — loads .env
npm start
```

## Project Structure

```
cipher-chat-server/
├── server.js              # Express + Socket.io entry point
├── env.js                 # Environment file loader
├── websocket.js           # ConnectionManager (real-time broadcast)
├── socketEvents.js        # Socket.io event name constants
├── directories.js         # Upload directory setup
├── startup.js             # Colored startup logging
├── routes/                # REST API route handlers
│   ├── authRoutes.js
│   ├── usersRoutes.js
│   ├── chatsRoutes.js
│   ├── messagesRoutes.js
│   ├── clustersRoutes.js
│   ├── clusterMessagesRoutes.js
│   ├── invitationsRoutes.js
│   └── keysRoutes.js
├── utils/
│   ├── db.js              # Mongoose models, indexes, constants
│   ├── schemas.js         # All Mongoose schema definitions
│   ├── auth.js            # JWT helpers + authenticate middleware
│   ├── cryption.js        # AES-256-GCM encrypt/decrypt, SHA-256
│   ├── limiters.js        # Rate limiters
│   └── upload.js          # Multer config
├── middlewares/
│   └── cors.js            # CORS options
└── uploads/               # Served file storage (auto-created)
```

## Architecture

```
Client (React / any)
     │
     ├─ REST ──▶ Express routes ──▶ MongoDB
     │                │
     └─ WebSocket ──▶ ConnectionManager ──▶ broadcast to participants
```

REST routes handle CRUD and then call `websocketManager` to push events to connected clients. WebSocket auth uses the same JWT as REST, passed in `socket.handshake.auth.token`. `ConnectionManager` holds `Map<userId, socket>` in memory — no Redis required for single-node deployments.

## API Endpoints

All routes are prefixed with `/api`. Protected routes require `Authorization: Bearer <token>`.

### Authentication
| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| POST | `/api/auth/register` | | Register new user, returns JWT + recovery phrase |
| POST | `/api/auth/login` | | Login, returns JWT |
| POST | `/api/auth/recover` | | Recover account with 12-word mnemonic |
| GET | `/api/auth/me` | ✓ | Get current user |
| PUT | `/api/auth/profile` | ✓ | Update display name, bio, avatar |
| PUT | `/api/auth/status` | ✓ | Update presence status |

### Users
| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| GET | `/api/users/search?username=...` | ✓ | Search users by username |
| GET | `/api/users/blocked` | ✓ | List blocked users |
| GET | `/api/users/:user_id` | ✓ | Get user by ID |
| POST | `/api/users/block` | ✓ | Block a user |
| DELETE | `/api/users/block/:user_id` | ✓ | Unblock a user |

### Chats
| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| GET | `/api/chats` | ✓ | Get all user chats |
| POST | `/api/chats` | ✓ | Create or fetch existing 1-on-1 chat |
| GET | `/api/chats/:chat_id` | ✓ | Get chat by ID |
| PUT | `/api/chats/:chat_id/settings` | ✓ | Update chat settings |
| GET | `/api/chats/:chat_id/messages` | ✓ | Get chat messages (paginated) |
| GET | `/api/chats/:chat_id/unread` | ✓ | Get unread message count |

### Messages
| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| POST | `/api/messages` | ✓ | Send message |
| POST | `/api/messages/with-attachment` | ✓ | Send message with file attachment |
| PUT | `/api/messages/:message_id` | ✓ | Edit message |
| DELETE | `/api/messages/:message_id` | ✓ | Delete message |
| POST | `/api/messages/:message_id/reactions` | ✓ | Add reaction |
| DELETE | `/api/messages/:message_id/reactions/:emoji` | ✓ | Remove reaction |
| POST | `/api/messages/read` | ✓ | Mark messages as read |

### Files
| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| GET | `/api/files/:file_id` | ✓ | Download file |

### Clusters (Groups)
| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| GET | `/api/clusters` | ✓ | Get user's clusters |
| POST | `/api/clusters` | ✓ | Create cluster |
| GET | `/api/clusters/:cluster_id` | ✓ | Get cluster details |
| PUT | `/api/clusters/:cluster_id` | ✓ | Update cluster (owner only) |
| DELETE | `/api/clusters/:cluster_id` | ✓ | Delete cluster (owner only) |
| POST | `/api/clusters/:cluster_id/topics` | ✓ | Create topic |
| PUT | `/api/clusters/:cluster_id/topics/:topic_id` | ✓ | Update topic (owner only) |
| DELETE | `/api/clusters/:cluster_id/topics/:topic_id` | ✓ | Delete topic + messages (owner only) |
| GET | `/api/clusters/:cluster_id/topics/:topic_id/messages` | ✓ | Get topic messages |
| POST | `/api/clusters/:cluster_id/join` | ✓ | Join cluster via invitation |
| DELETE | `/api/clusters/:cluster_id/members/:member_id` | ✓ | Remove member (owner only) |

### Cluster Messages
| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| POST | `/api/clusterMessages` | ✓ | Send cluster message |
| PUT | `/api/clusterMessages/:message_id` | ✓ | Edit cluster message |
| DELETE | `/api/clusterMessages/:message_id` | ✓ | Delete cluster message |
| POST | `/api/clusterMessages/:message_id/reactions` | ✓ | Add reaction |
| DELETE | `/api/clusterMessages/:message_id/reactions/:emoji` | ✓ | Remove reaction |

### Invitations
| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| POST | `/api/invitations` | ✓ | Create invitation |
| GET | `/api/invitations/:invitation_id` | ✓ | Get invitation |
| DELETE | `/api/invitations/:invitation_id` | ✓ | Delete invitation |

### Keys (E2E Encryption)
| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| PUT | `/api/keys/identity` | ✓ | Store caller's RSA public key |
| GET | `/api/keys/identity/:user_id` | ✓ | Fetch a user's RSA public key |
| POST | `/api/keys/conversation` | ✓ | Upload encrypted key envelopes for members |
| GET | `/api/keys/conversation` | ✓ | Fetch caller's encrypted key envelope |
| GET | `/api/keys/members/:cluster_id` | ✓ | Fetch all cluster members with their public keys |
| POST | `/api/keys/rotate` | ✓ | Rotate cluster key after member removal |

### Health
| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| GET | `/api/` | | API info |
| GET | `/api/health` | | Health check |

## WebSocket Events

Connect with JWT in the handshake:

```javascript
const socket = io('http://localhost:8001', {
  auth: { token: 'your-jwt-token' }
});
```

### Client → Server

```javascript
// Typing indicator (private chat)
socket.emit('user_typing', { chatId, isTyping: true });

// Typing indicator (cluster topic)
socket.emit('topic_typing', { clusterId, topicId, isTyping: true });

// Status update (persisted to DB)
socket.emit('message', { type: 'status', status: 'online' }); // online | away | dnd | invisible

// Relay key deposit request to all members
socket.emit('key_deposit_requested', { context_type, context_id, user_id });
```

### Server → Client

```javascript
// Presence
{ type: 'status_update', user_id, status }

// Private chat
{ type: 'new_message', message: { ... } }
{ type: 'message_edited', message_id, content, edited_at }
{ type: 'message_deleted', message_id, chat_id }
{ type: 'message_reaction', message_id, emoji, user_id, action } // action: 'add' | 'remove'
{ type: 'user_typing', chat_id, is_typing, user_id }
{ type: 'chat_settings_updated', chat_id, settings, updated_by }

// Clusters
{ type: 'cluster_message', message: { ... } }
{ type: 'cluster_message_edited', message_id, content, edited_at }
{ type: 'cluster_message_deleted', message_id, cluster_id }
{ type: 'cluster_message_reaction', message_id, emoji, user_id, action }
{ type: 'topic_typing', cluster_id, topic_id, user_id, is_typing }
{ type: 'cluster_settings_updated', cluster_id, ... }
{ type: 'topic_settings_updated', cluster_id, topic_id, ... }
{ type: 'cluster_deleted', cluster_id }
{ type: 'topic_deleted', cluster_id, topic_id }
{ type: 'user_joined_cluster', cluster_id, user_id }
{ type: 'user_left_cluster', cluster_id, user_id }
{ type: 'member_removed', cluster_id, user_id }

// E2E encryption
{ type: 'cluster_key_rotated', cluster_id, new_key_version }
{ type: 'key_deposit_requested', context_type, context_id, user_id }
```

## Security

- **JWT** — 30-day expiry, verified on every protected request
- **Passwords** — bcrypt hashed
- **Recovery** — BIP-39 12-word mnemonic, SHA-256 hashed server-side
- **Rate limiting** — 100 req/min per IP (global); 5 auth attempts per 15 min in production
- **File validation** — MIME type whitelist, 100 MB cap
- **Server-side encryption** — AES-256-GCM for stored files
- **CORS** — Configurable origin allowlist
- **Block system** — Blocked users cannot send messages or see online status

## Data Models

### User
```javascript
{
  _id: String (UUID),
  username: String,          // unique, indexed
  display_name: String,
  avatar: String,
  bio: String,
  public_key: String,        // RSA public key (SPKI, PEM)
  status: String,            // online | away | dnd | invisible | offline
  blocked_users: [String],
  created_at: Date
}
```

### Chat
```javascript
{
  _id: String (UUID),
  participants: [String],    // indexed
  disappearing_timer: Number, // minutes; 0 = disabled
  created_at: Date
}
```

### Message
```javascript
{
  _id: String (UUID),
  content: String,           // encrypted client-side, max 5000 chars
  sender_id: String,
  chat_id: String,           // indexed with created_at
  reply_to: String,
  attachments: [{
    file_id: String,
    original_name: String,
    content_type: String,
    size: Number,
    is_image: Boolean
  }],
  reactions: Map<String, [String]>, // emoji → [user_id]
  expires_at: Date,          // MongoDB TTL index; null = never expires
  edited: Boolean,
  created_at: Date
}
```

### Cluster
```javascript
{
  _id: String (UUID),
  name: String,
  description: String,
  owner_id: String,
  members: [String],         // indexed
  topics: [{
    _id: String,
    name: String,
    disappearing_minutes: Number, // 1 | 5 | 30 | 60 | 1440 | 10080
    created_at: Date
  }],
  created_at: Date
}
```

### ConversationKey
```javascript
{
  context_type: 'chat' | 'cluster',
  context_id: String,        // chat_id or cluster_id
  user_id: String,           // envelope recipient
  encrypted_key: String,     // AES key encrypted with recipient's RSA public key (base64)
  key_version: Number,       // increments on rotation
  created_at: Date
}
```

## Rate Limits

| Scope | Limit |
|-------|-------|
| General API | 100 req / min per IP |
| Auth endpoints (production) | 5 attempts / 15 min |
| File uploads | 100 MB per file |
| Image uploads | 25 MB per file |

## Environment Variables

Environment files are auto-loaded based on `NODE_ENV`:
- **`.env.dev`** — `NODE_ENV=development` (default)
- **`.env`** — `NODE_ENV=production`

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGO_URL` | MongoDB connection string | required |
| `DB_NAME` | Database name | required |
| `JWT_SECRET` | JWT signing secret | auto-generated |
| `ENCRYPTION_KEY` | 16-byte hex key for file encryption | auto-generated |
| `CORS_ORIGINS` | Comma-separated allowed origins | `*` |
| `PORT` | Listen port | `3000` |
| `NODE_ENV` | `development` or `production` | `development` |

> **Warning:** Auto-generated `JWT_SECRET` and `ENCRYPTION_KEY` regenerate on every restart. Always set them explicitly in production.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

## License

MIT — see [LICENSE](LICENSE).

## Author

**Salvatore** — [@SalvM](https://github.com/SalvM) · salvatore.manna@protonmail.com

---

*Built with JavaScript*
