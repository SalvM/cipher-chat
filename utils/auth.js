import crypto from "crypto";
import jwt from "jsonwebtoken";

import { User } from "./db.js";

const JWT_SECRET =
  process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex");
const ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY || crypto.randomBytes(16).toString("hex");

const generateToken = (userId, username) => {
  return jwt.sign({ user_id: userId, username }, JWT_SECRET, {
    expiresIn: "30d",
  });
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    throw new Error("Invalid token");
  }
};

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const token = authHeader.slice(7); // removes 'Bearer '
    const payload = verifyToken(token);

    const user = await User.findById(payload.user_id)
      .select("_id username display_name avatar status blocked_users")
      .lean();
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error(err);
    return res.status(401).json({ error: "Invalid token" });
  }
};

export { generateToken, verifyToken, authenticate };
