import express from "express";
import bip39 from "bip39";
import bcrypt from "bcryptjs";

import { authenticate, generateToken } from "../utils/auth.js";
import { hashRecoveryPhrase } from "../utils/cryption.js";
import {
  User,
  USER_PUBLIC_PROJECTION,
  USER_PRIVATE_PROJECTION,
  VALID_STATUSES,
} from "../utils/db.js";
import websocketManager from "../websocket.js";
import { authLimiter } from "../utils/limiters.js";

const router = express.Router();

// ── Helpers ────────────────────────────────────────────────────────────────

function validateRegisterInput({ username, password, display_name }) {
  if (!username || typeof username !== "string" || username.trim().length < 2)
    return "Invalid username";
  if (!password || typeof password !== "string" || password.length < 8)
    return "Password must be at least 8 characters";
  if (
    display_name !== undefined &&
    (typeof display_name !== "string" || display_name.trim().length > 64)
  )
    return "Invalid display_name";
  return null;
}

function validateLoginInput({ username, password }) {
  if (!username || !password) return "Missing credentials";
  return null;
}

// ── Routes ─────────────────────────────────────────────────────────────────

router.post("/register", authLimiter, async (req, res) => {
  try {
    const { username, password, display_name } = req.body;

    const validationError = validateRegisterInput(req.body);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const existing = await User.exists({
      username_lower: username.toLowerCase(),
    });
    if (existing) {
      return res.status(400).json({ error: "Username already taken" });
    }

    const recoveryPhrase = bip39.generateMnemonic(128);
    const [passwordHash, recoveryHash] = await Promise.all([
      bcrypt.hash(password, 10),
      Promise.resolve(hashRecoveryPhrase(recoveryPhrase)),
    ]);

    const user = await User.create({
      username: username.trim(),
      username_lower: username.toLowerCase(),
      display_name: display_name?.trim() || username.trim(),
      password_hash: passwordHash,
      recovery_hash: recoveryHash,
    });

    const token = generateToken(user._id, user.username);

    res.status(201).json({
      token,
      user: {
        _id: user._id,
        username: user.username,
        display_name: user.display_name,
        status: user.status,
      },
      recovery_phrase: recoveryPhrase,
      message:
        "IMPORTANT: Save your recovery phrase securely. It cannot be recovered if lost!",
    });
  } catch (err) {
    console.error("[authRoutes] POST /register", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/login", authLimiter, async (req, res) => {
  try {
    const validationError = validateLoginInput(req.body);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const { username, password } = req.body;

    const user = await User.findOne(
      { username_lower: username.toLowerCase() },
      "_id username display_name avatar bio status password_hash",
    ).lean();

    // Dummy hash to prevent timing attacks even when the user does not exist
    const passwordToCheck =
      user?.password_hash ??
      "$2b$10$invalidhashpadding000000000000000000000000000000000000";
    const valid = await bcrypt.compare(password, passwordToCheck);

    if (!user || !valid) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    await User.updateOne({ _id: user._id }, { $set: { status: "online" } });

    const token = generateToken(user._id, user.username);

    res.status(200).json({
      token,
      user: {
        _id: user._id,
        username: user.username,
        display_name: user.display_name,
        avatar: user.avatar,
        bio: user.bio,
        status: "online",
      },
    });
  } catch (err) {
    console.error("[authRoutes] POST /login", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/recover", authLimiter, async (req, res) => {
  try {
    const { username, recovery_phrase, new_password } = req.body;

    if (!username || !recovery_phrase || !new_password) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    if (typeof new_password !== "string" || new_password.length < 8) {
      return res
        .status(400)
        .json({ error: "Password must be at least 8 characters" });
    }

    const user = await User.findOne(
      { username_lower: username.toLowerCase() },
      "_id username display_name recovery_hash",
    ).lean();

    // This is a deliberately vague response to avoid revealing whether the username exists
    const providedHash = hashRecoveryPhrase(recovery_phrase);
    if (!user || providedHash !== user.recovery_hash) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const newPasswordHash = await bcrypt.hash(new_password, 10);

    await User.updateOne(
      { _id: user._id },
      { $set: { password_hash: newPasswordHash } },
    );

    const token = generateToken(user._id, user.username);

    res.status(200).json({
      token,
      user: {
        _id: user._id,
        username: user.username,
        display_name: user.display_name,
      },
      message: "Password updated successfully",
    });
  } catch (err) {
    console.error("[authRoutes] POST /recover", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/me", authenticate, (req, res) => {
  // req.user is already populated by the authenticate middleware: no extra queries
  res.json({
    _id: req.user._id,
    username: req.user.username,
    display_name: req.user.display_name,
    avatar: req.user.avatar,
    bio: req.user.bio,
    status: req.user.status,
  });
});

router.put("/profile", authenticate, async (req, res) => {
  try {
    const { display_name, bio, avatar } = req.body;

    // Input validation. TODO: Centralize validation for each models
    if (display_name !== undefined) {
      if (typeof display_name !== "string" || display_name.trim().length === 0)
        return res.status(400).json({ error: "Invalid display_name" });
      if (display_name.trim().length > 64)
        return res.status(400).json({ error: "display_name too long" });
    }
    if (bio !== undefined) {
      if (typeof bio !== "string")
        return res.status(400).json({ error: "Invalid bio" });
      if (bio.length > 300)
        return res.status(400).json({ error: "Bio too long" });
    }
    if (avatar !== undefined && typeof avatar !== "string") {
      return res.status(400).json({ error: "Invalid avatar" });
    }

    const updateData = {};
    if (display_name !== undefined)
      updateData.display_name = display_name.trim();
    if (bio !== undefined) updateData.bio = bio.trim();
    if (avatar !== undefined) updateData.avatar = avatar;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    const updated = await User.findOneAndUpdate(
      { _id: req.user._id },
      { $set: updateData },
      { after: true, select: USER_PUBLIC_PROJECTION, lean: true },
    );

    res.status(204).json(updated);
  } catch (err) {
    console.error("[authRoutes] PUT /profile", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/status", authenticate, async (req, res) => {
  try {
    const { status } = req.body;

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    await User.updateOne({ _id: req.user._id }, { $set: { status } });

    if (status !== "invisible") {
      await websocketManager.broadcastStatus(req.user._id, status);
    }

    res.status(204).json({ status });
  } catch (err) {
    console.error("[authRoutes] PUT /status", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
