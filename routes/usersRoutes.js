import express from "express";
import { User } from "../utils/db.js";
import websocketManager from "../websocket.js";
import { authenticate } from "../utils/auth.js";

const router = express.Router();

router.get("/search", authenticate, async (req, res) => {
  try {
    const { q } = req.query;

    const user = await User.findOne(
      { username_lower: q.toLowerCase() },
      "-password_hash -recovery_hash",
    ).lean();

    if (!user) {
      return res.json({ users: [] });
    }

    // Add real-time status
    user.status = websocketManager.userStatus.get(user._id) || user.status;

    res.json({ users: [user] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/blocked", authenticate, async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.user._id }).lean();
    const blockedIds = user.blocked_users || [];

    if (blockedIds.length === 0) {
      return res.json({ blocked_users: [] });
    }

    const blocked = await User.find(
      { _id: { $in: blockedIds } },
      "_id username display_name avatar",
    ).lean();

    res.json({ blocked_users: blocked });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/:user_id", authenticate, async (req, res) => {
  try {
    const user = await User.findOne(
      { _id: req.params.user_id },
      "-password_hash -recovery_hash",
    ).lean();

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.status = websocketManager.userStatus.get(user._id) || user.status;

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Block/Unblock routes
router.post("/block", authenticate, async (req, res) => {
  try {
    const { user_id } = req.body;

    if (user_id === req.user._id.toString()) {
      return res.status(400).json({ error: "Cannot block yourself" });
    }

    const target = await User.findOne({ _id: user_id });
    if (!target) {
      return res.status(404).json({ error: "User not found" });
    }

    await User.updateOne(
      { _id: req.user._id },
      { $addToSet: { blocked_users: user_id } },
    );

    res.json({ success: true, blocked_user_id: user_id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/block/:user_id", authenticate, async (req, res) => {
  try {
    await User.updateOne(
      { _id: req.user._id },
      { $pull: { blocked_users: req.params.user_id } },
    );

    res.json({ success: true, unblocked_user_id: req.params.user_id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
