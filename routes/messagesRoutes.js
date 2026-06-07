import fs from "fs/promises";
import { join } from "path";
import express from "express";
import mongoose from "mongoose";
import { Chat, User, Message } from "../utils/db.js";

import SocketEvents from "../socketEvents.js";
import websocketManager from "../websocket.js";
import { UPLOAD_DIR } from "../directories.js";
import { ALLOWED_IMAGE_TYPES, upload } from "../utils/upload.js";
import { authenticate } from "../utils/auth.js";

const router = express.Router();

// ── Helpers ────────────────────────────────────────────────────────────────

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

/**
 * Checks whether the authenticated user is participating in the chat and returns
 * the chat itself with a whitelist projection.
 * A single database call shared by multiple routes.
 */
async function findChatForParticipant(chatId, userId) {
  return Chat.findOne(
    { _id: chatId, participants: userId },
    "_id participants",
  ).lean();
}

/**
 * Checks whether userId is blocked by the other chat participant.
 * Returns true if the message should be blocked.
 */
async function isSenderBlockedByRecipient(chat, senderId) {
  const otherId = chat.participants.find((p) => !p.equals(senderId));
  if (!otherId) return false;

  const otherUser = await User.findOne(
    { _id: otherId },
    "blocked_users",
  ).lean();

  return otherUser?.blocked_users?.some((id) => id.equals(senderId)) ?? false;
}

/**
 * Creates an attachment object from the file uploaded by multer.
 */
function buildAttachment(file) {
  return {
    file_id: file.filename,
    original_name: file.originalname,
    content_type: file.mimetype,
    size: file.size,
    is_image: ALLOWED_IMAGE_TYPES.includes(file.mimetype),
    uploaded_at: new Date(),
  };
}

/**
 * Saves the message, broadcasts it to participants, and responds to the client.
 * Logic common to POST / and POST /with-attachment.
 */
async function saveAndBroadcast(messageData, chat, res) {
  const message = await Message.create(messageData);
  const messageObj = message.toObject();

  websocketManager.broadcastToChat(
    SocketEvents.NEW_MESSAGE,
    messageObj,
    chat.participants,
  );

  return messageObj;
}

// ── Routes ─────────────────────────────────────────────────────────────────

/**
 * POST /
 * Send a text message (with a reply, if applicable).
 */
