/** Phone → desktop photo transfer (talks to /api/transfer on the backend) */
import { getAuthToken } from './authToken.js';

export interface IncomingPhoto {
  name: string;
  dataUrl: string;
  caption: string;
  uploadedAt: string;
}

const base = '/api/transfer';

/** Starting a session and collecting photos need a login; the phone's own calls don't. */
const authHeaders = async (): Promise<Record<string, string>> => ({
  Authorization: `Bearer ${await getAuthToken()}`,
});

export const transferService = {
  async createSession(): Promise<string> {
    const res = await fetch(`${base}/session`, { method: 'POST', headers: await authHeaders() });
    if (res.status === 401) throw new Error('Please sign in again to use phone upload.');
    if (!res.ok) throw new Error('Could not start a phone upload session.');
    return (await res.json()).token as string;
  },

  async lanIp(): Promise<string | null> {
    try {
      const res = await fetch(`${base}/info`);
      return ((await res.json()).lanIp as string | null) ?? null;
    } catch {
      return null;
    }
  },

  /** Returns null when the session has expired */
  async pending(token: string): Promise<IncomingPhoto[] | null> {
    const res = await fetch(`${base}/${token}/pending`, { headers: await authHeaders() });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error('Could not check for new photos.');
    return (await res.json()).photos as IncomingPhoto[];
  },

  async isValid(token: string): Promise<boolean> {
    try {
      const res = await fetch(`${base}/${token}/status`);
      return !!(await res.json()).valid;
    } catch {
      return false;
    }
  },

  async upload(token: string, photos: { name: string; dataUrl: string }[], caption: string): Promise<void> {
    const res = await fetch(`${base}/${token}/photos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photos, caption }),
    });
    if (!res.ok) {
      let message = 'Upload failed. Please try again.';
      try {
        message = (await res.json()).message || message;
      } catch {
        /* ignore */
      }
      throw new Error(message);
    }
  },
};

export default transferService;
