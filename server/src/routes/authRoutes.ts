import { Router } from 'express';
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

/**
 * Auth Router
 * Handles Google Login Handshakes, Partner Pairings, and Profile Resolution.
 */
router.post('/google-callback', verifyFirebaseToken, googleLogin);
router.post('/complete-profile', verifyFirebaseToken, completeProfile);
router.get('/username-available', verifyFirebaseToken, usernameAvailable);
router.post('/pair-partner', verifyFirebaseToken, pairPartner);
router.get('/me', verifyFirebaseToken, getMe);
router.post('/logout', logout);

export default router;
