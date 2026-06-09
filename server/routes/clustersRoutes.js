import express from "express";
import { isValidObjectId, Types } from "mongoose";
import { Cluster, ClusterMessage, User } from "../utils/db.js";
import websocketManager from "../websocket.js";
import { authenticate } from "../utils/auth.js";
import SocketEvents from "../socketEvents.js";

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
          description: "",
          cluster_id: clusterId,
          disappearing_minutes: 0,
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
    const clusters = await Cluster.find({
      members: req.user._id,
    })
      .select("_id name description owner_id members topics created_at")
      .lean();

    const allMemberIds = [...new Set(clusters.flatMap((c) => c.members))];
    const users = await User.find(
      { _id: { $in: allMemberIds } },
      "_id username display_name avatar",
    ).lean();

    const userMap = new Map(users.map((u) => [u._id.toString(), u]));
    const enrichedClusters = clusters.map((cluster) => ({
      ...cluster,
      member_details: cluster.members.map((memberId) =>
        userMap.get(memberId.toString()),
      ),
    }));

    res.json({ clusters: enrichedClusters });
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

    const { name, description, disappearing_minutes } = req.body;
    if (!name?.trim() || typeof name !== "string") {
      return res.status(400).json({ error: "Invalid topic name" });
    }
    if (
      description !== undefined &&
      (!description?.trim() || typeof description !== "string")
    ) {
      return res.status(400).json({ error: "Invalid topic description" });
    }

    const newTopic = {
      _id: new Types.ObjectId(),
      name: name.trim(),
      description: description ?? "",
      disappearing_minutes: disappearing_minutes ?? 0,
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

    websocketManager.broadcastToChat(
      SocketEvents.NEW_TOPIC,
      {
        cluster_id: req.params.cluster_id,
        topic: newTopic,
      },
      cluster.members,
    );

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

/* ------------------------------------------------------------------ */
/*  PUT /:cluster_id  –  Update cluster (name, description)            */
/* ------------------------------------------------------------------ */
router.put("/:cluster_id", authenticate, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.cluster_id)) {
      return res.status(400).json({ error: "Invalid cluster ID" });
    }

    const { name, description } = req.body;

    if (name === undefined && description === undefined) {
      return res
        .status(400)
        .json({ error: "At least one field must be provided for update" });
    }

    if (name !== undefined) {
      if (!name?.trim() || typeof name !== "string") {
        return res.status(400).json({ error: "Invalid name" });
      }
    }

    if (description !== undefined) {
      if (!description?.trim() || typeof description !== "string") {
        return res.status(400).json({ error: "Invalid description" });
      }
    }

    const updateFields = {};
    if (name !== undefined) updateFields.name = name.trim();
    if (description !== undefined)
      updateFields.description = description.trim();

    const cluster = await Cluster.findOneAndUpdate(
      {
        _id: req.params.cluster_id,
        owner_id: req.user._id,
      },
      { $set: updateFields },
      { new: true, runValidators: true },
    ).lean();

    if (!cluster) {
      return res
        .status(403)
        .json({ error: "Cluster not found or user is not the owner" });
    }

    websocketManager.broadcastToChat(
      SocketEvents.CLUSTER_SETTINGS_UPDATED,
      { cluster },
      cluster.members,
    );

    res.json(cluster);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ------------------------------------------------------------------ */
