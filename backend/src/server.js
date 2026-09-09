import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import router from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { initializeDb } from './utils/db.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

import http from 'http';
import { Server as SocketServer } from 'socket.io';
import { setSocketIo } from './utils/realtime.js';
import { seedRbacData } from './services/rbacService.js';

const app = express();
const server = http.createServer(app);

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

const corsOptions = {
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
};

app.use(cors(corsOptions));
app.use(express.json({ limit: process.env.BODY_LIMIT || '50mb' }));
app.use(express.urlencoded({ limit: process.env.BODY_LIMIT || '50mb', extended: true }));
app.use(cookieParser());
app.use('/rooms', express.static(path.resolve(__dirname, '../../frontend/public/rooms')));
app.use('/rooms', express.static(path.resolve(__dirname, '../../frontend/client/public/rooms')));
app.use('/api', router);
app.use(errorHandler);

const io = new SocketServer(server, {
  cors: corsOptions,
});
setSocketIo(io);

io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

const port = process.env.PORT || 5000;

initializeDb().then(async () => {
  await seedRbacData();
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n[ERROR] Port ${port} is already in use by another running process.`);
      console.error(`Kill the existing process on port ${port} or choose another port in .env (e.g. PORT=5001).\n`);
    } else {
      console.error('Server startup error:', err);
    }
    process.exit(1);
  });

  server.listen(port, () => {
    console.log(`Server running on port ${port} with Socket.IO enabled`);
  });
});
