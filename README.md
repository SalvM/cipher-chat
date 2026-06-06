# Cipher Chat Server

Real-time chat server API with end-to-end encryption support, file sharing, and cluster-based group chats. Built with Node.js, Express, Socket.io, and MongoDB.

## 🚀 Features

- **User Authentication** - Register/Login with JWT tokens
- **Recovery System** - 12-word mnemonic phrase for account recovery
- **Real-time Messaging** - Instant message delivery via WebSockets
- **Private Chats** - One-on-one encrypted conversations
- **Cluster Chats** - Group chats with topic-based channels
- **File Sharing** - Image and file uploads (up to 100MB)
- **Message Features** - Edit, delete, reactions, reply to messages
- **Read Receipts** - Track message read status

- **User Status** - Online/offline/away/DND status
- **Block Users** - Block/unblock other users
- **Disappearing Messages** - Auto-delete after timer expires
- **End-to-End Encryption** - Optional client-side encryption
- **Server-side Encryption** - AES-256-GCM for stored files

## 🛠️ Tech Stack

- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js
- **Real-time**: Socket.io
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT + bcrypt
- **File Upload**: Multer
- **Encryption**: Node.js crypto module
- **Rate Limiting**: express-rate-limit, rate-limiter-flexible
- **Validation**: Built-in with mongoose schemas

## 📋 Prerequisites

- Node.js 18+
- MongoDB 6+
- npm or yarn

## ⚙️ Installation

1. Clone the repository
```bash
# SSH
git clone git@github.com:SalvM/cipher-chat-server.git

# HTTPS
git clone https://github.com/SalvM/cipher-chat-server.git

cd cipher-chat-server
```

2. Install dependencies
```bash
npm install
```

3. Create environment files in root directory:

**Development (`.env.dev`):**
```env
MONGO_URL=mongodb://localhost:27017/cipherchat
DB_NAME=cipherchat
JWT_SECRET=your-super-secret-jwt-key-change-this
ENCRYPTION_KEY=your-encryption-key-16-bytes
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,http://localhost:8001
PORT=8001
NODE_ENV=development
```

**Production (`.env`):**
```env
MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/?ssl=true
DB_NAME=cipherchat
JWT_SECRET=your-super-secret-jwt-key-change-this
ENCRYPTION_KEY=your-encryption-key-16-bytes
CORS_ORIGINS=https://yourdomain.com
PORT=3000
NODE_ENV=production
```

See `.example.env` for template values.

4. Start MongoDB locally or use MongoDB Atlas

5. Run the server
```bash
# Development (loads .env.dev, watches for changes)
npm run dev

# Production (loads .env)
npm start
```

## 📁 Project Structure

```
cipher-chat-server/
├── server.js              # Main application entry
├── env.js                 # Environment config loader
├── package.json           # Dependencies
├── .env                   # Production environment variables
├── .env.dev               # Development environment variables
├── .example.env           # Environment template
├── uploads/               # Uploaded files storage
└── README.md              # Documentation
```

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| POST | `/api/auth/recover` | Recover account with mnemonic |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/profile` | Update profile |
| PUT | `/api/auth/status` | Update online status |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/search?username=...` | Search users |
| GET | `/api/users/blocked` | List blocked users |
| GET | `/api/users/:user_id` | Get user by ID |
| POST | `/api/users/block` | Block a user |
| DELETE | `/api/users/block/:user_id` | Unblock a user |

### Chats
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/chats` | Get all user chats |
| POST | `/api/chats` | Create private chat |
| PUT | `/api/chats/:chat_id/settings` | Update chat settings |
| GET | `/api/chats/:chat_id/messages` | Get chat messages |
| GET | `/api/chats/:chat_id/unread` | Get unread count |

### Messages
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/messages` | Send message |
| PUT | `/api/messages/:message_id` | Edit message |
| DELETE | `/api/messages/:message_id` | Delete message |
| POST | `/api/messages/:message_id/reactions` | Add reaction |
| DELETE | `/api/messages/:message_id/reactions/:emoji` | Remove reaction |
| POST | `/api/messages/read` | Mark messages as read |

### Files
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/upload` | Upload file (returns attachment object) |
| POST | `/api/messages/with-attachment` | Send message with file |
| GET | `/api/files/:file_id` | Download file |

### Clusters (Groups)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/clusters` | Get user clusters |
| POST | `/api/clusters` | Create cluster |
| GET | `/api/clusters/:cluster_id` | Get cluster details |
| POST | `/api/clusters/:cluster_id/topics` | Create topic |
| GET | `/api/clusters/:cluster_id/topics/:topic_id/messages` | Get topic messages |
| POST | `/api/clusters/:cluster_id/topics/:topic_id/messages` | Send topic message |
| POST | `/api/clusters/:cluster_id/join` | Join cluster |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/` | API info |
| GET | `/api/health` | Health check |

## 🔌 WebSocket Events

### Client -> Server
```javascript
// Typing indicator
socket.emit('message', {
  type: 'typing',
  chat_id: 'chat-123',
  is_typing: true
});

