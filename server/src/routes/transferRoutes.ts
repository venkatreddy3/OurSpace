import { Router, Request, Response, NextFunction } from 'express';
import express from 'express';
import crypto from 'crypto';
import os from 'os';
import { verifyFirebaseToken, AuthenticatedRequest } from '../middlewares/authMiddleware.js';

/**
 * Phone → desktop photo relay.
 * A signed-in user's gallery opens a short-lived session and shows its link as a QR code.
 * The phone has no account: the long random token in the link is its permission to upload to that one session.
 * The desktop (signed in, and the session's owner) polls for the photos and adds them to the gallery.
 * Sessions live in memory only, with caps so a stranger can't exhaust the server.
 */

interface PendingPhoto {
  name: string;
  dataUrl: string;
  caption: string;
  uploadedAt: string;
}

interface Session {
  ownerUid: string;
  expiresAt: number;
  pending: PendingPhoto[];
  /** Characters of photo data currently buffered for this session */
  chars: number;
  uploads: number;
}

const SESSION_TTL_MS = 15 * 60 * 1000;
const MAX_SESSIONS_PER_USER = 3; // opening a 4th evicts the oldest
const MAX_PHOTOS_PER_REQUEST = 20;
const MAX_UPLOADS_PER_SESSION = 40;
const MAX_PENDING = 100;
const MAX_DATA_URL_CHARS = 5 * 1024 * 1024; // the phone shrinks photos first, so this is generous
const MAX_SESSION_CHARS = 60 * 1024 * 1024; // buffered per session
const MAX_TOTAL_CHARS = 200 * 1024 * 1024; // buffered across all sessions
const JSON_LIMIT = '30mb';

const sessions = new Map<string, Session>();
let totalChars = 0;

const dropSession = (token: string) => {
  const s = sessions.get(token);
  if (!s) return;
  totalChars -= s.chars;
  sessions.delete(token);
};

const sweep = () => {
  const now = Date.now();
  for (const [token, s] of sessions) if (s.expiresAt < now) dropSession(token);
};
setInterval(sweep, 60 * 1000).unref();

const getSession = (token: string): Session | null => {
  const s = sessions.get(token);
  if (!s) return null;
  if (s.expiresAt < Date.now()) {
    dropSession(token);
    return null;
  }
  return s;
};

/** First non-internal IPv4 address, so a phone on the same Wi-Fi can reach the dev machine */
const lanIp = (): string | null => {
  const nets = os.networkInterfaces();
  for (const list of Object.values(nets)) {
    for (const net of list || []) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return null;
};

/** Runs before the body is parsed, so an unknown or expired link never makes the server read a big upload. */
const requireSession = (req: Request, res: Response, next: NextFunction) => {
  const s = getSession(String(req.params.token));
  if (!s) {
    res.status(404).json({ success: false, message: 'This upload link has expired. Scan the QR code again.' });
    return;
  }
  res.locals.session = s;
  next();
};

const router = Router();

// Only meaningful on a dev machine; never reveal the server's network address in production.
router.get('/info', (_req, res) => {
  res.json({ lanIp: process.env.NODE_ENV === 'production' ? null : lanIp() });
});

// Desktop: start a session (login required)
router.post('/session', verifyFirebaseToken, (req: AuthenticatedRequest, res) => {
  const ownerUid = req.user!.uid;

  const mine = [...sessions.entries()].filter(([, s]) => s.ownerUid === ownerUid);
  while (mine.length >= MAX_SESSIONS_PER_USER) {
    const [oldest] = mine.shift()!; // Map keeps insertion order, so the first is the oldest
    dropSession(oldest);
  }

  const token = crypto.randomBytes(16).toString('hex');
  const expiresAt = Date.now() + SESSION_TTL_MS;
  sessions.set(token, { ownerUid, expiresAt, pending: [], chars: 0, uploads: 0 });
  res.json({ token, expiresAt });
});

// Phone: is this link still good?
router.get('/:token/status', (req, res) => {
  const s = getSession(req.params.token);
  res.json({ valid: !!s, expiresAt: s?.expiresAt ?? null });
});

// Phone: send photos (the link's token is the permission)
router.post('/:token/photos', requireSession, express.json({ limit: JSON_LIMIT }), (req, res) => {
  const s = res.locals.session as Session;

  if (s.uploads >= MAX_UPLOADS_PER_SESSION) {
    res.status(429).json({ success: false, message: 'Too many uploads for this link. Scan a new QR code.' });
    return;
  }

  const photos = Array.isArray(req.body?.photos) ? (req.body.photos as any[]) : [];
  const caption = typeof req.body?.caption === 'string' ? req.body.caption.slice(0, 200) : '';
  if (photos.length === 0 || photos.length > MAX_PHOTOS_PER_REQUEST) {
    res.status(400).json({ success: false, message: `Send between 1 and ${MAX_PHOTOS_PER_REQUEST} photos at a time.` });
    return;
  }

  let accepted = 0;
  let full = false;
  for (const p of photos) {
    const dataUrl = typeof p?.dataUrl === 'string' ? p.dataUrl : '';
    if (!/^data:image\/(jpeg|png|webp|gif);base64,/i.test(dataUrl) || dataUrl.length > MAX_DATA_URL_CHARS) continue;
    if (
      s.pending.length >= MAX_PENDING ||
      s.chars + dataUrl.length > MAX_SESSION_CHARS ||
      totalChars + dataUrl.length > MAX_TOTAL_CHARS
    ) {
      full = true;
      break;
    }
    s.pending.push({
      name: typeof p.name === 'string' ? p.name.slice(0, 120) : 'photo',
      dataUrl,
      caption,
      uploadedAt: new Date().toISOString(),
    });
    s.chars += dataUrl.length;
    totalChars += dataUrl.length;
    accepted++;
  }
  s.uploads++;

  if (accepted === 0) {
    res.status(full ? 503 : 400).json({
      success: false,
      message: full ? 'The upload queue is full. Try again in a moment.' : 'No valid images were received.',
    });
    return;
  }
  res.json({ success: true, accepted });
});

// Desktop: collect what has arrived (login required, and only the session's owner may collect it)
router.get('/:token/pending', verifyFirebaseToken, (req: AuthenticatedRequest, res) => {
  const s = getSession(String(req.params.token));
  if (!s || s.ownerUid !== req.user!.uid) {
    res.status(404).json({ valid: false, photos: [] });
    return;
  }
  const photos = s.pending.splice(0, s.pending.length);
  totalChars -= s.chars;
  s.chars = 0;
  res.json({ valid: true, photos });
});

export default router;
