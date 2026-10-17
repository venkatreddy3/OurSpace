import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  googleLogin,
  getMe,
  logout,
  pairPartner,
  completeProfile,
  usernameAvailable,
} from '../controllers/authController.js';
import { verifyFirebaseToken } from '../middlewares/authMiddleware.js';

const router = Router();

// Per IP, on top of the per-account lockout in the controller
const pairingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many pairing attempts. Please wait a while and try again.' },
});

/**
 * Auth Router
 * Handles Google Login Handshakes, Partner Pairings, and Profile Resolution.
 */
router.post('/google-callback', verifyFirebaseToken, googleLogin);
router.post('/complete-profile', verifyFirebaseToken, completeProfile);
router.get('/username-available', verifyFirebaseToken, usernameAvailable);
router.post('/pair-partner', pairingLimiter, verifyFirebaseToken, pairPartner);
router.get('/me', verifyFirebaseToken, getMe);
router.post('/logout', logout);

export default router;
