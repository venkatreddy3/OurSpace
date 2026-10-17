import 'dotenv/config'; // Must stay first: loads server/.env before any module reads process.env
import express from 'express';
import http from 'http';
import { Server as SocketServer } from 'socket.io';
import cors from 'cors';
import './config/firebase.js'; // Initialise Firebase Admin SDK on startup
import authRoutes from './routes/authRoutes.js';
import transferRoutes from './routes/transferRoutes.js';
import registerPartnerSockets from './sockets/partnerSocket.js';

const app = express();
const server = http.createServer(app);

// Mount WebSocket server
const io = new SocketServer(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Global Middlewares
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);
// Phone → gallery photo relay (mounted first: it brings its own larger JSON body limit)
app.use('/api/transfer', transferRoutes);

app.use(express.json());

// REST API Routes
app.use('/api/auth', authRoutes);

// Root Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', database: 'firestore', timestamp: new Date() });
});

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// Configure Socket connections
registerPartnerSockets(io);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Ourspace intimate Firebase-backed backend running on port ${PORT}`);
});
