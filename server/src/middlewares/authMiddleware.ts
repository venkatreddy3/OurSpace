import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../config/firebase.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    name?: string;
    picture?: string;
    coupleId?: string | null;
  };
}

/**
 * verifyFirebaseToken Middleware
 * Purpose:
 * - Intercepts Express requests.
 * - Extracts and verifies Google OAuth credentials using Firebase Admin SDK.
 * - Supports 'mock-dev-token' bypass for local dev workflows.
 */
export const verifyFirebaseToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, message: 'Access Denied: ID token missing.' });
      return;
    }

    const token = authHeader.split(' ')[1];

    // Local Development Bypass Check (never accepted in production)
    if (token === 'mock-dev-token' && process.env.NODE_ENV !== 'production') {
      req.user = {
        uid: 'dev-user-uid',
        email: 'dev@ourspace.app',
        name: 'Dev User',
        picture: '',
      };
      next();
      return;
    }
    
    // Verify Firebase Auth Token
    const decodedToken = await adminAuth.verifyIdToken(token);

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name,
      picture: decodedToken.picture,
    };

    next();
  } catch (error) {
    console.error('Firebase token verification error:', error);
    res.status(401).json({ success: false, message: 'Access Denied: Invalid authentication token.' });
  }
};

export default verifyFirebaseToken;
