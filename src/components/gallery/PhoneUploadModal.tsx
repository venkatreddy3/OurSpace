import React, { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import QRCode from 'qrcode';
import { Check, Copy, Loader2, Smartphone, X } from 'lucide-react';
import { transferService, type IncomingPhoto } from '../../services/transfer.service.js';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Called whenever photos arrive from the phone */
  onPhotos: (photos: IncomingPhoto[]) => void;
}

const isLocalHost = (h: string) => h === 'localhost' || h === '127.0.0.1' || h === '[::1]';

const PhoneUploadModal: React.FC<Props> = ({ isOpen, onClose, onPhotos }) => {
  const [token, setToken] = useState<string | null>(null);
  const [url, setUrl] = useState('');
  const [qr, setQr] = useState('');
  const [error, setError] = useState('');
  const [received, setReceived] = useState(0);
  const [copied, setCopied] = useState(false);
  const [expired, setExpired] = useState(false);
  const [viaLan, setViaLan] = useState(false);

  const start = useCallback(async () => {
    setError('');
    setExpired(false);
    setReceived(0);
    setToken(null);
    setQr('');
    try {
      const [newToken, lan] = await Promise.all([transferService.createSession(), transferService.lanIp()]);
      const { protocol, hostname, port } = window.location;
      // On a dev machine the phone can't reach "localhost", so use the computer's Wi-Fi address
      const host = isLocalHost(hostname) ? lan : hostname;
      setViaLan(isLocalHost(hostname));
      if (!host) {
        setError('Could not find this computer on your network. Make sure it is connected to Wi-Fi.');
        return;
      }
      const link = `${protocol}//${host}${port ? `:${port}` : ''}/upload/${newToken}`;
      setUrl(link);
      setQr(await QRCode.toDataURL(link, { width: 320, margin: 1, color: { dark: '#1a1a1a', light: '#ffffff' } }));
      setToken(newToken);
    } catch (err) {
      setError((err as Error).message || 'Could not start a phone upload session.');
    }
  }, []);

  useEffect(() => {
    if (isOpen) void start();
  }, [isOpen, start]);

  // Watch for photos sent from the phone
  useEffect(() => {
    if (!isOpen || !token) return;
    let stopped = false;
    const tick = async () => {
      try {
        const photos = await transferService.pending(token);
        if (stopped) return;
        if (photos === null) {
          setExpired(true);
          return;
        }
        if (photos.length) {
          setReceived((n) => n + photos.length);
          onPhotos(photos);
        }
      } catch {
        /* keep trying */
      }
    };
    const id = setInterval(tick, 1500);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [isOpen, token, onPhotos]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-sm bg-surface border border-primary/20 rounded-3xl shadow-2xl z-50 p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-2 font-serif text-xl font-bold text-on-surface">
                  <Smartphone className="w-5 h-5 text-primary" /> Upload from your phone
                </h3>
                <p className="text-xs text-on-surface-variant mt-1">
                  Scan this code with your phone camera, choose your photos and tap Upload.
                </p>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-full hover:bg-primary/10 cursor-pointer" aria-label="Close">
                <X className="w-4 h-4 text-on-surface-variant" />
              </button>
            </div>

            <div className="mt-5 flex flex-col items-center gap-4">
              <div className="relative w-56 h-56 rounded-2xl bg-white p-2 flex items-center justify-center border border-primary/10">
                {qr && !expired ? (
                  <img src={qr} alt="QR code to upload photos from your phone" className="w-full h-full" />
                ) : error ? (
                  <p className="text-xs text-red-500 text-center px-3">{error}</p>
                ) : expired ? (
                  <button onClick={start} className="text-sm font-semibold text-primary cursor-pointer">
                    Code expired — get a new one
                  </button>
                ) : (
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                )}
              </div>

              <div className="h-6 flex items-center justify-center">
                {received > 0 ? (
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-primary">
                    <Check className="w-4 h-4" /> {received} photo{received > 1 ? 's' : ''} added to your gallery
                  </span>
                ) : token && !expired ? (
                  <span className="flex items-center gap-2 text-xs text-on-surface-variant">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                    </span>
                    Waiting for your phone…
                  </span>
                ) : null}
              </div>

              {url && (
                <button
                  onClick={copy}
                  className="flex items-center gap-2 max-w-full text-[11px] font-mono text-on-surface-variant hover:text-primary cursor-pointer"
                  title="Copy link"
                >
                  <span className="truncate">{url}</span>
                  {copied ? <Check className="w-3.5 h-3.5 flex-shrink-0" /> : <Copy className="w-3.5 h-3.5 flex-shrink-0" />}
                </button>
              )}
              <p className="text-[10px] text-on-surface-variant/70 text-center">
                {viaLan ? 'Your phone and computer need to be on the same Wi-Fi. ' : ''}The code works for 15 minutes.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default PhoneUploadModal;
