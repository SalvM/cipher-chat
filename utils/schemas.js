import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

// ===================== Schemas =====================
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  username_lower: { type: String, required: true, unique: true, index: true },
  display_name: String,
  password_hash: String,
  recovery_hash: String,
  avatar: String,
  bio: String,
  status: { type: String, default: "offline" },
  blocked_users: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  created_at: { type: Date, default: Date.now },
});

const chatSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  disappearing_timer: Number,
  created_at: { type: Date, default: Date.now },
});
chatSchema.index({ participants: 1 }, { unique: true });

const messageSchema = new mongoose.Schema({
  content: String,
  sender_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
  sender_username: String,
  sender_display_name: String,
  sender_avatar: String,
  chat_id: { type: mongoose.Schema.Types.ObjectId, ref: "Chat", index: true },
  reply_to: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  reply_to_content: String,
  edited: { type: Boolean, default: false },
  edited_at: Date,
  attachments: [
    {
      file_id: String,
      original_name: String,
      content_type: String,
      size: Number,
      is_image: Boolean,
      uploaded_at: Date,
    },
  ],
  reactions: { type: Map, of: [String], default: {} },
  created_at: { type: Date, default: Date.now, index: true },
  expires_at: { type: Date },
});
messageSchema.index({ chat_id: 1, created_at: -1 }); // findOne last message per chat
messageSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 }); // TTL

const clusterSchema = new mongoose.Schema({
  name: String,
  description: String,
  owner_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  topics: [
    {
      _id: { type: mongoose.Schema.Types.ObjectId, default: uuidv4 },
      name: String,
      cluster_id: String,
      created_at: { type: Date, default: Date.now },
    },
  ],
  created_at: { type: Date, default: Date.now },
});
clusterSchema.index({ members: 1 });

const clusterMessageSchema = new mongoose.Schema({
  content: String,
  sender_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  sender_username: String,
  sender_display_name: String,
  sender_avatar: String,
  cluster_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Cluster",
    index: true,
  },
  reply_to: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  reply_to_content: String,
  topic_id: String,
  edited: { type: Boolean, default: false },
  edited_at: Date,
  attachments: [
    {
      file_id: String,
      original_name: String,
      content_type: String,
      size: Number,
      is_image: Boolean,
      uploaded_at: Date,
    },
  ],
  reactions: { type: Map, of: [String], default: {} },
  created_at: { type: Date, default: Date.now, index: true },
  expires_at: { type: Date },
});
clusterMessageSchema.index({ cluster_id: 1, created_at: -1 });
clusterMessageSchema.index({ topic_id: 1, created_at: -1 }); // query for topic
clusterMessageSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 }); // TTL

const invitationSchema = new mongoose.Schema({
  cluster_id: { type: mongoose.Schema.Types.ObjectId, ref: "Cluster" },
  created_at: { type: Date, default: Date.now },
  expires_at: { type: Date, default: Date.now },
});
invitationSchema.index({ cluster_id: 1 });
invitationSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

export {
  userSchema,
  chatSchema,
  messageSchema,
  clusterSchema,
  clusterMessageSchema,
  invitationSchema,
};
