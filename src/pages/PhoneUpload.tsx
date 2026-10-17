import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Heart, ImagePlus, Loader2, X } from 'lucide-react';
import { transferService } from '../services/transfer.service.js';

const MAX_SIDE = 1600;
const BATCH = 4;

interface Picked {
  id: string;
  file: File;
  preview: string;
}

/** Shrink a photo before upload so phone photos (often 5–10 MB) send quickly */
const shrink = async (file: File): Promise<string> => {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d')?.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close();
    return canvas.toDataURL('image/jpeg', 0.82);
  } catch {
    // Fall back to the original file if the browser can't decode it
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }
};

/**
 * Mobile page opened by scanning the QR code on the Gallery page.
 * Choosing photos opens the phone's own photo picker, which is where the
 * device asks permission to access the gallery.
 */
const PhoneUpload: React.FC = () => {
  const { token = '' } = useParams();
  const [valid, setValid] = useState<boolean | null>(null);
  const [picked, setPicked] = useState<Picked[]>([]);
  const [caption, setCaption] = useState('');
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [sent, setSent] = useState(0);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    transferService.isValid(token).then(setValid);
  }, [token]);

  useEffect(
    () => () => picked.forEach((p) => URL.revokeObjectURL(p.preview)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter((f) => f.type.startsWith('image/'));
    setPicked((prev) => [
      ...prev,
      ...files.map((file) => ({
        id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 7)}`,
        file,
        preview: URL.createObjectURL(file),
      })),
    ]);
    setSent(0);
    setError('');
    e.target.value = '';
  };

  const remove = (id: string) => {
    setPicked((prev) => {
      const gone = prev.find((p) => p.id === id);
      if (gone) URL.revokeObjectURL(gone.preview);
      return prev.filter((p) => p.id !== id);
    });
  };

  const upload = async () => {
    if (!picked.length || sending) return;
    setSending(true);
    setError('');
    setProgress(0);
    try {
      let done = 0;
      for (let i = 0; i < picked.length; i += BATCH) {
        const chunk = picked.slice(i, i + BATCH);
        const photos = await Promise.all(chunk.map(async (p) => ({ name: p.file.name, dataUrl: await shrink(p.file) })));
        await transferService.upload(token, photos, caption.trim());
        done += chunk.length;
        setProgress(Math.round((done / picked.length) * 100));
      }
      picked.forEach((p) => URL.revokeObjectURL(p.preview));
      setSent(done);
      setPicked([]);
      setCaption('');
    } catch (err) {
      setError((err as Error).message || 'Upload failed. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-on-background flex flex-col items-center px-5 py-8">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <header className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-full bg-primary text-on-primary flex items-center justify-center">
            <Heart className="w-4 h-4 fill-current" />
          </span>
          <span className="font-serif text-2xl text-on-surface">Ourspace</span>
        </header>

        {valid === null && (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}

        {valid === false && (
          <div className="rounded-2xl border border-primary/15 bg-surface-container p-6 text-center space-y-2">
            <p className="font-semibold text-on-surface">This link has expired</p>
            <p className="text-sm text-on-surface-variant">Go back to the Shared Gallery on your computer and scan the new QR code.</p>
          </div>
        )}

        {valid && (
          <>
            <div>
              <h1 className="font-serif text-2xl font-bold text-on-surface">Send photos to your gallery</h1>
              <p className="text-sm text-on-surface-variant mt-1">
                Choose photos from your phone. Your phone will ask to open your photo library.
              </p>
            </div>

            <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={onPick} />

            <button
              onClick={() => inputRef.current?.click()}
              disabled={sending}
              className="flex items-center justify-center gap-2.5 w-full py-4 rounded-2xl border-2 border-dashed border-primary/35 text-primary font-semibold active:scale-[0.98] transition-transform disabled:opacity-50 cursor-pointer"
            >
              <ImagePlus className="w-5 h-5" />
              {picked.length ? 'Add more photos' : 'Choose photos'}
            </button>

            {picked.length > 0 && (
              <>
                <div className="grid grid-cols-3 gap-2">
                  {picked.map((p) => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="relative aspect-square rounded-xl overflow-hidden bg-surface-container"
                    >
                      <img src={p.preview} alt="" className="w-full h-full object-cover" />
                      {!sending && (
                        <button
                          onClick={() => remove(p.id)}
                          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center"
                          aria-label="Remove photo"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </motion.div>
                  ))}
                </div>

                <input
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  maxLength={200}
                  placeholder="Add a caption (optional)"
                  className="w-full bg-surface-container-high border border-primary/10 focus:border-primary/40 outline-none rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/50"
                />

                <button
                  onClick={upload}
                  disabled={sending}
                  className="relative overflow-hidden flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-primary text-on-primary font-semibold disabled:opacity-90 cursor-pointer"
                >
                  {sending && (
                    <span
                      className="absolute inset-y-0 left-0 bg-white/25 transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  )}
                  <span className="relative flex items-center gap-2">
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {sending ? `Uploading… ${progress}%` : `Upload ${picked.length} photo${picked.length > 1 ? 's' : ''}`}
                  </span>
                </button>
              </>
            )}

            {error && <p className="text-sm text-red-500 text-center">{error}</p>}

            {sent > 0 && !picked.length && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-primary/15 bg-surface-container p-5 text-center space-y-1"
              >
                <span className="mx-auto w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <Check className="w-5 h-5" />
                </span>
                <p className="font-semibold text-on-surface">
                  {sent} photo{sent > 1 ? 's' : ''} sent
                </p>
                <p className="text-sm text-on-surface-variant">They'll appear in your Shared Gallery on your computer.</p>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PhoneUpload;
