// server.js
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import bip39 from 'bip39';
import expressRateLimit from 'express-rate-limit';
import cors from 'cors'

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

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

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(16).toString('hex');
const UPLOAD_DIR = join(__dirname, 'uploads');

// Ensure upload directory exists
await fs.mkdir(UPLOAD_DIR, { recursive: true });

// ===================== MongoDB Connection =====================
await mongoose.connect(process.env.MONGO_URL);
console.log('Connected to MongoDB');

// ===================== Schemas =====================
const userSchema = new mongoose.Schema({
  id: { type: String, default: uuidv4, unique: true, index: true },
  username: { type: String, required: true, unique: true },
  username_lower: { type: String, required: true, unique: true, index: true },
  display_name: String,
  password_hash: String,
  recovery_hash: String,
  avatar: String,
  bio: String,
  status: { type: String, default: 'offline' },
  blocked_users: [{ type: String, ref: 'User' }],
  created_at: { type: Date, default: Date.now }
});

const chatSchema = new mongoose.Schema({
  id: { type: String, default: uuidv4, unique: true, index: true },
  type: { type: String, enum: ['private', 'group'], default: 'private' },
  participants: [{ type: String, ref: 'User' }],
  disappearing_timer: Number,
  created_at: { type: Date, default: Date.now }
});

const messageSchema = new mongoose.Schema({
  id: { type: String, default: uuidv4, unique: true, index: true },
  content: String,
  sender_id: { type: String, ref: 'User', index: true },
  sender_username: String,
  sender_display_name: String,
  sender_avatar: String,
  chat_id: { type: String, ref: 'Chat', index: true },
  reply_to: String,
  reply_to_content: String,
  created_at: { type: Date, default: Date.now, index: true },
  edited: { type: Boolean, default: false },
  edited_at: Date,
  encrypted: { type: Boolean, default: false },
  attachments: [{
    file_id: String,
    original_name: String,
    content_type: String,
    size: Number,
    is_image: Boolean,
    uploaded_at: Date
  }],
  reactions: { type: Map, of: [String], default: {} },
  read_by: [{ type: String, ref: 'User' }],
  expires_at: { type: Date, index: true }
});

const clusterSchema = new mongoose.Schema({
  id: { type: String, default: uuidv4, unique: true, index: true },
  name: String,
  description: String,
  owner_id: { type: String, ref: 'User' },
  members: [{ type: String, ref: 'User' }],
  topics: [{
    id: { type: String, default: uuidv4 },
    name: String,
    cluster_id: String,
    created_at: { type: Date, default: Date.now }
  }],
  created_at: { type: Date, default: Date.now }
});

const clusterMessageSchema = new mongoose.Schema({
  id: { type: String, default: uuidv4, unique: true, index: true },
  content: String,
  sender_id: { type: String, ref: 'User' },
  sender_username: String,
  sender_display_name: String,
  sender_avatar: String,
  cluster_id: { type: String, ref: 'Cluster', index: true },
  topic_id: String,
  created_at: { type: Date, default: Date.now, index: true }
});

const User = mongoose.model('User', userSchema);
const Chat = mongoose.model('Chat', chatSchema);
const Message = mongoose.model('Message', messageSchema);
const Cluster = mongoose.model('Cluster', clusterSchema);
const ClusterMessage = mongoose.model('ClusterMessage', clusterMessageSchema);

// Create indexes
await Promise.all([
  Message.collection.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 }),
  Message.collection.createIndex({ chat_id: 1, created_at: -1 }),
  Chat.collection.createIndex({ participants: 1 })
]);

// ===================== Rate Limiting =====================
const rateLimiter = new RateLimiterMemory({
  points: 100,
  duration: 60
});

const authLimiter = expressRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 55, // 55 in DEV, 5 in PROD
  message: 'Too many attempts, try again later'
});

