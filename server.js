// Dependencies
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import bip39 from 'bip39';
import cors from 'cors'

import './env.js'

// Very cool logger
import { logStart } from './startup.js';

// Project's dependencies
import SocketEvents from './socketEvents.js'
import { chatSchema, clusterSchema, invitationSchema, messageSchema, userSchema } from './utils/schemas.js';
import { corsOptions } from './middlewares/cors.js';
import { hashRecoveryPhrase } from './utils/cryption.js';
import { storage, upload } from './utils/upload.js';
import websocketManager from './websocket.js';

await import('./utils/db.js'); 

// Routes
import AuthRoutes from './routes/authRoutes.js'
import ChatsRoutes from './routes/chatsRoutes.js'
import ClustersRoutes from './routes/clustersRoutes.js'
import InvitationRoutes from './routes/invitationsRoutes.js'
import MessagesRoutes from './routes/messagesRoutes.js'
import UsersRoutes from './routes/usersRoutes.js'
import { rateLimiter } from './utils/limiters.js';
import { authenticate, verifyToken } from './utils/auth.js';
import { Message, User } from './utils/db.js';



// ===================== Config =====================
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || '*',
    credentials: true,
    methods: ['GET', 'POST']
  },
  allowEIO3: true, // Engine.IO version compatibility
  transports: ['websocket', 'polling'] // Allow polling fallback
});
logStart('websocket');

const PORT = process.env.PORT || 3000;

// ===================== Middleware =====================
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting middleware
app.use(async (req, res, next) => {
  try {
    await rateLimiter.consume(req.ip);
    next();
  } catch {
    res.status(429).json({ error: 'Too many requests' });
  }
});
logStart('middlewares');

// ===================== Routes =====================
const router = express.Router();

router.use('/auth', AuthRoutes)
router.use('/chats', ChatsRoutes)
router.use('/clusters', ClustersRoutes)
router.use('/invitations', InvitationRoutes)
router.use('/messages', MessagesRoutes)
router.use('/users', UsersRoutes)

router.get('/files/:file_id', authenticate, async (req, res) => {
  try {
    const filePath = join(UPLOAD_DIR, req.params.file_id);
    await fs.access(filePath);
    res.sendFile(filePath);
  } catch (err) {
    res.status(404).json({ error: 'File not found' });
  }
});

// Health check
router.get('/', (req, res) => {
  res.json({ message: 'Cipher Chat API', version: '0.1.0' });
});

router.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Mount routes
app.use('/api', router);
logStart('routes')


// ===================== WebSocket =====================
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  try {
    const payload = verifyToken(token);
    socket.userId = payload.user_id;
    // console.log('Socket assigned userId:', socket.userId);
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  const userId = socket.userId;
  
  websocketManager.connect(socket, userId);
  
  socket.on('message', async (data) => {
    console.log('>>', data.type, userId)
    if (data.type === 'typing') {
      await websocketManager.broadcastTyping(userId, data.chat_id, data.is_typing);
    } else if (data.type === 'status') {
      await User.updateOne({ id: userId }, { $set: { status: data.status } });
      if (data.status !== 'invisible') {
        await websocketManager.broadcastStatus(userId, data.status);
      }
    }
  });

  socket.on(SocketEvents.USER_TYPING, async (data) => {
    await websocketManager.broadcastTyping(userId, data.chatId, data.isTyping);
  })

  socket.on('disconnect', () => {
    websocketManager.disconnect(userId);
    User.updateOne({ id: userId }, { $set: { status: 'offline' } }).catch(console.error);
  });
});

io.on("connection_error", (err) => {
  console.log('Connection error:', err);
});

// ===================== Cleanup Task =====================
setInterval(async () => {
  try {
    const result = await Message.deleteMany({
      expires_at: { $ne: null, $lt: new Date() }
    });
    if (result.deletedCount > 0) {
      console.log(`Cleaned up ${result.deletedCount} expired messages`);
    }
  } catch (err) {
    console.error('Error cleaning up expired messages:', err);
  }
}, 60000);

// ===================== Start Server =====================
httpServer.listen(PORT, () => {
  logStart('ready', PORT)
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing connections...');
  httpServer.close(() => {
    mongoose.connection.close();
    process.exit(0);
  });
});