/**
 * Image storage on Cloudinary, using an unsigned upload preset so no secret ships to the browser.
 * Only the cloud name and preset name are needed (neither is secret).
 */

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string | undefined;

export const isCloudinaryConfigured = Boolean(CLOUD_NAME && UPLOAD_PRESET);

/** Uploads an image (File, Blob or data URL) and returns an optimised delivery URL. */
export const uploadImage = async (source: Blob | string): Promise<string> => {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error('Photo storage is not configured. Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET.');
  }

  const body = new FormData();
  body.append('file', source);
  body.append('upload_preset', UPLOAD_PRESET);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body });
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
