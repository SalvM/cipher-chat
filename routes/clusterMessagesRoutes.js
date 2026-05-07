import fs from 'fs/promises';
import { join } from 'path';
import express from "express";
import { User, Cluster, ClusterMessage } from "../utils/db.js";

import SocketEvents from "../socketEvents.js";
import websocketManager from '../websocket.js'
import { UPLOAD_DIR } from "../directories.js";
import { ALLOWED_IMAGE_TYPES, upload } from '../utils/upload.js';
import { authenticate } from '../utils/auth.js';

const router = express.Router();

router.post('/', authenticate, async (req, res) => {
  try {
    const { content, cluster_id, topic_id, reply_to } = req.body;
    if (content === undefined || content.length === 0) return res.status(501); 

    const cluster = await Cluster.findOne({
      id: cluster_id,
      members: { $in: [req.user.id] }
    }).lean();
    
    if (!cluster) {
      return res.status(404).json({ error: 'Cluster not found' });
    }
    const topicExists = cluster.topics.some(t => t.id === topic_id);
    if (!topicExists) {
      return res.status(404).json({ error: 'Topic not found' });
    }
    
    let replyToContent = null;
    if (reply_to) {
      const replyMsg = await ClusterMessage.findOne({ id: reply_to }).lean();
      if (replyMsg) {
        replyToContent = `${replyMsg.sender_display_name}: ${replyMsg.content.substring(0, 100)}`;
      }
    }
    
    const clusterMessage = new ClusterMessage({
      content,
      sender_id: req.user.id,
      sender_username: req.user.username,
      sender_display_name: req.user.display_name,
      sender_avatar: req.user.avatar,
      cluster_id,
      topic_id,
      reply_to,
      reply_to_content: replyToContent,
    });
    
    await clusterMessage.save();
    
    const messageObj = clusterMessage.toObject();
    delete messageObj._id;

    await websocketManager.broadcastToChat(
      SocketEvents.CLUSTER_MESSAGE,
      messageObj,
      cluster.members
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
    
    const message = await ClusterMessage.findOne({
      id: req.params.message_id,
      sender_id: req.user.id
    }).lean();
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    await ClusterMessage.updateOne(
      { id: message.id },
      {
        $set: {
          content,
          edited: true,
          edited_at: new Date()
        }
      }
    );
    
    const cluster = await Cluster.findOne({ id: message.cluster_id }).lean();
    if (cluster) {
      await websocketManager.broadcastToChat(
        SocketEvents.CLUSTER_MESSAGE_EDITED,
        {
          id: message.id,
          content,
          edited_at: new Date()
        },
        cluster.members
      )
    }
    
    res.json({
      id: message.id,
      content,
      edited: true
    });
  } catch (err) {
    console.error(`Error processing message update for ${req.params.message_id}:`, err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:message_id', authenticate, async (req, res) => {
  try {
    const message = await ClusterMessage.findOne({
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
    
    await ClusterMessage.deleteOne({ id: message.id });
    
    const cluster = await Cluster.findOne({ id: message.cluster_id }).lean();
    if (cluster) {
      await websocketManager.broadcastToChat(
        SocketEvents.CLUSTER_MESSAGE_DELETED,
        {
          id: message.id,
          cluster_id: message.cluster_id
        },
        cluster.members
      );
    }
    
    res.json({ deleted: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ClusterMessage Reactions
router.post('/:message_id/reactions', authenticate, async (req, res) => {
  try {
    const { emoji } = req.body;
    
    const message = await ClusterMessage.findOne({ id: req.params.message_id }).lean();
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    const cluster = await Cluster.findOne({
      id: message.cluster_id,
      members: { $in: req.user.id }
    }).lean();
    
    if (!cluster) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    await ClusterMessage.updateOne(
      { id: message.id },
      { $addToSet: { [`reactions.${emoji}`]: req.user.id } }
    );
 
    await websocketManager.broadcastToChat(
      SocketEvents.CLUSTER_MESSAGE_REACTION,
      {
        message_id: message.id,
        emoji,
        user_id: req.user.id,
        action: 'add'
      },
      cluster.members
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
    
    const message = await ClusterMessage.findOne({ id: req.params.message_id }).lean();
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    const cluster = await Cluster.findOne({
      id: message.cluster_id,
      members: { $in: req.user.id }
    }).lean();
    
    if (!cluster) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    await ClusterMessage.updateOne(
      { id: message.id },
      { $pull: { [`reactions.${emoji}`]: req.user.id } }
    );
    
    await websocketManager.broadcastToChat(
      SocketEvents.CLUSTER_MESSAGE_REACTION,
      {
        id: message.id,
        emoji,
        user_id: req.user.id,
        action: 'remove'
      },
      cluster.members
    );
    
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// TODO: security checks
router.post('/with-attachment', authenticate, upload.single('file'), async (req, res) => {
  try {
    const { content, cluster_id, reply_to } = req.body;
    
    const cluster = await Cluster.findOne({
      id: cluster_id,
      members: { $in: req.user.id }
    }).lean();
    
    if (!cluster) {
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
    
    const message = new ClusterMessage({
      content: content || '',
      sender_id: req.user.id,
      sender_username: req.user.username,
      sender_display_name: req.user.display_name,
      sender_avatar: req.user.avatar,
      cluster_id,
      reply_to,
      attachments: [attachment],
    });
    
    await message.save();
    
    const messageObj = message.toObject();
    delete messageObj._id;
    
    await websocketManager.broadcastToChat(
      SocketEvents.NEW_MESSAGE,
      messageObj,
      cluster.members
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