import 'dotenv/config'; // Must stay first: loads server/.env before any module reads process.env
import express from 'express';
import http from 'http';
import { Server as SocketServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import './config/firebase.js'; // Initialise Firebase Admin SDK on startup
import authRoutes from './routes/authRoutes.js';
import transferRoutes from './routes/transferRoutes.js';
import mediaRoutes from './routes/mediaRoutes.js';
import registerPartnerSockets from './sockets/partnerSocket.js';

const isProduction = process.env.NODE_ENV === 'production';

// The one browser origin allowed to call this API. Required in production so it can never fall back to a default.
if (isProduction && !process.env.CLIENT_URL) {
  throw new Error('CLIENT_URL must be set in production (the exact URL of the web app, e.g. https://ourspace.example).');
}
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const app = express();
const server = http.createServer(app);

app.disable('x-powered-by');
// Behind a hosting proxy (Render, Railway, ...) the real client IP comes from X-Forwarded-For; needed for rate limits
if (isProduction) app.set('trust proxy', 1);

// Mount WebSocket server
const io = new SocketServer(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  maxHttpBufferSize: 256 * 1024, // largest single realtime message (default is 1 MB)
});

// Global Middlewares
app.use(helmet()); // security headers (no sniffing, no framing, strict referrer policy, HSTS, ...)
app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
  })
);

// Throttle every API call per IP; the sensitive routes add stricter limits of their own
app.use(
  '/api',
  rateLimit({
    windowMs: 60 * 1000,
    limit: 300,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests. Please slow down.' },
  })
);

// Phone → gallery photo relay (mounted first: it brings its own larger JSON body limit)
app.use('/api/transfer', transferRoutes);

app.use(express.json({ limit: '100kb' }));

// REST API Routes
app.use('/api/auth', authRoutes);
app.use('/api/media', mediaRoutes);

// Root Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Unknown API paths get a plain JSON 404 instead of the framework's HTML error page
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: 'Not found.' });
});

// Global Error Handler: clients get a safe message; internals stay in the server log
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  let status = Number(err?.status ?? err?.statusCode) || 500;
  let message: string = status < 500 ? err?.message || 'Request failed.' : 'Internal Server Error';

  if (err?.type === 'entity.parse.failed') {
    status = 400;
    message = 'Invalid JSON.';
  } else if (err?.type === 'entity.too.large') {
    status = 413;
    message = 'Request body too large.';
  } else if (status >= 500) {
    console.error('Unhandled Server Error:', err);
    if (!isProduction) message = err?.message || message; // full detail only on a developer machine
  }

  res.status(status).json({ success: false, message });
});

// Configure Socket connections
registerPartnerSockets(io);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Ourspace intimate Firebase-backed backend running on port ${PORT}`);
});
