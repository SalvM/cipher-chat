import express from "express";
import mongoose from "mongoose";
import { ConversationKey, User, Cluster, Chat } from "../utils/db.js";
import { authenticate } from "../utils/auth.js";
import websocketManager from "../websocket.js";
import SocketEvents from "../socketEvents.js";

const router = express.Router();

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// PUT /identity — store caller's RSA public key
router.put("/identity", authenticate, async (req, res) => {
  try {
    const { public_key } = req.body;
    if (!public_key || typeof public_key !== "string") {
      return res.status(400).json({ error: "public_key is required" });
    }
    await User.updateOne({ _id: req.user._id }, { $set: { public_key } });
    res.status(204).end();
  } catch (err) {
    console.error("[keysRoutes] PUT /identity", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /identity/:user_id — fetch a user's RSA public key
router.get("/identity/:user_id", authenticate, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.user_id)) {
      return res.status(400).json({ error: "Invalid user_id" });
    }
    const user = await User.findById(req.params.user_id, "public_key").lean();
    if (!user || !user.public_key) {
      return res.status(404).json({ error: "Public key not found" });
    }
    res.json({ public_key: user.public_key });
  } catch (err) {
    console.error("[keysRoutes] GET /identity/:user_id", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /conversation — upload encrypted conversation key envelopes
router.post("/conversation", authenticate, async (req, res) => {
  try {
    const { context_type, context_id, keys } = req.body;

    if (!["chat", "cluster"].includes(context_type)) {
      return res.status(400).json({ error: "Invalid context_type" });
    }
    if (!isValidObjectId(context_id)) {
      return res.status(400).json({ error: "Invalid context_id" });
    }
    if (!Array.isArray(keys) || keys.length === 0 || keys.length > 500) {
      return res.status(400).json({ error: "Invalid keys array" });
    }

    const isMember =
      context_type === "chat"
        ? await Chat.exists({ _id: context_id, participants: req.user._id })
        : await Cluster.exists({ _id: context_id, members: req.user._id });

    if (!isMember) {
      return res.status(403).json({ error: "Not a member" });
    }

    for (const k of keys) {
      if (
        !isValidObjectId(k.user_id) ||
        typeof k.encrypted_key !== "string" ||
        !k.encrypted_key
      ) {
        return res.status(400).json({ error: "Invalid key entry" });
      }
    }

    await ConversationKey.bulkWrite(
      keys.map((k) => ({
        updateOne: {
          filter: { context_type, context_id, user_id: k.user_id },
          update: {
            $set: {
              encrypted_key: k.encrypted_key,
              key_version: k.key_version ?? 1,
            },
          },
          upsert: true,
        },
      })),
    );

    res.status(204).end();
  } catch (err) {
    console.error("[keysRoutes] POST /conversation", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /conversation — fetch caller's encrypted conversation key
router.get("/conversation", authenticate, async (req, res) => {
  try {
    const { context_type, context_id } = req.query;

    if (!["chat", "cluster"].includes(context_type)) {
      return res.status(400).json({ error: "Invalid context_type" });
    }
    if (!isValidObjectId(context_id)) {
      return res.status(400).json({ error: "Invalid context_id" });
    }

    const ck = await ConversationKey.findOne(
      { context_type, context_id, user_id: req.user._id },
      "encrypted_key key_version",
    ).lean();

    if (!ck) {
      const anyExists = await ConversationKey.exists({ context_type, context_id });
      const code = anyExists ? "KEY_PENDING" : "NO_KEY";
      return res.status(404).json({ error: "Key not found", code });
    }

    res.json({ encrypted_key: ck.encrypted_key, key_version: ck.key_version });
  } catch (err) {
    console.error("[keysRoutes] GET /conversation", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /members/:cluster_id — fetch all cluster members' public keys
router.get("/members/:cluster_id", authenticate, async (req, res) => {
  try {
    const { cluster_id } = req.params;

    if (!isValidObjectId(cluster_id)) {
      return res.status(400).json({ error: "Invalid cluster_id" });
    }

    const cluster = await Cluster.findOne(
      { _id: cluster_id, members: req.user._id },
      "members",
    ).lean();

    if (!cluster) {
      return res.status(403).json({ error: "Not a member of this cluster" });
    }

    const members = await User.find(
      { _id: { $in: cluster.members } },
      "_id public_key",
    ).lean();

    res.json({
      members: members.map((m) => ({
        user_id: m._id.toString(),
        public_key: m.public_key || null,
      })),
    });
  } catch (err) {
    console.error("[keysRoutes] GET /members/:cluster_id", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /rotate — rotate cluster conversation key after member removal
router.post("/rotate", authenticate, async (req, res) => {
  try {
    const { cluster_id, new_key_version, keys } = req.body;

    if (!isValidObjectId(cluster_id)) {
      return res.status(400).json({ error: "Invalid cluster_id" });
    }
    if (!Number.isInteger(new_key_version) || new_key_version < 1) {
      return res.status(400).json({ error: "Invalid new_key_version" });
    }
    if (!Array.isArray(keys) || keys.length === 0) {
      return res.status(400).json({ error: "Invalid keys array" });
    }

    const cluster = await Cluster.findOne(
      { _id: cluster_id, members: req.user._id },
      "members",
    ).lean();

    if (!cluster) {
      return res.status(404).json({ error: "Cluster not found" });
    }

    const currentMemberIds = new Set(cluster.members.map((m) => m.toString()));
    const providedMemberIds = new Set(keys.map((k) => k.user_id.toString()));

    if (
      currentMemberIds.size !== providedMemberIds.size ||
      [...currentMemberIds].some((id) => !providedMemberIds.has(id))
    ) {
      return res
        .status(400)
        .json({ error: "Keys must cover all current members exactly" });
    }

    for (const k of keys) {
      if (
        !isValidObjectId(k.user_id) ||
        typeof k.encrypted_key !== "string" ||
        !k.encrypted_key
      ) {
        return res.status(400).json({ error: "Invalid key entry" });
      }
    }

    await ConversationKey.bulkWrite(
      keys.map((k) => ({
        updateOne: {
          filter: {
            context_type: "cluster",
            context_id: cluster_id,
            user_id: k.user_id,
          },
          update: {
            $set: {
              encrypted_key: k.encrypted_key,
              key_version: new_key_version,
            },
          },
          upsert: true,
        },
      })),
    );

    await ConversationKey.deleteMany({
      context_type: "cluster",
      context_id: cluster_id,
      key_version: { $lt: new_key_version },
    });

    websocketManager.broadcastToChat(
      SocketEvents.CLUSTER_KEY_ROTATED,
      { cluster_id, new_key_version },
      cluster.members,
    );

    res.status(204).end();
  } catch (err) {
    console.error("[keysRoutes] POST /rotate", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
