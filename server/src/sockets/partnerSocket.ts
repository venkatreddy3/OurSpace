import { Server, Socket } from 'socket.io';
import { adminAuth, adminDb } from '../config/firebase.js';

/**
 * Socket.io Event Coordinator
 * Purpose:
 * - Authenticates every connection with the user's Firebase ID token.
 * - Puts each user in their own couple's room. The room comes from the database (users/{uid}.coupleId),
 *   never from anything the client sends, so one couple can't listen to another.
 * - Relays live notes, game messages and status between the partners.
 */

const ROOM_PREFIX = 'couple:';
const RATE_WINDOW_MS = 10_000;
const RATE_MAX_EVENTS = 200;

const verifyToken = async (token: unknown): Promise<string> => {
  if (typeof token !== 'string' || !token) throw new Error('unauthorized');
  // Same dev-only bypass as the REST middleware; never accepted in production
  if (token === 'mock-dev-token' && process.env.NODE_ENV !== 'production') return 'dev-user-uid';
  const decoded = await adminAuth.verifyIdToken(token);
  return decoded.uid;
};

const lookupCoupleId = async (uid: string): Promise<string | null> => {
  const snap = await adminDb.collection('users').doc(uid).get();
  const coupleId = snap.exists ? snap.data()?.coupleId : null;
  return typeof coupleId === 'string' && coupleId ? coupleId : null;
};

/** Moves the socket into the room for its user's current couple (and out of any old one). */
const syncRoom = async (socket: Socket): Promise<void> => {
  const coupleId = await lookupCoupleId(socket.data.uid);
  socket.data.coupleId = coupleId;
  for (const room of socket.rooms) {
    if (room.startsWith(ROOM_PREFIX)) await socket.leave(room);
  }
  if (coupleId) await socket.join(ROOM_PREFIX + coupleId);
};

const makeRateLimiter = () => {
  let windowStart = Date.now();
  let count = 0;
  return (): boolean => {
    const now = Date.now();
    if (now - windowStart > RATE_WINDOW_MS) {
      windowStart = now;
      count = 0;
    }
    return ++count <= RATE_MAX_EVENTS;
  };
};

/** Copies a client-supplied message and stamps the real sender, so fromUid can't be spoofed. */
const stamp = (message: unknown, uid: string): Record<string, unknown> | null =>
  message && typeof message === 'object' && !Array.isArray(message)
    ? { ...(message as Record<string, unknown>), fromUid: uid }
    : null;

export const registerPartnerSockets = (io: Server) => {
  // Reject connections that don't carry a valid Firebase ID token
  io.use(async (socket, next) => {
    try {
      socket.data.uid = await verifyToken(socket.handshake.auth?.token);
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const uid: string = socket.data.uid;
    const allowed = makeRateLimiter();
    console.log(`Socket client connected: ${socket.id}`);

    syncRoom(socket).catch((err) => console.error('Could not join couple room:', err));

    /** Runs a relay only for rate-limited sockets that are in a couple room. */
    const relay = (handler: (room: string) => void) => {
      const coupleId: string | null = socket.data.coupleId;
      if (!allowed() || !coupleId) return;
      handler(ROOM_PREFIX + coupleId);
    };

    // The client says "I may have paired"; the room is re-read from the database, the payload is ignored
    socket.on('join_couple_room', () => {
      if (!allowed()) return;
      syncRoom(socket).catch((err) => console.error('Could not join couple room:', err));
    });

    // Real-time status toggle (e.g. active, typing, sleeping)
    socket.on('update_status', (data: { statusText?: unknown } | undefined) => {
      relay((room) => {
        const statusText = typeof data?.statusText === 'string' ? data.statusText.slice(0, 100) : '';
        socket.to(room).emit('partner_status_updated', { coupleId: socket.data.coupleId, statusText });
      });
    });

    // Instant partner notes
    socket.on('send_nudge', (data: { nudge?: unknown } | undefined) => {
      relay((room) => {
        const nudge = stamp(data?.nudge, uid);
        if (nudge) socket.to(room).emit('nudge_received', nudge);
      });
    });

    // Game invites + live game state
    socket.on('game_msg', (data: { msg?: unknown } | undefined) => {
      relay((room) => {
        const msg = stamp(data?.msg, uid);
        if (msg) socket.to(room).emit('game_msg_received', msg);
      });
    });

    // Settle mini-game turns or choices
    socket.on('game_turn', (data: { payload?: unknown } | undefined) => {
      relay((room) => socket.to(room).emit('game_turn_received', data?.payload));
    });

    socket.on('disconnect', () => {
      console.log(`Socket client disconnected: ${socket.id}`);
    });
  });
};

export default registerPartnerSockets;