// Status update
socket.emit('message', {
  type: 'status',
  status: 'online' // online, away, dnd, invisible
});
```

### Server -> Client
```javascript
// New message
{
  type: 'new_message',
  message: { ... }
}

// Message edited
{
  type: 'message_edited',
  message_id: 'msg-123',
  content: 'updated content',
  edited_at: '2024-01-01T00:00:00Z'
}

// Message deleted
{
  type: 'message_deleted',
  message_id: 'msg-123',
  chat_id: 'chat-123'
}

// Message reaction
{
  type: 'message_reaction',
  message_id: 'msg-123',
  emoji: '👍',
  user_id: 'user-123',
  action: 'add' // or 'remove'
}

// Status update
{
  type: 'status_update',
  user_id: 'user-123',
  status: 'online'
}

// Typing indicator
{
  type: 'typing',
  user_id: 'user-123',
  chat_id: 'chat-123',
  is_typing: true
}

// Message read - DEPRECATED
{
  type: 'message_read',
  message_id: 'msg-123',
  chat_id: 'chat-123',
  read_by: 'user-123'
}

// Chat settings updated
{
  type: 'chat_settings_updated',
  chat_id: 'chat-123',
  settings: { disappearing_timer: 30 },
  updated_by: 'user-123'
}
```

## 🔐 Security Features

- **JWT Authentication** - Tokens expire after 30 days
- **Password Hashing** - bcrypt with salt rounds
- **Rate Limiting** - 100 requests per IP per minute
- **File Validation** - MIME type checking, size limits
- **Server-side Encryption** - AES-256-GCM for stored files
- **Recovery Phrases** - 12-word mnemonic, bcrypted
- **CORS Protection** - Configurable origins
- **Input Validation** - Mongoose schema validation
- **Block System** - Prevent communication with blocked users

## 📦 Data Models

### User
```javascript
{
  id: String (UUID),
  username: String,
  display_name: String,
  avatar: String,
  bio: String,
  status: String,
  blocked_users: [String],
  created_at: Date
}
```

### Chat
```javascript
{
  id: String (UUID),
  type: 'private' | 'group',
  participants: [String],
  disappearing_timer: Number, // minutes
  created_at: Date
}
```

### Message
```javascript
{
  id: String (UUID),
  content: String,
  sender_id: String,
  chat_id: String,
  reply_to: String,
  attachments: [{
    file_id: String,
    original_name: String,
    content_type: String,
    size: Number,
    is_image: Boolean
  }],
  reactions: Map<String, [String]>,
  read_by: [String],
  expires_at: Date,
  created_at: Date,
  edited: Boolean
}
```

### Cluster
```javascript
{
  id: String (UUID),
  name: String,
  description: String,
  owner_id: String,
  members: [String],
  topics: [{
    id: String,
    name: String,
    created_at: Date
  }],
  created_at: Date
}
```

## 🚦 Rate Limits

- **General API**: 100 requests per minute per IP
- **Auth endpoints**: 5 attempts per 15 minutes
- **File uploads**: Max 100MB per file
- **Image uploads**: Max 25MB per file

## 🔧 Environment Variables

Environment files are loaded based on `NODE_ENV`:
- **`.env.dev`** — loaded when `NODE_ENV=development` (default)
- **`.env`** — loaded when `NODE_ENV=production`

| Variable | Description | Default |
|----------|-------------|---------|
| MONGO_URL | MongoDB connection string | Required |
| DB_NAME | Database name | Required |
| JWT_SECRET | Secret for JWT signing | Auto-generated if missing |
| ENCRYPTION_KEY | 16-byte hex key for AES-256-GCM | Auto-generated if missing |
| CORS_ORIGINS | Comma-separated allowed origins | * |
| PORT | Server listen port | 3000 |
| NODE_ENV | Environment mode (development/production) | development |

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test
```

## 📈 Performance Optimizations

- MongoDB indexes on frequently queried fields
- Message pagination (limit parameter)
- WebSocket connection pooling
- File streaming for downloads
- Background cleanup jobs for expired messages

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- **Salvatore** - [@SalvM](https://github.com/SalvM)
- **Email**: salvatore.manna@protonmail.com
- **Project Link**: [https://github.com/SalvM/cipher-chat-server](https://github.com/SalvM/cipher-chat-server)

## ☕ Support

If you found this project helpful and want to show appreciation, consider buying me a beer (or coffee):

- **Bitcoin**: `your-btc-address`
- **Ethereum**: `your-eth-address`
- **PayPal**: [paypal.me/yourusername](https://paypal.me/yourusername)
- **Buy Me a Coffee**: [buymeacoffee.com/yourusername](https://buymeacoffee.com/yourusername)

---

*Built with ❤️ and JavaScript*
