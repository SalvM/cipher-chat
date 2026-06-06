import expressRateLimit from 'express-rate-limit';
import { RateLimiterMemory } from 'rate-limiter-flexible';

export const rateLimiter = new RateLimiterMemory({
  points: 100,
  duration: 60
});

export const authLimiter = expressRateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 5 : 55,
  message: 'Too many attempts, try again later'
});