import crypto from 'crypto';
import { Response, NextFunction } from 'express';
import { adminAuth, adminDb } from '../config/firebase.js';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';

// Profile rules (kept in sync with src/services/profile.service.ts)
const USERNAME_RE = /^[a-z0-9_.]{3,20}$/;
const GENDERS = ['female', 'male', 'nonbinary', 'private'];
const MIN_AGE = 16;
const MAX_AGE = 120;
/** Username logins are a Firebase email/password credential on a hidden, non-deliverable address */
const usernameEmail = (username: string) => `${username}@ourspace.invalid`;

/** Age in whole years for a YYYY-MM-DD date, or null when the date isn't a real past date */
const ageFromDob = (dob: unknown): number | null => {
  if (typeof dob !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dob)) return null;
  const born = new Date(`${dob}T00:00:00Z`);
  if (Number.isNaN(born.getTime()) || born.toISOString().slice(0, 10) !== dob) return null;
  const now = new Date();
  let age = now.getUTCFullYear() - born.getUTCFullYear();
  const hadBirthday =
    now.getUTCMonth() > born.getUTCMonth() ||
    (now.getUTCMonth() === born.getUTCMonth() && now.getUTCDate() >= born.getUTCDate());
  if (!hadBirthday) age--;
  return age >= 0 ? age : null;
};

const httpError = (status: number, message: string) => Object.assign(new Error(message), { status });

// Pairing guesses: after a few wrong codes a user is locked out for a while, so codes can't be brute-forced
const MAX_FAILED_PAIRINGS = 5;
const PAIRING_LOCK_MS = 15 * 60 * 1000;
const failedPairings = new Map<string, { count: number; resetAt: number }>();
const isPairingLocked = (uid: string): boolean => {
  const entry = failedPairings.get(uid);
  return !!entry && entry.resetAt > Date.now() && entry.count >= MAX_FAILED_PAIRINGS;
};
const recordFailedPairing = (uid: string) => {
  const now = Date.now();
  const entry = failedPairings.get(uid);
  if (!entry || entry.resetAt <= now) failedPairings.set(uid, { count: 1, resetAt: now + PAIRING_LOCK_MS });
  else entry.count++;
};

// Helper to generate a unique 6-character uppercase invite code
const generateInviteCode = async (): Promise<string> => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let isUnique = false;
  let code = '';
  
  while (!isUnique) {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(crypto.randomInt(chars.length)); // cryptographically random, not Math.random
    }
    
    // Check uniqueness in Firestore users collection
    const userSnapshot = await adminDb.collection('users').where('inviteCode', '==', code).get();
    if (userSnapshot.empty) {
      isUnique = true;
    }
  }
  return code;
};

/**
 * googleLoginCallback Route handler
 * - Handles authentication handshake.
 * - Upserts user profile in Firestore.
 * - New users start with profileComplete: false; their invite code is generated in completeProfile.
 */
