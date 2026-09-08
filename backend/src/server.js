import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import router from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { initializeDb } from './utils/db.js';
import { setSocketIo } from './utils/realtime.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const app = express();
const httpServer = createServer(app);

const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:4173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:4173',
  'http://127.0.0.1:3000',
  process.env.CORS_ORIGIN,
].filter(Boolean));

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: process.env.BODY_LIMIT || '50mb' }));
app.use(express.urlencoded({ limit: process.env.BODY_LIMIT || '50mb', extended: true }));
app.use(cookieParser());
app.use('/api', router);
app.use(errorHandler);

// ─── Socket.IO Setup ───────────────────────────────────────────────────────────
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: [...allowedOrigins],
    credentials: true,
    methods: ['GET', 'POST'],
  },
});

const jwtSecret = process.env.JWT_SECRET || 'innkeeper-super-secret-key-change-in-production';
const COOKIE_NAME = 'innkeeper_session';

// JWT authentication middleware for Socket.IO connections
io.use((socket, next) => {
  try {
    // Try auth token from handshake (sent by frontend as { auth: { token } })
    let token = socket.handshake.auth?.token;

    // Fallback: Bearer header
    if (!token) {
      const authHeader = socket.handshake.headers?.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.slice(7);
      }
    }

    // Fallback: cookie
    if (!token && socket.handshake.headers?.cookie) {
      const cookies = socket.handshake.headers.cookie;
      const match = cookies.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
      if (match) token = match[1];
    }

    if (!token) {
      return next(new Error('Authentication required'));
    }

    const payload = jwt.verify(token, jwtSecret);
    socket.user = {
      id: payload.id,
      email: payload.email,
      role: (payload.role || 'staff').toLowerCase(),
    };
    next();
  } catch (err) {
    next(new Error('Invalid or expired token'));
  }
});

io.on('connection', (socket) => {
  const { id, role } = socket.user;

  // Join user-specific room and role room
  socket.join(`user:${id}`);
  socket.join(`role:${role}`);

  console.log(`[Socket.IO] Connected: user ${id} (${role}) → rooms: user:${id}, role:${role}`);

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Disconnected: user ${id} (${role})`);
  });
});

// Register the Socket.IO server with the realtime utility
setSocketIo(io);

const port = process.env.PORT || 5000;

initializeDb().then(() => {
  httpServer.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log(`Socket.IO ready on port ${port}`);
  });
});
