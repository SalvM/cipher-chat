import express from "express";
import { isValidObjectId, Types } from "mongoose";
import { Cluster, ClusterMessage, User } from "../utils/db.js";
import websocketManager from "../websocket.js";
import { authenticate } from "../utils/auth.js";

const router = express.Router();

/* ------------------------------------------------------------------ */
/*  POST /  –  Create a new cluster                                    */
/* ------------------------------------------------------------------ */
router.post("/", authenticate, async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name?.trim() || typeof name !== "string") {
      return res.status(400).json({ error: "Invalid name" });
    }
    if (!description?.trim() || typeof description !== "string") {
      return res.status(400).json({ error: "Invalid description" });
    }

    // Pre-generate both IDs before the insert.
    // ObjectId generation is concurrency-safe: each value embeds a timestamp,
    // a per-process random component, and an atomic counter, making
    // collisions between concurrent requests (or processes) impossible.
    const clusterId = new Types.ObjectId();

    const cluster = await Cluster.create({
      _id: clusterId,
      name: name.trim(),
      description: description.trim(),
      owner_id: req.user._id,
      members: [req.user._id],
      topics: [
        {
          _id: new Types.ObjectId(),
          name: "general",
          cluster_id: clusterId,
        },
      ],
    });

    res.status(201).json(cluster);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ------------------------------------------------------------------ */
/*  GET /  –  List all clusters the authenticated user belongs to      */
/* ------------------------------------------------------------------ */
router.get("/", authenticate, async (req, res) => {
  try {
    const clusters = await Cluster.find({ members: req.user._id }).lean();

    res.json({ clusters });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ------------------------------------------------------------------ */
/*  GET /:cluster_id  –  Cluster detail with member information        */
/* ------------------------------------------------------------------ */
router.get("/:cluster_id", authenticate, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.cluster_id)) {
      return res.status(400).json({ error: "Invalid cluster ID" });
    }

    const cluster = await Cluster.findOne({
      _id: req.params.cluster_id,
      members: req.user._id,
    }).lean();

    if (!cluster) {
      return res.status(404).json({ error: "Cluster not found" });
    }

    // Single query for all members.
    const users = await User.find(
      { _id: { $in: cluster.members } },
      "_id username display_name avatar",
    ).lean();

    // Overlay real-time WebSocket status on top of the persisted value.
    cluster.member_details = users.map((user) => ({
      ...user,
      status:
        websocketManager.userStatus.get(user._id.toString()) ?? user.status,
    }));

    res.json(cluster);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ------------------------------------------------------------------ */
/*  POST /:cluster_id/topics  –  Add a topic to a cluster              */
/* ------------------------------------------------------------------ */
router.post("/:cluster_id/topics", authenticate, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.cluster_id)) {
      return res.status(400).json({ error: "Invalid cluster ID" });
    }

    const { name } = req.body;
    if (!name?.trim() || typeof name !== "string") {
      return res.status(400).json({ error: "Invalid topic name" });
    }

    const newTopic = {
      _id: new Types.ObjectId(),
      name: name.trim(),
      cluster_id: req.params.cluster_id,
      created_at: new Date(),
    };

    // Atomic update: avoids a find → in-memory mutation → save round-trip.
    const cluster = await Cluster.findOneAndUpdate(
      { _id: req.params.cluster_id, members: req.user._id },
      { $push: { topics: newTopic } },
      { after: true },
    );

    if (!cluster) {
      return res.status(404).json({ error: "Cluster not found" });
    }

    res.status(201).json(newTopic);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ------------------------------------------------------------------ */
/*  GET /:cluster_id/topics/:topic_id/messages                         */
/* ------------------------------------------------------------------ */
router.get(
  "/:cluster_id/topics/:topic_id/messages",
  authenticate,
  async (req, res) => {
    try {
      if (!isValidObjectId(req.params.cluster_id)) {
        return res.status(400).json({ error: "Invalid cluster ID" });
      }

      // Clamp limit to a safe range to prevent abuse.
      const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 100);

      // Run membership check and message fetch in parallel to save one DB round-trip.
      const [membership, messages] = await Promise.all([
        Cluster.exists({ _id: req.params.cluster_id, members: req.user._id }),
        // sort(-1) + limit(N): fetches the N most recent messages efficiently by
        // scanning the index from newest to oldest and stopping at N.
        // reverse() then restores chronological (oldest-first) order for the client.
        // Changing to sort(1) would return the N *oldest* messages ever.
        ClusterMessage.find({
          cluster_id: req.params.cluster_id,
          topic_id: req.params.topic_id,
        })
          .sort({ created_at: -1 })
          .limit(limit)
          .lean(),
      ]);

      if (!membership) {
        return res.status(404).json({ error: "Cluster not found" });
      }

      res.json({ messages: messages.reverse() });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  },
);

export default router;
