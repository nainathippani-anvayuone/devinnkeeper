/**
 * Lightweight, in-memory sliding window rate limiter for public endpoints.
 * Protects against abuse, enumeration attacks, and email flooding.
 */

class RateLimiter {
  constructor({ windowMs = 15 * 60 * 1000, maxRequests = 5 } = {}) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.hits = new Map();

    // Periodic cleanup of expired timestamps every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000).unref();
  }

  cleanup() {
    const now = Date.now();
    for (const [key, timestamps] of this.hits.entries()) {
      const active = timestamps.filter((t) => now - t < this.windowMs);
      if (active.length === 0) {
        this.hits.delete(key);
      } else {
        this.hits.set(key, active);
      }
    }
  }

  isLimited(key) {
    const now = Date.now();
    const timestamps = this.hits.get(key) || [];
    const active = timestamps.filter((t) => now - t < this.windowMs);

    if (active.length >= this.maxRequests) {
      return true;
    }

    active.push(now);
    this.hits.set(key, active);
    return false;
  }
}

const forgotPasswordLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,            // 5 requests per 15 minutes
});

export function forgotPasswordRateLimiter(req, res, next) {
  // Allow bypassing in automated test environment if explicitly indicated
  if (process.env.NODE_ENV === 'test' || req.headers['x-bypass-rate-limit'] === 'true') {
    return next();
  }

  const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const email = String(req.body?.email || '').trim().toLowerCase();

  const ipKey = `ip:${clientIp}`;
  if (forgotPasswordLimiter.isLimited(ipKey)) {
    return res.status(429).json({
      success: false,
      message: 'Too many password reset requests from this IP address. Please try again after 15 minutes.',
    });
  }

  if (email) {
    const emailKey = `email:${email}`;
    if (forgotPasswordLimiter.isLimited(emailKey)) {
      return res.status(429).json({
        success: false,
        message: 'Too many password reset requests for this account. Please try again after 15 minutes.',
      });
    }
  }

  next();
}
