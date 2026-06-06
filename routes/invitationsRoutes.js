import express from "express";
import mongoose from "mongoose";
import {
  Cluster,
  Invitation,
  User,
  MIN_INVITATION_EXPIRING_HOURS,
  MAX_INVITATION_EXPIRING_HOURS,
} from "../utils/db.js";
import websocketManager from "../websocket.js";
import SocketEvents from "../socketEvents.js";
import { authenticate } from "../utils/auth.js";

const router = express.Router();

// ── Helpers ────────────────────────────────────────────────────────────────

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function clampHours(h) {
  return Math.min(
    Math.max(h, MIN_INVITATION_EXPIRING_HOURS),
    MAX_INVITATION_EXPIRING_HOURS,
  );
}

// ── Routes ─────────────────────────────────────────────────────────────────

/**
 * GET /:invitation_id
 * Adds the user to the cluster via an invitation link.
 */
router.get("/:invitation_id", authenticate, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.invitation_id)) {
      return res.status(400).json({ error: "Invalid invitation id" });
    }

    const invitation = await Invitation.findOne(
      {
        _id: req.params.invitation_id,
      },
      "_id cluster_id expires_at",
    ).lean();

    if (!invitation) {
      return res.status(404).json({ error: "Invitation not found" });
    }

    // Expiration check
    if (invitation.expires_at && new Date() > invitation.expires_at) {
      return res.status(410).json({ error: "Invitation has expired" });
    }

    const cluster = await Cluster.findOne(
      { _id: invitation.cluster_id },
      "_id name members",
    ).lean();

    if (!cluster) {
      return res.status(404).json({ error: "Cluster not found" });
    }

    if (cluster.members.some((id) => id.equals(req.user._id))) {
      return res.json({ message: "Already a member" });
    }

    await Cluster.updateOne(
      { _id: cluster._id },
      { $addToSet: { members: req.user._id } },
    );

    setImmediate(() => {
      User.findOne(
        { _id: req.user._id },
        "_id username display_name avatar status",
      )
        .lean()
        .then((memberDetail) => {
          if (memberDetail) {
            memberDetail.status =
              websocketManager.userStatus.get(req.user._id.toString()) ||
              memberDetail.status;
          }
          websocketManager.broadcastToChat(
            SocketEvents.USER_JOINED_CLUSTER,
            {
              cluster_id: cluster._id,
              user: memberDetail,
            },
            cluster.members,
          );
        })
        .catch((err) =>
          console.error("[invitationsRoutes] broadcast error", err),
        );
    });

    res.status(200).json({ message: `Joined ${cluster.name} successfully` });
  } catch (err) {
    console.error("[invitationsRoutes] GET /:invitation_id", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * POST /
 * Create a new invitation link for a cluster.
 */
router.post("/", authenticate, async (req, res) => {
  try {
    let { clusterId, expireHours } = req.body;

    if (!clusterId || !isValidObjectId(clusterId)) {
      return res.status(400).json({ error: "Invalid clusterId" });
    }

    expireHours = Number(expireHours);
    if (!Number.isFinite(expireHours)) {
      expireHours = MIN_INVITATION_EXPIRING_HOURS;
    }
    expireHours = clampHours(expireHours);

    const clusterExists = await Cluster.exists({
      _id: clusterId,
      owner_id: req.user._id,
    });

    if (!clusterExists) {
      return res
        .status(403)
        .json({ error: "Only the owner can create an invitation." });
    }

    const expiresAt = new Date(Date.now() + expireHours * 3_600_000);

    const invitation = await Invitation.create({
      cluster_id: clusterId,
      expires_at: expiresAt,
    });

    res.status(201).json({ invitationId: invitation._id });
  } catch (err) {
    console.error("[invitationsRoutes] POST /", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
