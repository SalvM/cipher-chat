import express from "express";
import { Chat, Message, User } from "../utils/db.js";
import websocketManager from "../websocket.js";
import SocketEvents from "../socketEvents.js";
import { authenticate } from "../utils/auth.js";

const router = express.Router();

router.post('/', authenticate, async (req, res) => {
  try {
    const { recipient_username } = req.body;
    
    const recipient = await User.findOne(
      { username_lower: recipient_username.toLowerCase() },
      '-password_hash -recovery_hash'
    ).lean();
    
    if (!recipient) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (recipient.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot create chat with yourself' });
    }
    
    // Check blocks
    if (req.user.blocked_users?.includes(recipient.id)) {
      return res.status(403).json({ error: 'You have blocked this user' });
    }
    
    const recipientFull = await User.findOne({ id: recipient.id }).lean();
    if (recipientFull.blocked_users?.includes(req.user.id)) {
      return res.status(403).json({ error: 'Cannot message this user' });
    }
    
    // Check existing chat
    let chat = await Chat.findOne({
      type: 'private',
      participants: { $all: [req.user.id, recipient.id], $size: 2 }
    }).lean();
    
    if (!chat) {
      chat = new Chat({
        participants: [req.user.id, recipient.id]
      });
      await chat.save();
    }
    
    // Add participant details
    chat.participant_details = [
      {
        id: req.user.id,
        username: req.user.username,
        display_name: req.user.display_name,
        avatar: req.user.avatar,
        status: websocketManager.userStatus.get(req.user.id) || req.user.status
      },
      {
        id: recipient.id,
        username: recipient.username,
        display_name: recipient.display_name,
        avatar: recipient.avatar,
        status: websocketManager.userStatus.get(recipient.id) || recipient.status
      }
    ];
    
    res.json(chat);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:chat_id/settings', authenticate, async (req, res) => {
  try {
    const { disappearing_timer } = req.body;
    
    const chat = await Chat.findOne({
      id: req.params.chat_id,
      participants: req.user.id
    }).lean();
    
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    const validTimers = [0, 5, 30, 60, 1440, 10080];
    if (disappearing_timer !== undefined && !validTimers.includes(disappearing_timer)) {
      return res.status(400).json({ error: 'Invalid timer value' });
    }
    
    const updateData = {};
    if (disappearing_timer !== undefined) {
      updateData.disappearing_timer = disappearing_timer > 0 ? disappearing_timer : null;
    }
    
    if (Object.keys(updateData).length > 0) {
      await Chat.updateOne({ id: chat.id }, { $set: updateData });
      
      await websocketManager.broadcastToChat(
        SocketEvents.CHAT_SETTINGS_UPDATED,
        {
          chat_id: chat.id,
          settings: updateData,
          updated_by: req.user.id
        },
        chat.participants
      );
    }
    
    const updated = await Chat.findOne({ id: chat.id }).lean();
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/', authenticate, async (req, res) => {
  try {
    const chats = await Chat.find({ participants: req.user.id }).lean();
    
    const enriched = await Promise.all(chats.map(async (chat) => {
      const participantDetails = await Promise.all(
        chat.participants.map(async (pid) => {
          const user = await User.findOne(
            { id: pid },
            '-password_hash -recovery_hash'
          ).lean();
          if (user) {
            user.status = websocketManager.userStatus.get(pid) || user.status;
          }
          return user;
        })
      );
      
      const lastMessage = await Message.findOne(
        { chat_id: chat.id },
        null,
        { sort: { created_at: -1 } }
      ).lean();
      
      return {
        ...chat,
        participant_details: participantDetails.filter(Boolean),
        last_message: lastMessage
      };
    }));
    
    enriched.sort((a, b) => {
      const aTime = a.last_message?.created_at || a.created_at;
      const bTime = b.last_message?.created_at || b.created_at;
      return new Date(bTime) - new Date(aTime);
    });
    
    res.json({ chats: enriched });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:chat_id/messages', authenticate, async (req, res) => {
  try {
    const { limit = 50, before } = req.query;
    
    const chat = await Chat.findOne({
      id: req.params.chat_id,
      participants: req.user.id
    }).lean();
    
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
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
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:chat_id/unread', authenticate, async (req, res) => {
  try {
    const chat = await Chat.findOne({
      id: req.params.chat_id,
      participants: req.user.id
    }).lean();
    
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    const count = await Message.countDocuments({
      chat_id: req.params.chat_id,
      sender_id: { $ne: req.user.id },
      read_by: { $ne: req.user.id }
    });
    
    res.json({ unread_count: count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


export default router