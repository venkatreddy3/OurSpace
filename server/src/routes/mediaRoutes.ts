import { Router } from 'express';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { verifyFirebaseToken, AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { adminDb } from '../config/firebase.js';

/**
 * Signed image uploads.
 * Instead of letting anyone with a public preset upload to the Cloudinary account, the browser asks this API
 * for a short-lived signature (login required) and uploads with it. Cloudinary only accepts uploads whose
 * signature matches, so the folder and allowed formats below can't be changed by the client.
 * The API secret stays on the server.
 */

const FOLDER = 'ourspace';
const ALLOWED_FORMATS = 'jpg,png,webp,gif';

const router = Router();

const signLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 150,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many uploads. Please try again later.' },
});

router.post('/sign', signLimiter, verifyFirebaseToken, async (req: AuthenticatedRequest, res, next) => {
  try {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) {
      res.status(503).json({ success: false, configured: false, message: 'Signed uploads are not set up on the server.' });
      return;
    }

    // Only people who finished creating their account may upload
    const snap = await adminDb.collection('users').doc(req.user!.uid).get();
    if (!snap.data()?.profileComplete) {
      res.status(403).json({ success: false, message: 'Finish setting up your profile before uploading photos.' });
      return;
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const signed: Record<string, string | number> = { allowed_formats: ALLOWED_FORMATS, folder: FOLDER, timestamp };
    // Cloudinary signs the parameters sorted by name as "a=1&b=2" followed by the API secret
    const toSign = Object.keys(signed)
      .sort()
      .map((key) => `${key}=${signed[key]}`)
      .join('&');
    const signature = crypto.createHash('sha1').update(toSign + apiSecret).digest('hex');

    res.json({ success: true, cloudName, apiKey, timestamp, folder: FOLDER, allowedFormats: ALLOWED_FORMATS, signature });
  } catch (error) {
    next(error);
  }
});

export default router;
