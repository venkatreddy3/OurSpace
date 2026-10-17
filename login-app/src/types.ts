/** What we learn from Google after the first sign-in */
export interface GoogleProfile {
  email: string;
  name: string;
  photoURL?: string;
}

export type Gender = 'female' | 'male' | 'nonbinary' | 'private';

/** Details the person fills in after Google sign-in */
export interface ProfileDetails {
  name: string;
  gender: Gender;
  age: number;
  /** optional */
  phone: string;
}

export interface NewAccount extends ProfileDetails {
  email: string;
  username: string;
  password: string;
}

export interface SessionUser {
  name: string;
  email: string;
  username: string;
}

/**
 * Everything the login flow needs from the outside world.
 * The standalone harness passes mocks; the main app passes real Firebase / backend calls.
 */
export interface AuthServices {
  /** Opens Google sign-in. Resolves with the Google profile, or `existing` when the account is already set up. */
  googleSignIn: () => Promise<{ profile: GoogleProfile; existing: SessionUser | null }>;
  /** Emails a 6-digit code to the address */
  sendCode: (email: string) => Promise<void>;
  /** Resolves true when the code is right */
  verifyCode: (email: string, code: string) => Promise<boolean>;
  /** Resolves true when the username is free */
  checkUsername: (username: string) => Promise<boolean>;
  /** Creates the account (profile + username + password) */
  createAccount: (account: NewAccount) => Promise<SessionUser>;
  /** Username + password sign-in for returning users. Rejects with an Error on bad credentials. */
  loginWithPassword: (username: string, password: string) => Promise<SessionUser>;
}
