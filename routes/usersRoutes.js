import express from "express";
import mongoose from "mongoose";
import { User } from "../utils/db.js";
import websocketManager from "../websocket.js";
import { authenticate } from "../utils/auth.js";

const router = express.Router();

// ── Constants ──────────────────────────────────────────────────────────────

const USER_PUBLIC_PROJECTION = "_id username display_name avatar status";

// ── Helpers ────────────────────────────────────────────────────────────────

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// ── Routes ─────────────────────────────────────────────────────────────────

router.get("/search", authenticate, async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== "string" || q.trim().length < 2) {
      return res.status(400).json({ error: "Query too short" });
    }

    const user = await User.findOne(
      { username_lower: q.trim().toLowerCase() },
      USER_PUBLIC_PROJECTION,
    ).lean();

    if (!user) {
      return res.json({ users: [] });
    }

    // Do not return the same object
    if (user._id.equals(req.user._id)) {
      return res.json({ users: [] });
    }

    user.status =
      websocketManager.userStatus.get(user._id.toString()) ?? user.status;

    res.status(200).json({ users: [user] });
  } catch (err) {
    console.error("[usersRoutes] GET /search", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/blocked", authenticate, async (req, res) => {
  try {
    const currentUser = await User.findOne(
      { _id: req.user._id },
      "blocked_users",
    ).lean();

    const blockedIds = currentUser?.blocked_users ?? [];

    if (blockedIds.length === 0) {
      return res.json({ blocked_users: [] });
    }

    const blocked = await User.find(
      { _id: { $in: blockedIds } },
      "_id username display_name avatar",
    ).lean();

    res.status(200).json({ blocked_users: blocked });
  } catch (err) {
    console.error("[usersRoutes] GET /blocked", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/:user_id", authenticate, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.user_id)) {
      return res.status(400).json({ error: "Invalid user id" });
    }

    const user = await User.findOne(
      { _id: req.params.user_id },
      USER_PUBLIC_PROJECTION,
    ).lean();

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.status =
      websocketManager.userStatus.get(user._id.toString()) ?? user.status;

    res.status(200).json(user);
  } catch (err) {
    console.error("[usersRoutes] GET /:user_id", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ── Block / Unblock ────────────────────────────────────────────────────────

router.post("/block", authenticate, async (req, res) => {
  try {
    const { user_id } = req.body;

    if (!user_id || !isValidObjectId(user_id)) {
      return res.status(400).json({ error: "Invalid user_id" });
    }

    if (req.user._id.equals(user_id)) {
      return res.status(400).json({ error: "Cannot block yourself" });
    }

    const targetExists = await User.exists({ _id: user_id });
    if (!targetExists) {
      return res.status(404).json({ error: "User not found" });
    }

    await User.updateOne(
      { _id: req.user._id },
      { $addToSet: { blocked_users: user_id } },
    );

    res.status(200).json({ success: true, blocked_user_id: user_id });
  } catch (err) {
    console.error("[usersRoutes] POST /block", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/block/:user_id", authenticate, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.user_id)) {
      return res.status(400).json({ error: "Invalid user_id" });
    }

    await User.updateOne(
      { _id: req.user._id },
      { $pull: { blocked_users: req.params.user_id } },
    );

    res
      .status(200)
      .json({ success: true, unblocked_user_id: req.params.user_id });
  } catch (err) {
    console.error("[usersRoutes] DELETE /block/:user_id", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
