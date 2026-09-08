import jwt from 'jsonwebtoken';
import { authenticateToken } from '../middleware/authMiddleware.js';

const ACCESS_PURPOSE = 'guest-checkin';
const ACCESS_TTL = '24h';

function getJwtSecret() {
  return process.env.JWT_SECRET || 'innkeeper-super-secret-key-change-in-production';
}

export function createCheckInAccessToken({ reservationId, guestId }) {
  return jwt.sign(
    {
      purpose: ACCESS_PURPOSE,
      reservationId: Number(reservationId),
      guestId: guestId ? Number(guestId) : null,
    },
    getJwtSecret(),
    { expiresIn: ACCESS_TTL }
  );
}

export function verifyCheckInAccessToken(token, reservationId) {
  if (!token) return null;

  try {
    const payload = jwt.verify(token, getJwtSecret());
    if (payload.purpose !== ACCESS_PURPOSE || Number(payload.reservationId) !== Number(reservationId)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function authenticateTokenOrCheckInAccess(req, res, next) {
  const authHeader = req.headers.authorization;
  const staffToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const checkInToken = req.headers['x-checkin-token'];

  if (staffToken || req.cookies?.innkeeper_session) {
    return authenticateToken(req, res, next);
  }

  const reservationId = req.body?.reservationId || req.query?.resId || req.query?.reservationId;
  const access = verifyCheckInAccessToken(checkInToken, reservationId);
  if (!access) {
    return res.status(401).json({ error: 'A valid guest check-in link is required.' });
  }

  req.checkInAccess = access;
  next();
}