router.post("/", authenticate, async (req, res) => {
  try {
    const { content, chat_id, reply_to, reply_to_content: clientReplyContent, key_version } = req.body;
    const disappearing_minutes = parseInt(req.body.disappearing_minutes ?? 0);

    if (typeof content !== "string" || content.length === 0 || content.length > 8192) {
      return res.status(400).json({ error: "Content is required" });
    }

    if (!chat_id || !isValidObjectId(chat_id)) {
      return res.status(400).json({ error: "Invalid chat_id" });
    }

    const chat = await findChatForParticipant(chat_id, req.user._id);
    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    if (await isSenderBlockedByRecipient(chat, req.user._id)) {
      return res
        .status(403)
        .json({ error: "Cannot send message to this user" });
    }

    if (reply_to && !isValidObjectId(reply_to)) {
      return res.status(400).json({ error: "Invalid reply_to" });
    }
    const replyToContent = reply_to ? (clientReplyContent ?? null) : null;

    const expiresAt =
      !isNaN(disappearing_minutes) && disappearing_minutes > 0
        ? new Date(Date.now() + disappearing_minutes * 60_000)
        : null;

    const messageObject = await saveAndBroadcast(
      {
        content,
        sender_id: req.user._id,
        sender_username: req.user.username,
        sender_display_name: req.user.display_name,
        sender_avatar: req.user.avatar,
        chat_id,
        reply_to: reply_to || undefined,
        reply_to_content: replyToContent,
        expires_at: expiresAt,
        key_version,
      },
      chat,
      res,
    );
    res.status(201).json(messageObject);
  } catch (err) {
    console.error("[messagesRoutes] POST /", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * PUT /:message_id
 * Updates the content of an existing message (sender only).
 */
router.put("/:message_id", authenticate, async (req, res) => {
  try {
    const { content, key_version } = req.body;

    if (typeof content !== "string" || content.length === 0 || content.length > 8192) {
      return res.status(400).json({ error: "Content is required" });
    }

    if (!isValidObjectId(req.params.message_id)) {
      return res.status(400).json({ error: "Invalid message_id" });
    }

    const message = await Message.findOne(
      { _id: req.params.message_id, sender_id: req.user._id },
      "_id chat_id",
    ).lean();

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    const editedAt = new Date();

    const [chat] = await Promise.all([
      Chat.findOne({ _id: message.chat_id }, "_id participants").lean(),
      Message.updateOne(
        { _id: message._id },
        {
          $set: { content, edited: true, edited_at: editedAt, ...(key_version !== undefined && { key_version }) },
        },
      ),
    ]);

    if (chat) {
      websocketManager.broadcastToChat(
        SocketEvents.MESSAGE_EDITED,
        {
          chat_id: chat._id,
          message_id: message._id,
          content,
          edited_at: editedAt,
        },
        chat.participants,
      );
    }

    res
      .status(204)
      .json({ _id: message._id, content, edited: true });
  } catch (err) {
    console.error("[messagesRoutes] PUT /:message_id", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * DELETE /:message_id
 * Deletes a message and its attachments (sender only).
 */
router.delete("/:message_id", authenticate, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.message_id)) {
      return res.status(400).json({ error: "Invalid message_id" });
    }

    const message = await Message.findOne(
      { _id: req.params.message_id, sender_id: req.user._id },
      "_id chat_id attachments",
    ).lean();

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Delete the document and restore the chat simultaneously
    const [chat] = await Promise.all([
      Chat.findOne({ _id: message.chat_id }, "_id participants").lean(),
      Message.deleteOne({ _id: message._id }),
    ]);

    // Clean up attached files (fire-and-forget: does not block the response)
    for (const attachment of message.attachments ?? []) {
      fs.unlink(join(UPLOAD_DIR, attachment.file_id)).catch((err) =>
        console.error("[messagesRoutes] Failed to delete file:", err),
      );
    }

    if (chat) {
      websocketManager.broadcastToChat(
        SocketEvents.MESSAGE_DELETED,
        { chat_id: chat._id, message_id: message._id },
        chat.participants,
      );
    }

    res.status(204).json({ deleted: true });
  } catch (err) {
    console.error("[messagesRoutes] DELETE /:message_id", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ── Reactions ──────────────────────────────────────────────────────────────

/**
 * Common logic for adding/removing reactions: retrieves the message and authorization
 * in two queries and then updates the data.
 */
async function handleReaction(req, res, updateOp) {
  const { message_id } = req.params;

  if (!isValidObjectId(message_id)) {
    return res.status(400).json({ error: "Invalid message_id" });
  }

  const message = await Message.findOne(
    { _id: message_id },
    "_id chat_id",
  ).lean();
  if (!message) {
    return res.status(404).json({ error: "Message not found" });
  }

  const chat = await findChatForParticipant(message.chat_id, req.user._id);
  if (!chat) {
    return res.status(403).json({ error: "Not authorized" });
  }

  await updateOp(message._id);

  return { message, chat };
}

router.post("/:message_id/reactions", authenticate, async (req, res) => {
  try {
    const { emoji } = req.body;

    if (!emoji || typeof emoji !== "string") {
      return res.status(400).json({ error: "Invalid emoji" });
    }

    const result = await handleReaction(req, res, (msgId) =>
      Message.updateOne(
        { _id: msgId },
        { $addToSet: { [`reactions.${emoji}`]: req.user._id } },
      ),
    );
    if (!result) return; // The error response has already been sent

    const { message, chat } = result;

    websocketManager.broadcastToChat(
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

    res.status(204).json({ success: true, emoji });
  } catch (err) {
    console.error("[messagesRoutes] POST /:message_id/reactions", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.delete(
  "/:message_id/reactions/:emoji",
  authenticate,
  async (req, res) => {
    try {
      const { emoji } = req.params;

      if (!emoji || typeof emoji !== "string") {
        return res.status(400).json({ error: "Invalid emoji" });
      }

      const result = await handleReaction(req, res, (msgId) =>
        Message.updateOne(
          { _id: msgId },
          { $pull: { [`reactions.${emoji}`]: req.user._id } },
        ),
      );
      if (!result) return;

      const { message, chat } = result;

      websocketManager.broadcastToChat(
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

      res.status(204).json({ success: true });
    } catch (err) {
      console.error(
        "[messagesRoutes] DELETE /:message_id/reactions/:emoji",
        err,
      );
      res.status(500).json({ error: "Server error" });
    }
  },
);

// ── With attachment ────────────────────────────────────────────────────────

/**
 * POST /with-attachment
 * Sends a message with an attached file.
 */
router.post(
  "/with-attachment",
  authenticate,
  upload.single("file"),
  async (req, res) => {
    try {
      const { content, chat_id, reply_to, reply_to_content: clientReplyContent, key_version } = req.body;

      if (!chat_id || !isValidObjectId(chat_id)) {
        if (req.file) await fs.unlink(req.file.path).catch(console.error);
        return res.status(400).json({ error: "Invalid chat_id" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "File is required" });
      }

      const chat = await findChatForParticipant(chat_id, req.user._id);
      if (!chat) {
        await fs.unlink(req.file.path).catch(console.error);
        return res.status(404).json({ error: "Chat not found" });
      }

      if (await isSenderBlockedByRecipient(chat, req.user._id)) {
        await fs.unlink(req.file.path).catch(console.error);
        return res
          .status(403)
          .json({ error: "Cannot send message to this user" });
      }

      if (reply_to && !isValidObjectId(reply_to)) {
        await fs.unlink(req.file.path).catch(console.error);
        return res.status(400).json({ error: "Invalid reply_to" });
      }
      const replyToContent = reply_to ? (clientReplyContent ?? null) : null;

      const messageObject = await saveAndBroadcast(
        {
          content: content ?? "",
          sender_id: req.user._id,
          sender_username: req.user.username,
          sender_display_name: req.user.display_name,
          sender_avatar: req.user.avatar,
          chat_id,
          reply_to: reply_to || undefined,
          reply_to_content: replyToContent,
          attachments: [buildAttachment(req.file)],
          key_version,
        },
        chat,
        res,
      );
      res.status(201).json(messageObject);
    } catch (err) {
      console.error("[messagesRoutes] POST /with-attachment", err);
      if (req.file) {
        await fs.unlink(req.file.path).catch(console.error);
      }
      res.status(500).json({ error: "Server error" });
    }
  },
);

export default router;
