import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

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

const invitationSchema = new mongoose.Schema({
  id: { type: String, default: uuidv4, unique: true, index: true },
  cluster_id: { type: String, ref: 'Cluster' },
  created_at: { type: Date, default: Date.now },
  expires_at: { type: Date, default: Date.now }
});

export {
    userSchema, chatSchema, messageSchema, clusterSchema, clusterMessageSchema, invitationSchema
}