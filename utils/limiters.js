import expressRateLimit from "express-rate-limit";
import { RateLimiterMemory } from "rate-limiter-flexible";
import { isDevEnvironment } from "../env.js";

export const rateLimiter = new RateLimiterMemory({
  points: 100,
  duration: 60,
});

export const authLimiter = expressRateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevEnvironment ? 55 : 5,
  message: "Too many attempts, try again later",
});
