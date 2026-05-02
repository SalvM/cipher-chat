import fs from 'fs/promises';
import { join } from 'path';
import express from "express";
import { Chat, User, Message } from "../utils/db.js";

import SocketEvents from "../socketEvents.js";
import websocketManager from '../websocket.js'
import { UPLOAD_DIR } from "../directories.js";
import { ALLOWED_IMAGE_TYPES, upload } from '../utils/upload.js';
import { authenticate } from '../utils/auth.js';

const router = express.Router();

router.post('/', authenticate, async (req, res) => {
  try {
    const { content, chat_id, reply_to, encrypted } = req.body;
    
    const chat = await Chat.findOne({
      id: chat_id,
      participants: req.user.id
    }).lean();
    
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    const otherId = chat.participants.find(p => p !== req.user.id);
    const otherUser = await User.findOne({ id: otherId }).lean();
    
    if (otherUser?.blocked_users?.includes(req.user.id)) {
      return res.status(403).json({ error: 'Cannot send message to this user' });
    }
    
    let replyToContent = null;
    if (reply_to) {
      const replyMsg = await Message.findOne({ id: reply_to }).lean();
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
      sender_id: req.user.id,
      sender_username: req.user.username,
      sender_display_name: req.user.display_name,
      sender_avatar: req.user.avatar,
      chat_id,
      reply_to,
      reply_to_content: replyToContent,
      encrypted: encrypted || false,
      read_by: [req.user.id],
      expires_at: expiresAt
    });
    
    await message.save();
    
    const messageObj = message.toObject();
    delete messageObj._id;

    await websocketManager.broadcastToChat(
      SocketEvents.NEW_MESSAGE,
      messageObj,
      chat.participants
    );
    
    res.json(messageObj);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:message_id', authenticate, async (req, res) => {
  try {
    const { content } = req.body;
    
    const message = await Message.findOne({
      id: req.params.message_id,
      sender_id: req.user.id
    }).lean();
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    await Message.updateOne(
      { id: message.id },
      {
        $set: {
          content,
          edited: true,
          edited_at: new Date()
        }
      }
    );
    
    const chat = await Chat.findOne({ id: message.chat_id }).lean();
    if (chat) {
      await websocketManager.broadcastToChat(
        SocketEvents.MESSAGE_EDITED,
        {
          message_id: message.id,
          content,
          edited_at: new Date()
        },
        chat.participants
      )
    }
    
    res.json({
      id: message.id,
      content,
      edited: true
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:message_id', authenticate, async (req, res) => {
  try {
    const message = await Message.findOne({
      id: req.params.message_id,
      sender_id: req.user.id
    }).lean();
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    // Delete attachments
    for (const attachment of message.attachments || []) {
      const filePath = join(UPLOAD_DIR, attachment.file_id);
      try {
        await fs.unlink(filePath);
      } catch (err) {
        console.error('Failed to delete file:', err);
      }
    }
    
    await Message.deleteOne({ id: message.id });
    
    const chat = await Chat.findOne({ id: message.chat_id }).lean();
    if (chat) {
      await websocketManager.broadcastToChat(
        SocketEvents.MESSAGE_DELETED,
        {
          message_id: message.id,
          chat_id: message.chat_id
        },
        chat.participants
      );
    }
    
    res.json({ deleted: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Message Reactions
router.post('/:message_id/reactions', authenticate, async (req, res) => {
  try {
    const { emoji } = req.body;
    
    const message = await Message.findOne({ id: req.params.message_id }).lean();
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    const chat = await Chat.findOne({
      id: message.chat_id,
      participants: req.user.id
    }).lean();
    
    if (!chat) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    await Message.updateOne(
      { id: message.id },
      { $addToSet: { [`reactions.${emoji}`]: req.user.id } }
    );
 
    await websocketManager.broadcastToChat(
      SocketEvents.MESSAGE_REACTION,
      {
        message_id: message.id,
        emoji,
        user_id: req.user.id,
        action: 'add'
      },
      chat.participants
    );

    res.json({ success: true, emoji });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:message_id/reactions/:emoji', authenticate, async (req, res) => {
  try {
    const { emoji } = req.params;
    
    const message = await Message.findOne({ id: req.params.message_id }).lean();
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    const chat = await Chat.findOne({
      id: message.chat_id,
      participants: req.user.id
    }).lean();
    
    if (!chat) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    await Message.updateOne(
      { id: message.id },
      { $pull: { [`reactions.${emoji}`]: req.user.id } }
    );
    
    await websocketManager.broadcastToChat(
      SocketEvents.MESSAGE_REACTION,
      {
        message_id: message.id,
        emoji,
        user_id: req.user.id,
        action: 'remove'
      },
      chat.participants
    );
    
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Read Receipts
router.post('/read', authenticate, async (req, res) => {
  try {
    const { message_ids } = req.body;
    
    if (!message_ids || message_ids.length === 0) {
      return res.json({ updated: 0 });
    }
    
    const result = await Message.updateMany(
      {
        id: { $in: message_ids },
        read_by: { $ne: req.user.id }
      },
      { $push: { read_by: req.user.id } }
    );
    
    const messages = await Message.find(
      { id: { $in: message_ids } },
      'id sender_id chat_id'
    ).lean();
    
    for (const msg of messages) {
      if (msg.sender_id !== req.user.id) {
        await websocketManager.sendPersonalMessage(msg.sender_id, SocketEvents.MESSAGE_READ, {
          message_id: msg.id,
          chat_id: msg.chat_id,
          read_by: req.user.id
        });
      }
    }
    
    res.json({ updated: result.modifiedCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/with-attachment', authenticate, upload.single('file'), async (req, res) => {
  try {
    const { content, chat_id, reply_to } = req.body;
    
    const chat = await Chat.findOne({
      id: chat_id,
      participants: req.user.id
    }).lean();
    
    if (!chat) {
      await fs.unlink(req.file.path);
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    const attachment = {
      file_id: req.file.filename,
      original_name: req.file.originalname,
      content_type: req.file.mimetype,
      size: req.file.size,
      is_image: ALLOWED_IMAGE_TYPES.includes(req.file.mimetype),
      uploaded_at: new Date()
    };
    
    const message = new Message({
      content: content || '',
      sender_id: req.user.id,
      sender_username: req.user.username,
      sender_display_name: req.user.display_name,
      sender_avatar: req.user.avatar,
      chat_id,
      reply_to,
      attachments: [attachment],
      read_by: [req.user.id]
    });
    
    await message.save();
    
    const messageObj = message.toObject();
    delete messageObj._id;
    
    await websocketManager.broadcastToChat(
      SocketEvents.NEW_MESSAGE,
      messageObj,
      chat.participants
    );
    
    res.json(messageObj);
  } catch (err) {
    console.error(err);
    if (req.file) {
      await fs.unlink(req.file.path).catch(console.error);
    }
    res.status(500).json({ error: 'Server error' });
  }
});

export default router