/*  DELETE /:cluster_id  –  Delete cluster (owner only)               */
/* ------------------------------------------------------------------ */
router.delete("/:cluster_id", authenticate, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.cluster_id)) {
      return res.status(400).json({ error: "Invalid cluster ID" });
    }

    const cluster = await Cluster.findOne({
      _id: req.params.cluster_id,
      owner_id: req.user._id,
    });

    if (!cluster) {
      return res
        .status(403)
        .json({ error: "Cluster not found or user is not the owner" });
    }

    await Promise.all([
      Cluster.deleteOne({ _id: req.params.cluster_id }),
      ClusterMessage.deleteMany({ cluster_id: req.params.cluster_id }),
    ]);

    websocketManager.broadcastToChat(
      SocketEvents.CLUSTER_DELETED,
      { cluster_id: req.params.cluster_id },
      cluster.members,
    );

    res.json({ message: "Cluster deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ------------------------------------------------------------------ */
/*  PUT /:cluster_id/topic/:topic_id  –  Update a topic's properties  */
/* ------------------------------------------------------------------ */
router.put("/:cluster_id/topics/:topic_id", authenticate, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.cluster_id)) {
      return res.status(400).json({ error: "Invalid cluster ID" });
    }
    if (!isValidObjectId(req.params.topic_id)) {
      return res.status(400).json({ error: "Invalid topic ID" });
    }

    const { disappearing_minutes, name, description } = req.body;

    // Validation...
    if (
      disappearing_minutes === undefined &&
      name === undefined &&
      description === undefined
    ) {
      return res
        .status(400)
        .json({ error: "At least one field must be provided for update" });
    }
    if (disappearing_minutes !== undefined) {
      if (
        typeof disappearing_minutes !== "number" ||
        disappearing_minutes < 0 ||
        !Number.isInteger(disappearing_minutes)
      ) {
        return res.status(400).json({
          error: "disappearing_minutes must be a non-negative integer",
        });
      }
    }
    if (name !== undefined) {
      if (!name?.trim() || typeof name !== "string") {
        return res.status(400).json({ error: "Invalid topic name" });
      }
    }
    if (description !== undefined) {
      if (!description?.trim() || typeof description !== "string") {
        return res.status(400).json({ error: "Invalid topic description" });
      }
    }

    // BUILD $set with dot notation instead of replacing subdocument
    const updateFields = {};
    if (disappearing_minutes !== undefined)
      updateFields["topics.$[topic].disappearing_minutes"] =
        disappearing_minutes;
    if (name !== undefined) updateFields["topics.$[topic].name"] = name.trim();
    if (description !== undefined)
      updateFields["topics.$[topic].description"] = description.trim();

    const cluster = await Cluster.findOneAndUpdate(
      {
        _id: req.params.cluster_id,
        members: req.user._id,
        owner_id: req.user._id,
        "topics._id": req.params.topic_id,
      },
      {
        $set: updateFields,
      },
      {
        arrayFilters: [{ "topic._id": req.params.topic_id }],
        new: true, // Return updated document
        runValidators: true,
      },
    ).lean();

    if (!cluster) {
      return res.status(404).json({
        error: "Cluster not found, topic not found, or user is not the owner",
      });
    }

    const updatedTopic = cluster.topics.find(
      (topic) => topic._id.toString() === req.params.topic_id,
    );
    if (!updatedTopic) {
      return res.status(404).json({ error: "Topic not found" });
    }

    websocketManager.broadcastToChat(
      SocketEvents.TOPIC_SETTINGS_UPDATED,
      {
        cluster_id: req.params.cluster_id,
        topic: updatedTopic,
      },
      cluster.members,
    );

    res.json(updatedTopic); // Return the updated topic
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ------------------------------------------------------------------ */
/*  DELETE /:cluster_id/topics/:topic_id  –  Delete topic (owner only)*/
/* ------------------------------------------------------------------ */
router.delete(
  "/:cluster_id/topics/:topic_id",
  authenticate,
  async (req, res) => {
    try {
      if (!isValidObjectId(req.params.cluster_id)) {
        return res.status(400).json({ error: "Invalid cluster ID" });
      }
      if (!isValidObjectId(req.params.topic_id)) {
        return res.status(400).json({ error: "Invalid topic ID" });
      }

      const cluster = await Cluster.findOne({
        _id: req.params.cluster_id,
        owner_id: req.user._id,
        "topics._id": req.params.topic_id,
      });

      if (!cluster) {
        return res.status(403).json({
          error: "Cluster not found, topic not found, or user is not the owner",
        });
      }

      await Promise.all([
        Cluster.findByIdAndUpdate(req.params.cluster_id, {
          $pull: { topics: { _id: req.params.topic_id } },
        }),
        ClusterMessage.deleteMany({
          cluster_id: req.params.cluster_id,
          topic_id: req.params.topic_id,
        }),
      ]);

      websocketManager.broadcastToChat(
        SocketEvents.TOPIC_DELETED,
        {
          cluster_id: req.params.cluster_id,
          topic_id: req.params.topic_id,
        },
        cluster.members,
      );

      res.json({ message: "Topic deleted" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  },
);

/* ------------------------------------------------------------------ */
/*  DELETE /:cluster_id/members/:member_id  –  Remove member (owner)  */
/* ------------------------------------------------------------------ */
router.delete(
  "/:cluster_id/members/:member_id",
  authenticate,
  async (req, res) => {
    try {
      if (!isValidObjectId(req.params.cluster_id)) {
        return res.status(400).json({ error: "Invalid cluster ID" });
      }
      if (!isValidObjectId(req.params.member_id)) {
        return res.status(400).json({ error: "Invalid member ID" });
      }

      const cluster = await Cluster.findOneAndUpdate(
        {
          _id: req.params.cluster_id,
          owner_id: req.user._id,
        },
        { $pull: { members: req.params.member_id } },
        { new: true },
      ).lean();

      if (!cluster) {
        return res.status(403).json({
          error: "Cluster not found or user is not the owner",
        });
      }

      websocketManager.broadcastToChat(
        SocketEvents.MEMBER_REMOVED,
        {
          cluster_id: req.params.cluster_id,
          user_id: req.params.member_id,
        },
        [...cluster.members, req.params.member_id],
      );

      res.json({ message: "Member removed" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  },
);

export default router;
