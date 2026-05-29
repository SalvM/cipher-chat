import fs from "fs/promises";
import { join } from "path";
import express from "express";
import { Chat, User, Message } from "../utils/db.js";

import SocketEvents from "../socketEvents.js";
import websocketManager from "../websocket.js";
import { UPLOAD_DIR } from "../directories.js";
import { ALLOWED_IMAGE_TYPES, upload } from "../utils/upload.js";
import { authenticate } from "../utils/auth.js";

const router = express.Router();

router.post("/", authenticate, async (req, res) => {
  try {
    const { content, chat_id, reply_to } = req.body;
    if (content === undefined || content.length === 0) return res.status(501);

    const chat = await Chat.findOne({
      _id: chat_id,
      participants: { $in: [req.user._id] },
    }).lean();

    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    const otherId = chat.participants.find((p) => p !== req.user._id);
    const otherUser = await User.findOne({ _id: otherId }).lean();

    if (
      otherUser?.blocked_users?.some((_id) => _id.toString() === req.user._id)
    ) {
      return res
        .status(403)
        .json({ error: "Cannot send message to this user" });
    }

    let replyToContent = null;
    if (reply_to) {
      const replyMsg = await Message.findOne({ _id: reply_to }).lean();
      if (replyMsg) {
        replyToContent = `${replyMsg.sender_display_name}: ${replyMsg.content.substring(0, 100)}`;
      }
    }

    let expiresAt = null;
    if (chat.disappearing_timer) {
      expiresAt = new Date(Date.now() + chat.disappearing_timer * 60000);
    }

    const message = new Message({
      content,
      sender_id: req.user._id,
      sender_username: req.user.username,
      sender_display_name: req.user.display_name,
      sender_avatar: req.user.avatar,
      chat_id,
      reply_to,
      reply_to_content: replyToContent,
      expires_at: expiresAt,
    });

    await message.save();

    const messageObj = message.toObject();

    await websocketManager.broadcastToChat(
      SocketEvents.NEW_MESSAGE,
      messageObj,
      chat.participants,
    );

    res.json(messageObj);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/:message_id", authenticate, async (req, res) => {
  try {
    const { content } = req.body;

    const message = await Message.findOne({
      _id: req.params.message_id,
      sender_id: req.user._id,
    }).lean();

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    await Message.updateOne(
      { _id: message._id },
      {
        $set: {
          content,
          edited: true,
          edited_at: new Date(),
        },
      },
    );

    const chat = await Chat.findOne({ _id: message.chat_id }).lean();
    if (chat) {
      await websocketManager.broadcastToChat(
        SocketEvents.MESSAGE_EDITED,
        {
          chat_id: chat._id,
          message_id: message._id,
          content,
          edited_at: new Date(),
        },
        chat.participants,
      );
    }

    res.json({
      _id: message._id,
      content,
      edited: true,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/:message_id", authenticate, async (req, res) => {
  try {
    const message = await Message.findOne({
      _id: req.params.message_id,
      sender_id: req.user._id,
    }).lean();

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Delete attachments
    for (const attachment of message.attachments || []) {
      const filePath = join(UPLOAD_DIR, attachment.file_id);
      try {
        await fs.unlink(filePath);
      } catch (err) {
        console.error("Failed to delete file:", err);
      }
    }

    await Message.deleteOne({ _id: message._id });

    const chat = await Chat.findOne({ _id: message.chat_id }).lean();
    if (chat) {
      await websocketManager.broadcastToChat(
        SocketEvents.MESSAGE_DELETED,
        {
          chat_id: chat._id,
          message_id: message._id,
        },
        chat.participants,
      );
    }

    res.json({ deleted: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Message Reactions
router.post("/:message_id/reactions", authenticate, async (req, res) => {
  try {
    const { emoji } = req.body;

    const message = await Message.findOne({
      _id: req.params.message_id,
    }).lean();
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    const chat = await Chat.findOne({
      _id: message.chat_id,
      participants: { $in: [req.user._id] },
    }).lean();

    if (!chat) {
      return res.status(403).json({ error: "Not authorized" });
    }

    await Message.updateOne(
      { _id: message._id },
      { $addToSet: { [`reactions.${emoji}`]: req.user._id } },
    );

    await websocketManager.broadcastToChat(
      SocketEvents.MESSAGE_REACTION,
      {
        chat_id: message.chat_id,
        message_id: message._id,
        emoji,
        user_id: req.user._id,
        action: "add",
      },
      chat.participants,
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

      const message = await Message.findOne({
        _id: req.params.message_id,
      }).lean();
      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }

      const chat = await Chat.findOne({
        _id: message.chat_id,
        participants: { $in: [req.user._id] },
      }).lean();

      if (!chat) {
        return res.status(403).json({ error: "Not authorized" });
      }

      await Message.updateOne(
        { _id: message._id },
        { $pull: { [`reactions.${emoji}`]: req.user._id } },
      );

      await websocketManager.broadcastToChat(
        SocketEvents.MESSAGE_REACTION,
        {
          chat_id: message.chat_id,
          message_id: message._id,
          emoji,
          user_id: req.user._id,
          action: "remove",
        },
        chat.participants,
      );

      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  },
);

// TODO: security checks
router.post(
  "/with-attachment",
  authenticate,
  upload.single("file"),
  async (req, res) => {
    try {
      const { content, chat_id, reply_to } = req.body;

      const chat = await Chat.findOne({
        _id: chat_id,
        participants: { $in: [req.user._id] },
      }).lean();

      if (!chat) {
        await fs.unlink(req.file.path);
        return res.status(404).json({ error: "Chat not found" });
      }

      const attachment = {
        file_id: req.file.filename,
        original_name: req.file.originalname,
        content_type: req.file.mimetype,
        size: req.file.size,
        is_image: ALLOWED_IMAGE_TYPES.includes(req.file.mimetype),
        uploaded_at: new Date(),
      };

      const message = new Message({
        content: content || "",
        sender_id: req.user._id,
        sender_username: req.user.username,
        sender_display_name: req.user.display_name,
        sender_avatar: req.user.avatar,
        chat_id,
        reply_to,
        attachments: [attachment],
      });

      await message.save();

      const messageObj = message.toObject();

      await websocketManager.broadcastToChat(
        SocketEvents.NEW_MESSAGE,
        messageObj,
        chat.participants,
      );

      res.json(messageObj);
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
