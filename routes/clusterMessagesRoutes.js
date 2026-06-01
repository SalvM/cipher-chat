import fs from "fs/promises";
import { join } from "path";
import express from "express";
import { Cluster, ClusterMessage } from "../utils/db.js";

import SocketEvents from "../socketEvents.js";
import websocketManager from "../websocket.js";
import { UPLOAD_DIR } from "../directories.js";
import { ALLOWED_IMAGE_TYPES, upload } from "../utils/upload.js";
import { authenticate } from "../utils/auth.js";

const router = express.Router();

router.post("/", authenticate, async (req, res) => {
  try {
    const { content, cluster_id, topic_id, reply_to } = req.body;

    if (!content?.trim()) {
      return res.status(400).json({ error: "Content is required" });
    }

    const cluster = await Cluster.findOne({
      _id: cluster_id,
      members: req.user._id,
    }).lean();

    if (!cluster) {
      return res.status(404).json({ error: "Cluster not found" });
    }

    const topicExists = cluster.topics.some((t) => t._id.equals(topic_id));
    if (!topicExists) {
      return res.status(404).json({ error: "Topic not found" });
    }

    let replyToContent = null;
    if (reply_to) {
      const replyMsg = await ClusterMessage.findById(reply_to)
        .select("sender_display_name content")
        .lean();
      if (replyMsg) {
        replyToContent = `${replyMsg.sender_display_name}: ${replyMsg.content.substring(0, 100)}`;
      }
    }

    const clusterMessage = await ClusterMessage.create({
      content,
      sender_id: req.user._id,
      sender_username: req.user.username,
      sender_display_name: req.user.display_name,
      sender_avatar: req.user.avatar,
      cluster_id,
      topic_id,
      reply_to,
      reply_to_content: replyToContent,
    });

    const messageObj = clusterMessage.toObject();

    websocketManager.broadcastToChat(
      SocketEvents.CLUSTER_MESSAGE,
      { cluster_id, topic_id, message: messageObj },
      cluster.members,
    );

    res.status(201).json(messageObj);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/:message_id", authenticate, async (req, res) => {
  try {
    const { content } = req.body;
    const edited_at = new Date();

    const message = await ClusterMessage.findOneAndUpdate(
      { _id: req.params.message_id, sender_id: req.user._id },
      { $set: { content, edited: true, edited_at } },
      { lean: true },
    );

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    const cluster = await Cluster.findById(message.cluster_id)
      .select("members")
      .lean();

    if (cluster) {
      websocketManager.broadcastToChat(
        SocketEvents.CLUSTER_MESSAGE_EDITED,
        {
          cluster_id: message.cluster_id,
          topic_id: message.topic_id,
          message_id: message._id,
          content,
          edited_at,
        },
        cluster.members,
      );
    }

    res.json({ _id: message._id, content, edited: true, edited_at });
  } catch (err) {
    console.error(
      `Error processing message update for ${req.params.message_id}:`,
      err,
    );
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/:message_id", authenticate, async (req, res) => {
  try {
    const message = await ClusterMessage.findOneAndDelete({
      _id: req.params.message_id,
      sender_id: req.user._id,
    }).lean();

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    await Promise.allSettled(
      (message.attachments ?? []).map((attachment) =>
        fs.unlink(join(UPLOAD_DIR, attachment.file_id)),
      ),
    );

    const cluster = await Cluster.findById(message.cluster_id)
      .select("members")
      .lean();

    if (cluster) {
      websocketManager.broadcastToChat(
        SocketEvents.CLUSTER_MESSAGE_DELETED,
        {
          message_id: message._id,
          topic_id: message.topic_id,
          cluster_id: message.cluster_id,
        },
        cluster.members,
      );
    }

    res.json({ deleted: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ClusterMessage Reactions
async function getMessageAndCluster(messageId, userId) {
  const message = await ClusterMessage.findById(messageId)
    .select("cluster_id topic_id")
    .lean();
  if (!message) return { message: null, cluster: null };

  const cluster = await Cluster.findOne({
    _id: message.cluster_id,
    members: userId,
  })
    .select("members")
    .lean();

  return { message, cluster };
}

router.post("/:message_id/reactions", authenticate, async (req, res) => {
  try {
    const { emoji } = req.body;
    const { message, cluster } = await getMessageAndCluster(
      req.params.message_id,
      req.user._id,
    );

    if (!message) return res.status(404).json({ error: "Message not found" });
    if (!cluster) return res.status(403).json({ error: "Not authorized" });

    await ClusterMessage.updateOne(
      { _id: message._id },
      { $addToSet: { [`reactions.${emoji}`]: req.user._id } },
    );

    websocketManager.broadcastToChat(
      SocketEvents.CLUSTER_MESSAGE_REACTION,
      {
        cluster_id: message.cluster_id,
        topic_id: message.topic_id,
        message_id: message._id,
        emoji,
        user_id: req.user._id,
        action: "add",
      },
      cluster.members,
    );

    res.json({ success: true, emoji });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.delete(
  "/:message_id/reactions/:emoji",
  authenticate,
  async (req, res) => {
    try {
      const { emoji } = req.params;
      const { message, cluster } = await getMessageAndCluster(
        req.params.message_id,
        req.user._id,
      );

      if (!message) return res.status(404).json({ error: "Message not found" });
      if (!cluster) return res.status(403).json({ error: "Not authorized" });

      await ClusterMessage.updateOne(
        { _id: message._id },
        { $pull: { [`reactions.${emoji}`]: req.user._id } },
      );

      websocketManager.broadcastToChat(
        SocketEvents.CLUSTER_MESSAGE_REACTION,
        {
          cluster_id: message.cluster_id,
          topic_id: message.topic_id,
          message_id: message._id,
          emoji,
          user_id: req.user._id,
          action: "remove",
        },
        cluster.members,
      );

      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  },
);

router.post(
  "/with-attachment",
  authenticate,
  upload.single("file"),
  async (req, res) => {
    try {
      const { content, cluster_id, topic_id, reply_to } = req.body;

      const cluster = await Cluster.findOne({
        _id: cluster_id,
        members: req.user._id,
      }).lean();

      if (!cluster) {
        await fs.unlink(req.file.path);
        return res.status(404).json({ error: "Cluster not found" });
      }

      const attachment = {
        file_id: req.file.filename,
        original_name: req.file.originalname,
        content_type: req.file.mimetype,
        size: req.file.size,
        is_image: ALLOWED_IMAGE_TYPES.includes(req.file.mimetype),
        uploaded_at: new Date(),
      };

      const message = await ClusterMessage.create({
        content: content || "",
        sender_id: req.user._id,
        sender_username: req.user.username,
        sender_display_name: req.user.display_name,
        sender_avatar: req.user.avatar,
        cluster_id,
        topic_id,
        reply_to,
        attachments: [attachment],
      });

      const messageObj = message.toObject();

      websocketManager.broadcastToChat(
        SocketEvents.CLUSTER_MESSAGE,
        { cluster_id, topic_id, message: messageObj },
        cluster.members,
      );

      res.status(201).json(messageObj);
    } catch (err) {
      console.error(err);
      if (req.file) {
        await fs.unlink(req.file.path).catch(console.error);
      }
      res.status(500).json({ error: "Server error" });
    }
  },
);

export default router;
