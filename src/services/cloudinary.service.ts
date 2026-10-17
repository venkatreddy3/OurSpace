/**
 * Image storage on Cloudinary.
 *
 * Preferred path: signed uploads. The browser asks our API for a short-lived signature (login required) and
 * uploads with it, so only signed-in people can upload and the API secret never leaves the server.
 *
 * Fallback: if the server isn't set up for signing yet (no Cloudinary keys), it answers 503 and we use the
 * unsigned upload preset instead. Once signing works, delete or switch that preset to "Signed" in Cloudinary so
 * the public upload path is closed.
 */
import api from './api.js';
import { getAuthToken } from './authToken.js';

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string | undefined;

export const isCloudinaryConfigured = Boolean(CLOUD_NAME && UPLOAD_PRESET);

interface UploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  allowedFormats: string;
  signature: string;
}

/** A signature from our API, or null when the server hasn't been set up for signed uploads */
const requestSignature = async (): Promise<UploadSignature | null> => {
  try {
    const res = await api.post('/media/sign', {}, { headers: { Authorization: `Bearer ${await getAuthToken()}` } });
    return res.data as UploadSignature;
  } catch (err: any) {
    if (err?.response?.status === 503) return null;
    throw new Error(err?.response?.data?.message || 'Could not start the photo upload. Please try again.');
  }
};

/** Uploads an image (File, Blob or data URL) and returns an optimised delivery URL. */
export const uploadImage = async (source: Blob | string): Promise<string> => {
  const signed = await requestSignature();

  const body = new FormData();
  body.append('file', source);
  let cloudName: string;

  if (signed) {
    cloudName = signed.cloudName;
    body.append('api_key', signed.apiKey);
    body.append('timestamp', String(signed.timestamp));
    body.append('folder', signed.folder);
    body.append('allowed_formats', signed.allowedFormats);
    body.append('signature', signed.signature);
  } else {
    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      throw new Error('Photo storage is not configured. Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET.');
    }
    cloudName = CLOUD_NAME;
    body.append('upload_preset', UPLOAD_PRESET);
  }

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.secure_url) {
    throw new Error(data?.error?.message || 'Photo upload failed. Please try again.');
  }

  // f_auto,q_auto lets Cloudinary pick the smallest format/quality for each viewer
  return (data.secure_url as string).replace('/upload/', '/upload/f_auto,q_auto/');
};

/** Uploads data URLs, passes already-hosted URLs through unchanged. */
export const uploadIfLocal = (url: string): Promise<string> =>
  url.startsWith('data:') ? uploadImage(url) : Promise.resolve(url);
