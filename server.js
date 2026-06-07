import "./env.js";

// Dependencies
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { v4 as uuidv4 } from "uuid";
import bip39 from "bip39";
import cors from "cors";

import mongoose from "mongoose";

// Very cool logger
import { logInfo, logStart, logDbOperation } from "./startup.js";

// Project's dependencies
import SocketEvents from "./socketEvents.js";
import {
  chatSchema,
  clusterSchema,
  invitationSchema,
  messageSchema,
  userSchema,
} from "./utils/schemas.js";
import { corsOptions } from "./middlewares/cors.js";
import { UPLOAD_DIR } from "./directories.js";
import { hashRecoveryPhrase } from "./utils/cryption.js";
import { storage, upload } from "./utils/upload.js";
import websocketManager from "./websocket.js";

await import("./utils/db.js");

// Routes
import AuthRoutes from "./routes/authRoutes.js";
import ChatsRoutes from "./routes/chatsRoutes.js";
import ClustersRoutes from "./routes/clustersRoutes.js";
import InvitationRoutes from "./routes/invitationsRoutes.js";
import MessagesRoutes from "./routes/messagesRoutes.js";
import ClusterMessagesRoutes from "./routes/clusterMessagesRoutes.js";
import UsersRoutes from "./routes/usersRoutes.js";
import KeysRoutes from "./routes/keysRoutes.js";
import { rateLimiter } from "./utils/limiters.js";
import { authenticate, verifyToken } from "./utils/auth.js";
import { Chat, Cluster, Message, User } from "./utils/db.js";

// ===================== Config =====================
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGINS?.split(",") || "*",
    credentials: true,
    methods: ["GET", "POST"],
  },
  allowEIO3: true, // Engine.IO version compatibility
  transports: ["websocket", "polling"], // Allow polling fallback
});
logStart("websocket");

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
    res.status(429).json({ error: "Too many requests" });
  }
});
logStart("middlewares");

// ===================== Routes =====================
const router = express.Router();

router.use("/auth", AuthRoutes);
router.use("/chats", ChatsRoutes);
router.use("/clusters", ClustersRoutes);
router.use("/invitations", InvitationRoutes);
router.use("/messages", MessagesRoutes);
router.use("/clusterMessages", ClusterMessagesRoutes);
router.use("/users", UsersRoutes);
router.use("/keys", KeysRoutes);

router.get("/files/:file_id", authenticate, async (req, res) => {
  try {
    const safeId = path.basename(req.params.file_id);
    if (safeId !== req.params.file_id) {
      return res.status(400).json({ error: "Invalid file ID" });
    }
    const filePath = join(UPLOAD_DIR, safeId);
    await fs.access(filePath);
    res.sendFile(filePath);
  } catch (err) {
    res.status(404).json({ error: "File not found" });
  }
});

// Health check
router.get("/", (req, res) => {
  res.json({ message: "Cipher Chat API", version: "0.1.0" });
});

router.get("/health", (req, res) => {
  res.json({ status: "healthy" });
});

// Mount routes
app.use("/api", router);
logStart("routes");

// ===================== WebSocket =====================
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error("Authentication error"));
  try {
    const payload = verifyToken(token);
    socket.userId = payload.user_id;
    next();
  } catch (err) {
    next(new Error("Authentication error"));
  }
});

io.on("connection", (socket) => {
  const userId = socket.userId;
  websocketManager.connect(socket, userId);

  socket.on("message", async (data) => {
    if (data.type === "typing") {
      await websocketManager.broadcastTyping({
        userId,
        chatId: data.chatId,
        isTyping: data.isTyping,
      });
    } else if (data.type === "status") {
      await User.updateOne({ _id: userId }, { $set: { status: data.status } });
      if (data.status !== "invisible") {
        await websocketManager.broadcastStatus(userId, data.status);
      }
    }
  });

  socket.on(SocketEvents.USER_TYPING, async (data) => {
    // console.log("[ws] USER_TYPING", { ...data, userId });
    await websocketManager.broadcastTyping({
      userId,
      chatId: data.chatId,
      isTyping: data.isTyping,
    });
  });

  socket.on(SocketEvents.TOPIC_TYPING, async (data) => {
    // console.log("[ws] TOPIC_TYPING", { ...data, userId });
    await websocketManager.broadcastTopicTyping({
      userId,
      clusterId: data.clusterId,
      topicId: data.topicId,
      isTyping: data.isTyping,
    });
  });

  socket.on(SocketEvents.KEY_DEPOSIT_REQUESTED, async (data) => {
    const { context_type, context_id, user_id } = data ?? {};
    if (!context_type || !context_id || !user_id) return;
    try {
      const isMember =
        context_type === "cluster"
          ? await Cluster.exists({ _id: context_id, members: userId })
          : await Chat.exists({ _id: context_id, participants: userId });
      if (!isMember) return;

      const ctx =
        context_type === "cluster"
          ? await Cluster.findById(context_id, "members").lean()
          : await Chat.findById(context_id, "participants").lean();
      const members = ctx?.members ?? ctx?.participants ?? [];

      websocketManager.broadcastToChat(
        SocketEvents.KEY_DEPOSIT_REQUESTED,
        { context_type, context_id, user_id },
        members,
      );
    } catch (err) {
      console.error("[ws] KEY_DEPOSIT_REQUESTED error", err);
    }
  });

  socket.on("disconnect", () => {
    websocketManager.disconnect(userId);
    User.updateOne({ _id: userId }, { $set: { status: "offline" } }).catch(
      console.error,
    );
  });
});

io.on("connection_error", (err) => {
  console.log("Connection error:", err);
});

// ===================== Start Server =====================
httpServer.listen(PORT, () => {
  logStart("ready", PORT);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, closing connections...");
  httpServer.close(() => {
    mongoose.connection.close();
    process.exit(0);
  });
});
