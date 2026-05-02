import express from "express";
import { Chat, Cluster, ClusterMessage, User } from "../utils/db.js";
import websocketManager from "../websocket.js";
import SocketEvents from "../socketEvents.js";
import { authenticate } from "../utils/auth.js";

const router = express.Router();

router.post('/', authenticate, async (req, res) => {
  try {
    const { name, description } = req.body;
    
    const cluster = new Cluster({
      name,
      description,
      owner_id: req.user.id,
      members: [req.user.id],
      topics: [{
        name: 'general',
        cluster_id: ''
      }]
    });
    
    await cluster.save();

    cluster.topics[0].cluster_id = cluster.id;
    await cluster.save();
    
    res.json(cluster);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/', authenticate, async (req, res) => {
  try {
    const clusters = await Cluster.find(
      { members: req.user.id }
    ).lean();
    
    res.json({ clusters });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:cluster_id', authenticate, async (req, res) => {
  try {
    const cluster = await Cluster.findOne({
      id: req.params.cluster_id,
      members: req.user.id
    }).lean();
    
    if (!cluster) {
      return res.status(404).json({ error: 'Cluster not found' });
    }
    
    const memberDetails = await Promise.all(
      cluster.members.map(async (mid) => {
        const user = await User.findOne(
          { id: mid },
          '-password_hash -recovery_hash'
        ).lean();
        if (user) {
          user.status = websocketManager.userStatus.get(mid) || user.status;
        }
        return user;
      })
    );
    
    cluster.member_details = memberDetails.filter(Boolean);
    
    res.json(cluster);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:cluster_id/topics', authenticate, async (req, res) => {
  try {
    const { name } = req.body;
    
    const cluster = await Cluster.findOne({
      id: req.params.cluster_id,
      members: req.user.id
    });
    
    if (!cluster) {
      return res.status(404).json({ error: 'Cluster not found' });
    }
    
    const topic = {
      id: uuidv4(),
      name,
      cluster_id: cluster.id,
      created_at: new Date()
    };
    
    cluster.topics.push(topic);
    await cluster.save();
    
    res.json(topic);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:cluster_id/topics/:topic_id/messages', authenticate, async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    
    const cluster = await Cluster.findOne({
      id: req.params.cluster_id,
      members: req.user.id
    }).lean();
    
    if (!cluster) {
      return res.status(404).json({ error: 'Cluster not found' });
    }
    
    const messages = await ClusterMessage.find({
      cluster_id: req.params.cluster_id,
      topic_id: req.params.topic_id
    })
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

router.post('/:cluster_id/topics/:topic_id/messages', authenticate, async (req, res) => {
  try {
    const { content } = req.body;
    if (content === undefined || content.length === 0) return res.status(501); 

    const cluster = await Cluster.findOne({
      id: req.params.cluster_id,
      members: req.user.id
    }).lean();
    
    if (!cluster) {
      return res.status(404).json({ error: 'Cluster not found' });
    }
    
    const topicExists = cluster.topics.some(t => t.id === req.params.topic_id);
    if (!topicExists) {
      return res.status(404).json({ error: 'Topic not found' });
    }
    
    const message = new ClusterMessage({
      content,
      sender_id: req.user.id,
      sender_username: req.user.username,
      sender_display_name: req.user.display_name,
      sender_avatar: req.user.avatar,
      cluster_id: req.params.cluster_id,
      topic_id: req.params.topic_id
    });
    
    await message.save();
    
    const messageObj = message.toObject();
    delete messageObj._id;
    
    for (const memberId of cluster.members) {
      await websocketManager.sendPersonalMessage(memberId, SocketEvents.NEW_CLUSTER_MESSAGE, {
        message: messageObj
      });
    }
    
    res.json(messageObj);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:cluster_id/join', authenticate, async (req, res) => {
  try {
    const cluster = await Cluster.findOne({ id: req.params.cluster_id });
    
    if (!cluster) {
      return res.status(404).json({ error: 'Cluster not found' });
    }
    
    if (cluster.members.includes(req.user.id)) {
      return res.json({ message: 'Already a member' });
    }
    
    cluster.members.push(req.user.id);
    await cluster.save();
    
    res.json({ message: 'Joined cluster successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router