export const googleLogin = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(400).json({ success: false, message: 'Google Auth details missing in request.' });
      return;
    }

    const { uid, email, name, picture } = req.user;

    const userRef = adminDb.collection('users').doc(uid);
    const userDoc = await userRef.get();

    let userData: any;

    if (!userDoc.exists) {
      userData = {
        uid,
        email: email || '',
        displayName: name || 'User',
        photoURL: picture || '',
        coupleId: null,
        inviteCode: null,
        profileComplete: false,
        createdAt: new Date(),
      };
      await userRef.set(userData);
      console.log(`Created new Firestore user for UID: ${uid}`);
    } else {
      userData = userDoc.data();
    }

    res.status(200).json({
      success: true,
      user: userData,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * pairPartner Route handler
 * - Verifies inviteCode.
 * - Connects two accounts by registering a couple record.
 */
export const pairPartner = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rawCode = req.body?.inviteCode;
    if (!rawCode) {
      res.status(400).json({ success: false, message: 'Invite code is required.' });
      return;
    }
    const inviteCode = typeof rawCode === 'string' ? rawCode.toUpperCase().trim() : '';
    if (!/^[A-Z0-9]{6}$/.test(inviteCode)) {
      res.status(400).json({ success: false, message: 'Invite codes are 6 letters or numbers.' });
      return;
    }

    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized: Session missing.' });
      return;
    }

    const currentUid = req.user.uid;
    if (isPairingLocked(currentUid)) {
      res.status(429).json({ success: false, message: 'Too many wrong codes. Please wait 15 minutes and try again.' });
      return;
    }
    const userRef = adminDb.collection('users').doc(currentUid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      res.status(404).json({ success: false, message: 'User profile not found.' });
      return;
    }

    const currentUserData = userDoc.data();
    if (!currentUserData?.profileComplete) {
      res.status(403).json({ success: false, message: 'Finish setting up your profile before pairing.' });
      return;
    }
    if (currentUserData?.coupleId) {
      res.status(400).json({ success: false, message: 'You are already paired.' });
      return;
    }

    // Search partner by inviteCode
    const partnerSnapshot = await adminDb
      .collection('users')
      .where('inviteCode', '==', inviteCode)
      .limit(1)
      .get();

    if (partnerSnapshot.empty) {
      recordFailedPairing(currentUid);
      res.status(404).json({ success: false, message: 'Invalid invite code. Partner not found.' });
      return;
    }

    const partnerDoc = partnerSnapshot.docs[0];
    const partnerData = partnerDoc.data();
    const partnerUid = partnerDoc.id;

    if (partnerUid === currentUid) {
      res.status(400).json({ success: false, message: 'You cannot pair with yourself.' });
      return;
    }

    if (!partnerData.profileComplete) {
      res.status(400).json({ success: false, message: 'Your partner needs to finish setting up their profile first.' });
      return;
    }

    if (partnerData.coupleId) {
      res.status(400).json({ success: false, message: 'This partner is already paired with someone else.' });
      return;
    }

    // Create Couple document
    const coupleId = `${currentUid}_${partnerUid}`;
    const coupleRef = adminDb.collection('couples').doc(coupleId);
    
    // One transaction: re-check that neither person got paired in the meantime, then link both.
    // (Two simultaneous requests can no longer pair the same person twice.)
    await adminDb.runTransaction(async (tx) => {
      const [me, them] = await Promise.all([tx.get(userRef), tx.get(partnerDoc.ref)]);
      if (me.data()?.coupleId || them.data()?.coupleId) {
        throw httpError(409, 'One of you is already paired.');
      }
      tx.set(coupleRef, {
        id: coupleId,
        partner1Id: currentUid,
        partner2Id: partnerUid,
        anniversaryDate: null,
        status: 'active',
        createdAt: new Date(),
      });
      tx.update(userRef, { coupleId });
      tx.update(partnerDoc.ref, { coupleId });
    });
    failedPairings.delete(currentUid);

    res.status(200).json({
      success: true,
      message: 'Linked successfully!',
      coupleId,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * getMe Route handler
 * - Resolves profile info, partner details, and couple profile configurations.
 */
export const getMe = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized session.' });
      return;
    }

    const { uid } = req.user;
    const userDoc = await adminDb.collection('users').doc(uid).get();

    if (!userDoc.exists) {
      res.status(404).json({ success: false, message: 'User profile not found.' });
      return;
    }

    const userData = userDoc.data();
    let partnerData: any = null;
    let coupleData: any = null;

    if (userData?.coupleId) {
      const coupleDoc = await adminDb.collection('couples').doc(userData.coupleId).get();
      if (coupleDoc.exists) {
        coupleData = coupleDoc.data();
        const partnerId = coupleData.partner1Id === uid ? coupleData.partner2Id : coupleData.partner1Id;
        const partnerDoc = await adminDb.collection('users').doc(partnerId).get();
        if (partnerDoc.exists) {
          // Only what the app shows about a partner; never their email, birthday or gender
          const p = partnerDoc.data()!;
          partnerData = {
            uid: partnerDoc.id,
            displayName: p.displayName,
            photoURL: p.photoURL,
            username: p.username,
            coupleId: p.coupleId,
          };
        }
      }
    }

    res.status(200).json({
      success: true,
      user: userData,
      partner: partnerData,
      couple: coupleData,
    });
  } catch (error) {
    next(error);
  }
};

