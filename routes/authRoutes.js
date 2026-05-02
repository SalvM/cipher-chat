import express from "express";
import bip39 from 'bip39';
import bcrypt from 'bcryptjs';

import { authenticate, generateToken } from "../utils/auth.js";
import { hashRecoveryPhrase } from "../utils/cryption.js";
import { Chat, User } from "../utils/db.js";
import websocketManager from "../websocket.js";
import { authLimiter } from "../utils/limiters.js";

const router = express.Router();

router.post('/register', authLimiter, async (req, res) => {
  try {
    const { username, password, display_name } = req.body;
    
    const existing = await User.findOne({ username_lower: username.toLowerCase() });
    if (existing) {
      return res.status(400).json({ error: 'Username already taken' });
    }
    
    const recoveryPhrase = bip39.generateMnemonic(128); // 12 words
    const passwordHash = await bcrypt.hash(password, 10);
    const recoveryHash = hashRecoveryPhrase(recoveryPhrase);
    
    const user = new User({
      username,
      username_lower: username.toLowerCase(),
      display_name: display_name || username,
      password_hash: passwordHash,
      recovery_hash: recoveryHash
    });
    
    await user.save();
    
    const token = generateToken(user.id, user.username);
    
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        status: user.status
      },
      recovery_phrase: recoveryPhrase,
      message: 'IMPORTANT: Save your recovery phrase securely. It cannot be recovered if lost!'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const user = await User.findOne({ username_lower: username.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    user.status = 'online';
    await user.save();
    
    const token = generateToken(user.id, user.username);
    
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        avatar: user.avatar,
        bio: user.bio,
        status: user.status
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/recover', authLimiter, async (req, res) => {
  try {
    const { username, recovery_phrase, new_password } = req.body;
    
    const user = await User.findOne({ username_lower: username.toLowerCase() });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const providedHash = hashRecoveryPhrase(recovery_phrase);
    if (providedHash !== user.recovery_hash) {
      return res.status(401).json({ error: 'Invalid recovery phrase' });
    }
    
    user.password_hash = await bcrypt.hash(new_password, 10);
    await user.save();
    
    const token = generateToken(user.id, user.username);
    
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name
      },
      message: 'Password updated successfully'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/me', authenticate, async (req, res) => {
  res.json({
    id: req.user.id,
    username: req.user.username,
    display_name: req.user.display_name,
    avatar: req.user.avatar,
    bio: req.user.bio,
    status: req.user.status
  });
});

router.put('/profile', authenticate, async (req, res) => {
  try {
    const { display_name, bio, avatar } = req.body;
    
    const updateData = {};
    if (display_name !== undefined) updateData.display_name = display_name;
    if (bio !== undefined) updateData.bio = bio;
    if (avatar !== undefined) updateData.avatar = avatar;
    
    if (Object.keys(updateData).length > 0) {
      await User.updateOne({ id: req.user.id }, { $set: updateData });
    }
    
    const updated = await User.findOne({ id: req.user.id })
      .select('-password_hash -recovery_hash')
      .lean();
    
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/status', authenticate, async (req, res) => {
  try {
    const { status } = req.body;
    
    await User.updateOne({ id: req.user.id }, { $set: { status } });
    
    if (status !== 'invisible') {
      await websocketManager.broadcastStatus(req.user.id, status);
    }
    
    res.json({ status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router