// ===================== Middleware =====================
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || [];
    
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('Origin not allowed:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};
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

// ===================== Auth Helpers =====================
const generateToken = (userId, username) => {
  return jwt.sign(
    { user_id: userId, username },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    throw new Error('Invalid token');
  }
};

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const token = authHeader.replace('Bearer ', '');
    const payload = verifyToken(token);
    const user = await User.findOne({ id: payload.user_id }).lean();
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const hashRecoveryPhrase = (phrase) => {
  return crypto.createHash('sha256').update(phrase.toLowerCase()).digest('hex');
};

// ===================== Encryption Helpers =====================
const encryptMessage = (content) => {
  const key = Buffer.from(ENCRYPTION_KEY, 'hex');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(content, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
};

const decryptMessage = (encryptedContent) => {
  try {
    const key = Buffer.from(ENCRYPTION_KEY, 'hex');
    const data = Buffer.from(encryptedContent, 'base64');
    const iv = data.subarray(0, 12);
    const authTag = data.subarray(12, 28);
    const ciphertext = data.subarray(28);
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    return decipher.update(ciphertext) + decipher.final('utf8');
  } catch (err) {
    console.error('Decryption error:', err);
    return encryptedContent;
  }
};

// ===================== File Upload =====================
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_FILE_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf', 'text/plain', 'application/zip',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'audio/mpeg', 'audio/wav', 'video/mp4', 'video/webm'
];

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (ALLOWED_FILE_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});

// ===================== WebSocket Manager =====================
class ConnectionManager {
  constructor() {
    this.activeConnections = new Map();
    this.userStatus = new Map();
    this.typingUsers = new Map();
  }

  async connect(socket, userId) {
    console.log('>> Connection - userId:', userId);
    this.activeConnections.set(userId, socket);
    this.userStatus.set(userId, 'online');
    await this.broadcastStatus(userId, 'online');
  }

  disconnect(userId) {
    this.activeConnections.delete(userId);
    this.userStatus.set(userId, 'offline');
    this.broadcastStatus(userId, 'offline');
  }

  async sendPersonalMessage(userId, eventType, eventContent) {
    console.log('[sendPersonalMessage() ...', userId, eventType, eventContent)
    const socket = this.activeConnections.get(userId);

    if (socket) {
      socket.emit(eventType, eventContent);
    } else {
      console.error(`Socket not found for user ${userId}`)
    }
  }

  async broadcastToChat(eventType, eventContent, participants) {
    // console.log('broadcastToChat()', { eventType, eventContent, participants })
    for (const userId of participants) {
      await this.sendPersonalMessage(userId, eventType, eventContent);
    }
  }

  async broadcastStatus(userId, status) {
    const chats = await Chat.find({ participants: userId }).lean();
    const notified = new Set();
    
    for (const chat of chats) {
      for (const participant of chat.participants) {
        if (participant !== userId && !notified.has(participant)) {
          await this.sendPersonalMessage(participant, 'status_update', {
              user_id: userId,
              status
          });
          notified.add(participant);
        }
      }
    }
  }

  async broadcastTyping(userId, chatId, isTyping) {
    const chat = await Chat.findOne({ id: chatId }).lean();
    if (chat) {
      for (const participant of chat.participants) {
        if (participant !== userId) {
          await this.sendPersonalMessage(participant, 'typing', {
            user_id: userId,
            chat_id: chatId,
            is_typing: isTyping
          });
        }
      }
    }
  }
}

const manager = new ConnectionManager();

// ===================== Routes =====================
const router = express.Router();

// Auth Routes
router.post('/auth/register', authLimiter, async (req, res) => {
  try {
    const { username, password, display_name } = req.body;
    
    const existing = await User.findOne({ username_lower: username.toLowerCase() });
    if (existing) {
      return res.status(400).json({ error: 'Username already taken' });
    }
    
    const recoveryPhrase = bip39.generateMnemonic(128); // 12 words
    const passwordHash = await bcrypt.hash(password, 10);
    const recoveryHash = hashRecoveryPhrase(recoveryPhrase);
    
    const user = new User({
      username,
      username_lower: username.toLowerCase(),
      display_name: display_name || username,
      password_hash: passwordHash,
      recovery_hash: recoveryHash
    });
    
    await user.save();
    
    const token = generateToken(user.id, user.username);
    
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        status: user.status
      },
      recovery_phrase: recoveryPhrase,
      message: 'IMPORTANT: Save your recovery phrase securely. It cannot be recovered if lost!'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/auth/login', authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const user = await User.findOne({ username_lower: username.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    user.status = 'online';
    await user.save();
    
    const token = generateToken(user.id, user.username);
    
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        avatar: user.avatar,
        bio: user.bio,
        status: user.status
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/auth/recover', authLimiter, async (req, res) => {
  try {
    const { username, recovery_phrase, new_password } = req.body;
    
    const user = await User.findOne({ username_lower: username.toLowerCase() });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const providedHash = hashRecoveryPhrase(recovery_phrase);
    if (providedHash !== user.recovery_hash) {
      return res.status(401).json({ error: 'Invalid recovery phrase' });
    }
    
    user.password_hash = await bcrypt.hash(new_password, 10);
    await user.save();
    
    const token = generateToken(user.id, user.username);
    
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name
      },
      message: 'Password updated successfully'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/auth/me', authenticate, async (req, res) => {
  res.json({
    id: req.user.id,
    username: req.user.username,
    display_name: req.user.display_name,
    avatar: req.user.avatar,
    bio: req.user.bio,
    status: req.user.status
  });
});

