import express from "express";
import moment from "moment/moment.js";
import { Cluster, Invitation, User } from "../utils/db.js";
import websocketManager from "../websocket.js";
import SocketEvents from "../socketEvents.js";
import { authenticate } from "../utils/auth.js";

const router = express.Router();
const MIN_INVITATION_EXPIRING_HOURS = 1;
const MAX_INVITATION_EXPIRING_HOURS = 2400;

router.get("/:invitation_id", authenticate, async (req, res) => {
  try {
    const invitation = await Invitation.findOne({
      _id: req.params.invitation_id,
    }).lean();

    if (!invitation) {
      return res.status(404).json({ error: "Invitation not found" });
    }

    const cluster = await Cluster.findOne({
      _id: invitation.cluster_id,
    }).lean();

    if (!cluster) {
      return res.status(404).json({ error: "Cluster not found" });
    }

    if (
      cluster.members.some((_id) => _id.toString() === req.user._id.toString())
    ) {
      return res.json({ message: "Already a member" });
    }
    const updateData = {};
    updateData.members = [...cluster.members, req.user._id];
    await Cluster.updateOne({ _id: cluster._id }, { $set: updateData });

    User.findOne({ _id: req.user._id }, "-password_hash -recovery_hash")
      .lean()
      .then((memberDetail) => {
        if (memberDetail) {
          memberDetail.status =
            websocketManager.userStatus.get(req.user._id.toString()) ||
            memberDetail.status;
        }
        return memberDetail;
      })
      .catch((err) => console.error("[invitationsRoutes] GET /", err))
      .then((memberDetail) => {
        websocketManager.broadcastToChat(
          SocketEvents.USER_JOINED_CLUSTER,
          {
            user_id: req.user._id,
            cluster_id: cluster._id,
            memberDetail,
          },
          cluster.members,
        );
      });

    res.json({ message: `Joined ${cluster.name} successfully` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/", authenticate, async (req, res) => {
  try {
    let { clusterId, expireHours } = req.body;
    const cluster = await Cluster.findOne({
      _id: clusterId,
      owner_id: req.user._id,
    }).lean();

    if (!cluster) {
      return res
        .status(403)
        .json({ error: "Only the owner can create an invitation." });
    }

    expireHours =
      expireHours > MAX_INVITATION_EXPIRING_HOURS
        ? Math.min(expireHours, MAX_INVITATION_EXPIRING_HOURS)
        : expireHours <= MIN_INVITATION_EXPIRING_HOURS
          ? Math.max(expireHours, MIN_INVITATION_EXPIRING_HOURS)
          : expireHours;

    const invitation = new Invitation({
      cluster_id: clusterId,
      expires_at: moment().add(expireHours, "hours"),
    });
    await invitation.save();

    res.json({ invitationId: invitation._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
