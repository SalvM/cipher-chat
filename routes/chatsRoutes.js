import express from "express";
import { Chat, Message, User } from "../utils/db.js";
import websocketManager from "../websocket.js";
import SocketEvents from "../socketEvents.js";
import { authenticate } from "../utils/auth.js";

const router = express.Router();

router.post("/", authenticate, async (req, res) => {
  try {
    const { recipient_username } = req.body;

    if (!recipient_username || typeof recipient_username !== "string") {
      return res.status(400).json({ error: "Invalid recipient" });
    }

    const recipient = await User.findOne(
      { username_lower: recipient_username.toLowerCase() },
      "_id username display_name avatar status blocked_users",
    ).lean();

    if (!recipient) {
      return res.status(404).json({ error: "User not found" });
    }

    if (recipient._id.equals(req.user._id)) {
      return res
        .status(400)
        .json({ error: "Cannot create chat with yourself" });
    }

    const reqUserIdStr = req.user._id.toString();
    const recipientIdStr = recipient._id.toString();

    // Recipient user has blocked request user
    if (recipient.blocked_users?.some((id) => id.toString() === reqUserIdStr)) {
      return res.status(404).json({ error: "User not found" }); // Returns unprecise error
    }

    // Check blocks
    if (
      req.user.blocked_users?.some((id) => id.toString() === recipientIdStr)
    ) {
      return res.status(403).json({ error: "You have blocked this user" });
    }

    const chat = await Chat.findOneAndUpdate(
      {
        participants: { $all: [req.user._id, recipient._id], $size: 2 },
      },
      {
        $setOnInsert: {
          participants: [req.user._id, recipient._id],
        },
      },
      { upsert: true, new: true, lean: true },
    );

    const response = {
      ...chat,
      otherUser: {
        _id: recipient._id,
        username: recipient.username,
        display_name: recipient.display_name,
        avatar: recipient.avatar,
        status:
          websocketManager.userStatus.get(recipientIdStr) ?? recipient.status,
      },
    };

    res.json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/:chat_id/settings", authenticate, async (req, res) => {
  try {
    const { disappearing_timer } = req.body;

    const chat = await Chat.findOne({
      _id: req.params.chat_id,
      participants: req.user._id,
    }).lean();

    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    const validTimers = [0, 5, 30, 60, 1440, 10080];
    if (
      disappearing_timer !== undefined &&
      !validTimers.includes(disappearing_timer)
    ) {
      return res.status(400).json({ error: "Invalid timer value" });
    }

    const updateData = {};
    if (disappearing_timer !== undefined) {
      updateData.disappearing_timer =
        disappearing_timer > 0 ? disappearing_timer : null;
    }

    if (Object.keys(updateData).length > 0) {
      await Chat.updateOne({ _id: chat._id }, { $set: updateData });

      await websocketManager.broadcastToChat(
        SocketEvents.CHAT_SETTINGS_UPDATED,
        {
          chat_id: chat._id,
          settings: updateData,
          updated_by: req.user._id,
        },
        chat.participants,
      );
    }

    const updated = await Chat.findById(chat._id).lean();
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/", authenticate, async (req, res) => {
  try {
    const chats = await Chat.aggregate([
      // Match only chats where the requesting user is a participant
      { $match: { participants: req.user._id } },

      // Join the most recent message for each chat
      {
        $lookup: {
          from: "messages",
          let: { chatId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$chat_id", "$$chatId"] } } },
            { $sort: { created_at: -1 } },
            { $limit: 1 },
          ],
          as: "last_message",
        },
      },
      // Flatten the array to a single object (null if no messages yet)
      { $unwind: { path: "$last_message", preserveNullAndEmptyArrays: true } },

      // Sort by last message time, falling back to chat creation time
      {
        $addFields: {
          sort_time: { $ifNull: ["$last_message.created_at", "$created_at"] },
        },
      },
      { $sort: { sort_time: -1 } },

      // Join the other participant's profile (excludes the requesting user)
      {
        $lookup: {
          from: "users",
          let: {
            otherId: {
              // Private chat always has exactly 2 participants — pick the one that isn't the requester
              $arrayElemAt: [
                {
                  $filter: {
                    input: "$participants",
                    as: "p",
                    cond: { $ne: ["$$p", req.user._id] },
                  },
                },
                0,
              ],
            },
          },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$otherId"] } } },
            {
              $project: {
                _id: 1,
                username: 1,
                display_name: 1,
                avatar: 1,
                status: 1,
              },
            },
          ],
          as: "other_user",
        },
      },
      // Flatten to object instead of array, since there is always exactly one result
      { $unwind: { path: "$other_user", preserveNullAndEmptyArrays: true } },

      { $unset: "sort_time" },
    ]);

    // Overlay real-time status from websocketManager (not available inside aggregation)
    const enriched = chats.map((chat) => ({
      ...chat,
      other_user: chat.other_user
        ? {
            ...chat.other_user,
            status:
              websocketManager.userStatus.get(chat.other_user._id.toString()) ??
              chat.other_user.status,
          }
        : null,
    }));

    res.json({ chats: enriched });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/:chat_id/messages", authenticate, async (req, res) => {
  try {
    const { limit = 50, before } = req.query;

    const chat = await Chat.findOne({
      _id: req.params.chat_id,
      participants: req.user._id,
    }).lean();

    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    const query = { chat_id: req.params.chat_id };
    if (before) {
      query.created_at = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .sort({ created_at: -1 })
      .limit(parseInt(limit))
      .lean();

    messages.reverse();

    res.json({ messages });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