/** Per-user limiter for the username availability lookups */
const lookups = new Map<string, { count: number; resetAt: number }>();
const allowLookup = (uid: string): boolean => {
  const now = Date.now();
  const entry = lookups.get(uid);
  if (!entry || entry.resetAt < now) {
    lookups.set(uid, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  return ++entry.count <= 60;
};

/**
 * usernameAvailable Route handler
 * - Free when no finished profile has the name and no other account has reserved its sign-in address.
 */
export const usernameAvailable = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const uid = req.user!.uid;
    if (!allowLookup(uid)) {
      res.status(429).json({ success: false, message: 'Too many checks. Try again in a minute.' });
      return;
    }

    const username = typeof req.query.u === 'string' ? req.query.u : '';
    if (!USERNAME_RE.test(username)) {
      res.status(200).json({ success: true, available: false, valid: false });
      return;
    }

    const taken = await adminDb.collection('usernames').doc(username).get();
    if (taken.exists && taken.data()?.uid !== uid) {
      res.status(200).json({ success: true, available: false, valid: true });
      return;
    }

    let reservedByOther = false;
    try {
      const holder = await adminAuth.getUserByEmail(usernameEmail(username));
      reservedByOther = holder.uid !== uid;
    } catch (err: any) {
      if (err?.code !== 'auth/user-not-found') throw err;
    }

    res.status(200).json({ success: true, available: !reservedByOther, valid: true });
  } catch (error) {
    next(error);
  }
};

/**
 * completeProfile Route handler
 * - Runs after the client has linked a password to the signed-in Google account.
 * - Validates name, gender, date of birth and username, then marks the profile complete
 *   and generates the invite code used for pairing.
 */
export const completeProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const uid = req.user!.uid;
    const body = req.body ?? {};

    const name = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : '';
    const gender = typeof body.gender === 'string' ? body.gender : '';
    const dob = body.dob;
    const username = typeof body.username === 'string' ? body.username : '';
    const age = ageFromDob(dob);

    if (name.length < 2 || name.length > 60) throw httpError(400, 'Please enter your name (2 to 60 characters).');
    if (!GENDERS.includes(gender)) throw httpError(400, 'Please pick an option for gender.');
    if (age === null) throw httpError(400, 'Please enter a valid date of birth.');
    if (age < MIN_AGE) throw httpError(400, `You must be at least ${MIN_AGE} to use OurSpace.`);
    if (age > MAX_AGE) throw httpError(400, 'Please enter a valid date of birth.');
    if (!USERNAME_RE.test(username)) throw httpError(400, 'Username: 3 to 20 letters, numbers, dots or underscores.');

    const userRef = adminDb.collection('users').doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) throw httpError(404, 'User profile not found.');
    if (userSnap.data()?.profileComplete) throw httpError(409, 'Your profile is already complete.');

    // The password must already be linked, under this exact username
    const record = await adminAuth.getUser(uid);
    const linked = record.providerData.some(
      (p) => p.providerId === 'password' && p.email?.toLowerCase() === usernameEmail(username)
    );
    if (!linked) throw httpError(400, 'Create your password first.');

    const inviteCode = userSnap.data()?.inviteCode || (await generateInviteCode());

    await adminDb.runTransaction(async (tx) => {
      const nameRef = adminDb.collection('usernames').doc(username);
      const nameSnap = await tx.get(nameRef);
      if (nameSnap.exists && nameSnap.data()?.uid !== uid) throw httpError(409, 'That username is taken.');
      tx.set(nameRef, { uid, createdAt: new Date() });
      tx.update(userRef, {
        displayName: name,
        gender,
        dob,
        username,
        inviteCode,
        profileComplete: true,
        profileCompletedAt: new Date(),
      });
    });

    const updated = await userRef.get();
    res.status(200).json({ success: true, user: updated.data() });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};