router.put('/auth/profile', authenticate, async (req, res) => {
  try {
    const { display_name, bio, avatar } = req.body;
    
    const updateData = {};
    if (display_name !== undefined) updateData.display_name = display_name;
    if (bio !== undefined) updateData.bio = bio;
    if (avatar !== undefined) updateData.avatar = avatar;
    
    if (Object.keys(updateData).length > 0) {
      await User.updateOne({ id: req.user.id }, { $set: updateData });
    }
    
    const updated = await User.findOne({ id: req.user.id })
      .select('-password_hash -recovery_hash')
      .lean();
    
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/auth/status', authenticate, async (req, res) => {
  try {
    const { status } = req.body;
    
    await User.updateOne({ id: req.user.id }, { $set: { status } });
    
    if (status !== 'invisible') {
      await manager.broadcastStatus(req.user.id, status);
    }
    
    res.json({ status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// User Routes
router.get('/users/search', authenticate, async (req, res) => {
  try {
    const { q } = req.query;
    
    const user = await User.findOne(
      { username_lower: q.toLowerCase() },
      '-password_hash -recovery_hash'
    ).lean();
    
    if (!user) {
      return res.json({ users: [] });
    }
    
    // Add real-time status
    user.status = manager.userStatus.get(user.id) || user.status;
    
    res.json({ users: [user] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/users/blocked', authenticate, async (req, res) => {
  try {
    const user = await User.findOne({ id: req.user.id }).lean();
    const blockedIds = user.blocked_users || [];
    
    if (blockedIds.length === 0) {
      return res.json({ blocked_users: [] });
    }
    
    const blocked = await User.find(
      { id: { $in: blockedIds } },
      'id username display_name avatar'
    ).lean();
    
    res.json({ blocked_users: blocked });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/users/:user_id', authenticate, async (req, res) => {
  try {
    const user = await User.findOne(
      { id: req.params.user_id },
      '-password_hash -recovery_hash'
    ).lean();
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    user.status = manager.userStatus.get(user.id) || user.status;
    
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Block/Unblock routes
router.post('/users/block', authenticate, async (req, res) => {
  try {
    const { user_id } = req.body;
    
    if (user_id === req.user.id) {
      return res.status(400).json({ error: 'Cannot block yourself' });
    }
    
    const target = await User.findOne({ id: user_id });
    if (!target) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    await User.updateOne(
      { id: req.user.id },
      { $addToSet: { blocked_users: user_id } }
    );
    
    res.json({ success: true, blocked_user_id: user_id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/users/block/:user_id', authenticate, async (req, res) => {
  try {
    await User.updateOne(
      { id: req.user.id },
      { $pull: { blocked_users: req.params.user_id } }
    );
    
    res.json({ success: true, unblocked_user_id: req.params.user_id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Chat Routes
router.post('/chats', authenticate, async (req, res) => {
  try {
    const { recipient_username } = req.body;
    
    const recipient = await User.findOne(
      { username_lower: recipient_username.toLowerCase() },
      '-password_hash -recovery_hash'
    ).lean();
    
    if (!recipient) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (recipient.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot create chat with yourself' });
    }
    
    // Check blocks
    if (req.user.blocked_users?.includes(recipient.id)) {
      return res.status(403).json({ error: 'You have blocked this user' });
    }
    
    const recipientFull = await User.findOne({ id: recipient.id }).lean();
    if (recipientFull.blocked_users?.includes(req.user.id)) {
      return res.status(403).json({ error: 'Cannot message this user' });
    }
    
    // Check existing chat
    let chat = await Chat.findOne({
      type: 'private',
      participants: { $all: [req.user.id, recipient.id], $size: 2 }
    }).lean();
    
    if (!chat) {
      chat = new Chat({
        participants: [req.user.id, recipient.id]
      });
      await chat.save();
    }
    
    // Add participant details
    chat.participant_details = [
      {
        id: req.user.id,
        username: req.user.username,
        display_name: req.user.display_name,
        avatar: req.user.avatar,
        status: manager.userStatus.get(req.user.id) || req.user.status
      },
      {
        id: recipient.id,
        username: recipient.username,
        display_name: recipient.display_name,
        avatar: recipient.avatar,
        status: manager.userStatus.get(recipient.id) || recipient.status
      }
    ];
    
    res.json(chat);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/chats/:chat_id/settings', authenticate, async (req, res) => {
  try {
    const { disappearing_timer } = req.body;
    
    const chat = await Chat.findOne({
      id: req.params.chat_id,
      participants: req.user.id
    }).lean();
    
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    const validTimers = [0, 5, 30, 60, 1440, 10080];
    if (disappearing_timer !== undefined && !validTimers.includes(disappearing_timer)) {
      return res.status(400).json({ error: 'Invalid timer value' });
    }
    
    const updateData = {};
    if (disappearing_timer !== undefined) {
      updateData.disappearing_timer = disappearing_timer > 0 ? disappearing_timer : null;
    }
    
    if (Object.keys(updateData).length > 0) {
      await Chat.updateOne({ id: chat.id }, { $set: updateData });
      
      await manager.broadcastToChat(
        'chat_settings_updated',
        {
          chat_id: chat.id,
          settings: updateData,
          updated_by: req.user.id
        },
        chat.participants
      );
    }
    
    const updated = await Chat.findOne({ id: chat.id }).lean();
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/chats', authenticate, async (req, res) => {
  try {
    const chats = await Chat.find({ participants: req.user.id }).lean();
    
    const enriched = await Promise.all(chats.map(async (chat) => {
      const participantDetails = await Promise.all(
        chat.participants.map(async (pid) => {
          const user = await User.findOne(
            { id: pid },
            '-password_hash -recovery_hash'
          ).lean();
          if (user) {
            user.status = manager.userStatus.get(pid) || user.status;
          }
          return user;
        })
      );
      
      const lastMessage = await Message.findOne(
        { chat_id: chat.id },
        null,
        { sort: { created_at: -1 } }
      ).lean();
      
      return {
        ...chat,
        participant_details: participantDetails.filter(Boolean),
        last_message: lastMessage
      };
    }));
    
    enriched.sort((a, b) => {
      const aTime = a.last_message?.created_at || a.created_at;
      const bTime = b.last_message?.created_at || b.created_at;
      return new Date(bTime) - new Date(aTime);
    });
    
    res.json({ chats: enriched });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/chats/:chat_id/messages', authenticate, async (req, res) => {
  try {
    const { limit = 50, before } = req.query;
    
    const chat = await Chat.findOne({
      id: req.params.chat_id,
      participants: req.user.id
    }).lean();
    
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    const query = { chat_id: req.params.chat_id };
    if (before) {
      query.created_at = { $lt: new Date(before) };
    }
    
    const messages = await Message.find(query)
      .sort({ created_at: -1 })
      .limit(parseInt(limit))
      .lean();
    
    messages.reverse();
    
    res.json({ messages });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Message Routes
router.post('/messages', authenticate, async (req, res) => {
  try {
    const { content, chat_id, reply_to, encrypted } = req.body;
    
    const chat = await Chat.findOne({
      id: chat_id,
      participants: req.user.id
    }).lean();
    
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    const otherId = chat.participants.find(p => p !== req.user.id);
    const otherUser = await User.findOne({ id: otherId }).lean();
    
    if (otherUser?.blocked_users?.includes(req.user.id)) {
      return res.status(403).json({ error: 'Cannot send message to this user' });
    }
    
    let replyToContent = null;
    if (reply_to) {
      const replyMsg = await Message.findOne({ id: reply_to }).lean();
      if (replyMsg) {
        replyToContent = `${replyMsg.sender_display_name}: ${replyMsg.content.substring(0, 100)}`;
      }
    }
    
    let expiresAt = null;
    if (chat.disappearing_timer) {
      expiresAt = new Date(Date.now() + chat.disappearing_timer * 60000);
    }
    
    const message = new Message({
      content,
      sender_id: req.user.id,
      sender_username: req.user.username,
      sender_display_name: req.user.display_name,
      sender_avatar: req.user.avatar,
      chat_id,
      reply_to,
      reply_to_content: replyToContent,
      encrypted: encrypted || false,
      read_by: [req.user.id],
      expires_at: expiresAt
    });
    
    await message.save();
    
    const messageObj = message.toObject();
    delete messageObj._id;

    await manager.broadcastToChat(
      'new_message',
      messageObj,
      chat.participants
    );
    
    res.json(messageObj);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/messages/:message_id', authenticate, async (req, res) => {
  try {
    const { content } = req.body;
    
    const message = await Message.findOne({
      id: req.params.message_id,
      sender_id: req.user.id
    }).lean();
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    await Message.updateOne(
      { id: message.id },
      {
        $set: {
          content,
          edited: true,
          edited_at: new Date()
        }
      }
    );
    
    const chat = await Chat.findOne({ id: message.chat_id }).lean();
    if (chat) {
      await manager.broadcastToChat(
        'message_edited',
        {
          message_id: message.id,
          content,
          edited_at: new Date()
        },
        chat.participants
      )
    }
    
    res.json({
      id: message.id,
      content,
      edited: true
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/messages/:message_id', authenticate, async (req, res) => {
  try {
    const message = await Message.findOne({
      id: req.params.message_id,
      sender_id: req.user.id
    }).lean();
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    // Delete attachments
    for (const attachment of message.attachments || []) {
      const filePath = join(UPLOAD_DIR, attachment.file_id);
      try {
        await fs.unlink(filePath);
      } catch (err) {
        console.error('Failed to delete file:', err);
      }
    }
    
    await Message.deleteOne({ id: message.id });
    
    const chat = await Chat.findOne({ id: message.chat_id }).lean();
    if (chat) {
      await manager.broadcastToChat(
        'message_deleted',
        {
          message_id: message.id,
          chat_id: message.chat_id
        },
        chat.participants
      );
    }
    
    res.json({ deleted: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Message Reactions
router.post('/messages/:message_id/reactions', authenticate, async (req, res) => {
  try {
    const { emoji } = req.body;
    
    const message = await Message.findOne({ id: req.params.message_id }).lean();
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    const chat = await Chat.findOne({
      id: message.chat_id,
      participants: req.user.id
    }).lean();
    
    if (!chat) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    await Message.updateOne(
      { id: message.id },
      { $addToSet: { [`reactions.${emoji}`]: req.user.id } }
    );
 
    await manager.broadcastToChat(
      'message_reaction',
      {
        message_id: message.id,
        emoji,
        user_id: req.user.id,
        action: 'add'
      },
      chat.participants
    );

    res.json({ success: true, emoji });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/messages/:message_id/reactions/:emoji', authenticate, async (req, res) => {
  try {
    const { emoji } = req.params;
    
    const message = await Message.findOne({ id: req.params.message_id }).lean();
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    const chat = await Chat.findOne({
      id: message.chat_id,
      participants: req.user.id
    }).lean();
    
    if (!chat) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    await Message.updateOne(
      { id: message.id },
      { $pull: { [`reactions.${emoji}`]: req.user.id } }
    );
    
    await manager.broadcastToChat(
      'message_reaction',
      {
        message_id: message.id,
        emoji,
        user_id: req.user.id,
        action: 'remove'
      },
      chat.participants
    );
    
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Read Receipts
router.post('/messages/read', authenticate, async (req, res) => {
  try {
    const { message_ids } = req.body;
    
    if (!message_ids || message_ids.length === 0) {
      return res.json({ updated: 0 });
    }
    
    const result = await Message.updateMany(
      {
        id: { $in: message_ids },
        read_by: { $ne: req.user.id }
      },
      { $push: { read_by: req.user.id } }
    );
    
    const messages = await Message.find(
      { id: { $in: message_ids } },
      'id sender_id chat_id'
    ).lean();
    
    for (const msg of messages) {
      if (msg.sender_id !== req.user.id) {
        await manager.sendPersonalMessage(msg.sender_id, 'message_read', {
          message_id: msg.id,
          chat_id: msg.chat_id,
          read_by: req.user.id
        });
      }
    }
    
    res.json({ updated: result.modifiedCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/chats/:chat_id/unread', authenticate, async (req, res) => {
  try {
    const chat = await Chat.findOne({
      id: req.params.chat_id,
      participants: req.user.id
    }).lean();
    
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    const count = await Message.countDocuments({
      chat_id: req.params.chat_id,
      sender_id: { $ne: req.user.id },
      read_by: { $ne: req.user.id }
    });
    
    res.json({ unread_count: count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// File Upload
router.post('/upload', authenticate, upload.single('file'), async (req, res) => {
  try {
    const { chat_id } = req.body;
    
    const chat = await Chat.findOne({
      id: chat_id,
      participants: req.user.id
    }).lean();
    
    if (!chat) {
      // Delete uploaded file
      await fs.unlink(req.file.path);
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    const attachment = {
      file_id: req.file.filename,
      original_name: req.file.originalname,
      content_type: req.file.mimetype,
      size: req.file.size,
      is_image: ALLOWED_IMAGE_TYPES.includes(req.file.mimetype),
      uploaded_at: new Date()
    };
    
    res.json(attachment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

router.post('/messages/with-attachment', authenticate, upload.single('file'), async (req, res) => {
  try {
    const { content, chat_id, reply_to } = req.body;
    
    const chat = await Chat.findOne({
      id: chat_id,
      participants: req.user.id
    }).lean();
    
    if (!chat) {
      await fs.unlink(req.file.path);
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    const attachment = {
      file_id: req.file.filename,
      original_name: req.file.originalname,
      content_type: req.file.mimetype,
      size: req.file.size,
      is_image: ALLOWED_IMAGE_TYPES.includes(req.file.mimetype),
      uploaded_at: new Date()
    };
    
    const message = new Message({
      content: content || '',
      sender_id: req.user.id,
      sender_username: req.user.username,
      sender_display_name: req.user.display_name,
      sender_avatar: req.user.avatar,
      chat_id,
      reply_to,
      attachments: [attachment],
      read_by: [req.user.id]
    });
    
    await message.save();
    
    const messageObj = message.toObject();
    delete messageObj._id;
    
    await manager.broadcastToChat(
      'new_message',
      messageObj,
      chat.participants
    );
    
    res.json(messageObj);
  } catch (err) {
    console.error(err);
    if (req.file) {
      await fs.unlink(req.file.path).catch(console.error);
    }
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/files/:file_id', authenticate, async (req, res) => {
  try {
    const filePath = join(UPLOAD_DIR, req.params.file_id);
    await fs.access(filePath);
    res.sendFile(filePath);
  } catch (err) {
    res.status(404).json({ error: 'File not found' });
  }
});

// Clusters (Groups)
router.post('/clusters', authenticate, async (req, res) => {
  try {
    const { name, description } = req.body;
    
    const cluster = new Cluster({
      name,
      description,
      owner_id: req.user.id,
      members: [req.user.id],
      topics: [{
        name: 'general',
        cluster_id: ''
      }]
    });
    
    await cluster.save();

    cluster.topics[0].cluster_id = cluster.id;
    await cluster.save();
    
    res.json(cluster);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/clusters', authenticate, async (req, res) => {
  try {
    const clusters = await Cluster.find(
      { members: req.user.id }
    ).lean();
    
    res.json({ clusters });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/clusters/:cluster_id', authenticate, async (req, res) => {
  try {
    const cluster = await Cluster.findOne({
      id: req.params.cluster_id,
      members: req.user.id
    }).lean();
    
    if (!cluster) {
      return res.status(404).json({ error: 'Cluster not found' });
    }
    
    const memberDetails = await Promise.all(
      cluster.members.map(async (mid) => {
        const user = await User.findOne(
          { id: mid },
          '-password_hash -recovery_hash'
        ).lean();
        if (user) {
          user.status = manager.userStatus.get(mid) || user.status;
        }
        return user;
      })
    );
    
    cluster.member_details = memberDetails.filter(Boolean);
    
    res.json(cluster);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/clusters/:cluster_id/topics', authenticate, async (req, res) => {
  try {
    const { name } = req.body;
    
    const cluster = await Cluster.findOne({
      id: req.params.cluster_id,
      members: req.user.id
    });
    
    if (!cluster) {
      return res.status(404).json({ error: 'Cluster not found' });
    }
    
    const topic = {
      id: uuidv4(),
      name,
      cluster_id: cluster.id,
      created_at: new Date()
    };
    
    cluster.topics.push(topic);
    await cluster.save();
    
    res.json(topic);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/clusters/:cluster_id/topics/:topic_id/messages', authenticate, async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    
    const cluster = await Cluster.findOne({
      id: req.params.cluster_id,
      members: req.user.id
    }).lean();
    
    if (!cluster) {
      return res.status(404).json({ error: 'Cluster not found' });
    }
    
    const messages = await ClusterMessage.find({
      cluster_id: req.params.cluster_id,
      topic_id: req.params.topic_id
    })
      .sort({ created_at: -1 })
      .limit(parseInt(limit))
      .lean();
    
    messages.reverse();
    
    res.json({ messages });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/clusters/:cluster_id/topics/:topic_id/messages', authenticate, async (req, res) => {
  try {
    const { content } = req.body;
    if (content === undefined || content.length === 0) return res.status(501); 

    const cluster = await Cluster.findOne({
      id: req.params.cluster_id,
      members: req.user.id
    }).lean();
    
    if (!cluster) {
      return res.status(404).json({ error: 'Cluster not found' });
    }
    
    const topicExists = cluster.topics.some(t => t.id === req.params.topic_id);
    if (!topicExists) {
      return res.status(404).json({ error: 'Topic not found' });
    }
    
    const message = new ClusterMessage({
      content,
      sender_id: req.user.id,
      sender_username: req.user.username,
      sender_display_name: req.user.display_name,
      sender_avatar: req.user.avatar,
      cluster_id: req.params.cluster_id,
      topic_id: req.params.topic_id
    });
    
    await message.save();
    
    const messageObj = message.toObject();
    delete messageObj._id;
    
    for (const memberId of cluster.members) {
      await manager.sendPersonalMessage(memberId, 'new_cluster_message', {
        message: messageObj
      });
    }
    
    res.json(messageObj);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/clusters/:cluster_id/join', authenticate, async (req, res) => {
  try {
    const cluster = await Cluster.findOne({ id: req.params.cluster_id });
    
    if (!cluster) {
      return res.status(404).json({ error: 'Cluster not found' });
    }
    
    if (cluster.members.includes(req.user.id)) {
      return res.json({ message: 'Already a member' });
    }
    
    cluster.members.push(req.user.id);
    await cluster.save();
    
    res.json({ message: 'Joined cluster successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Health check
router.get('/', (req, res) => {
  res.json({ message: 'Cipher Chat API', version: '1.0.0' });
});

router.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Mount routes
app.use('/api', router);

// ===================== WebSocket =====================
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  try {
    const payload = verifyToken(token);
    socket.userId = payload.user_id;
    console.log('Socket assigned userId:', socket.userId);
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  const userId = socket.userId;
  
  manager.connect(socket, userId);
  
  socket.on('message', async (data) => {
    if (data.type === 'typing') {
      await manager.broadcastTyping(userId, data.chat_id, data.is_typing);
    } else if (data.type === 'status') {
      await User.updateOne({ id: userId }, { $set: { status: data.status } });
      if (data.status !== 'invisible') {
        await manager.broadcastStatus(userId, data.status);
      }
    }
  });
  
  socket.on('disconnect', () => {
    manager.disconnect(userId);
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
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing connections...');
  httpServer.close(() => {
    mongoose.connection.close();
    process.exit(0);
  });
});