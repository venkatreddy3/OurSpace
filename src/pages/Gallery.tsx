import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image as ImageIcon, Upload, Eye, Calendar, Folder, Trash2, Smartphone } from 'lucide-react';
import UploadPhotoModal from '../components/gallery/UploadPhotoModal.js';
import BounceCards from '../components/gallery/BounceCards.js';
import PhoneUploadModal from '../components/gallery/PhoneUploadModal.js';
import type { IncomingPhoto } from '../services/transfer.service.js';
import { galleryService, shrinkImageFile, type GalleryItem, type NewGalleryItem } from '../services/gallery.service.js';
import { useAuthStore } from '../store/authStore.js';

type LayoutMode = 'square' | 'masonry' | 'polaroid' | 'bounce';

const Gallery: React.FC = () => {
  const { user } = useAuthStore();
  const coupleId = user?.coupleId || 'mock-couple-123';
  const authorId = user?.uid || 'dev-user-uid';

  const [activeLayout, setActiveLayout] = useState<LayoutMode>('square');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isPhoneOpen, setIsPhoneOpen] = useState(false);
  const [isViewDropdownOpen, setIsViewDropdownOpen] = useState(false);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [pendingUploads, setPendingUploads] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Live stream of the couple's photos (shared with the partner)
  useEffect(() => galleryService.subscribe(coupleId, setGalleryItems), [coupleId]);

  const savePhotos = useCallback(
    async (photos: NewGalleryItem[]) => {
      setUploadError(null);
      setPendingUploads((n) => n + photos.length);
      for (const photo of photos) {
        try {
          await galleryService.add(photo, { coupleId, authorId });
        } catch (err) {
          console.error('Photo save failed:', err);
          setUploadError(err instanceof Error ? err.message : 'Could not save a photo.');
        } finally {
          setPendingUploads((n) => n - 1);
        }
      }
    },
    [coupleId, authorId]
  );

  const handleUpload = async (data: { files: File[]; caption: string; date: string; album: string }) => {
    const base = Date.now();
    const photos: NewGalleryItem[] = [];
    for (let i = 0; i < data.files.length; i++) {
      photos.push({
        photoUrl: await shrinkImageFile(data.files[i]),
        caption: data.caption || 'Captured moment ✨',
        date: data.date,
        album: data.album,
        createdAt: base + i,
      });
    }
    await savePhotos(photos);
  };

  // Photos sent from a phone via the QR code
  const handlePhonePhotos = useCallback(
    (photos: IncomingPhoto[]) => {
      const today = new Date().toISOString().split('T')[0];
      const base = Date.now();
      void savePhotos(
        photos.map((p, i) => ({
          photoUrl: p.dataUrl,
          caption: p.caption || 'Captured moment ✨',
          date: today,
          album: 'From phone 📱',
          createdAt: base + i,
        }))
      );
    },
    [savePhotos]
  );

  const handleDelete = (id: string) => {
    void galleryService.remove(id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.5 }}
      className="space-y-8 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8"
    >
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-primary/10 pb-6 relative z-30">
        <div>
          <h1 className="text-3xl font-bold font-serif text-on-surface flex items-center gap-2">
            Shared Gallery <ImageIcon className="text-primary w-6 h-6 animate-pulse" />
          </h1>
          <p className="text-on-surface-variant mt-1">A private media vault to capture and preserve your special moments.</p>
        </div>

        {/* Header Action Controls */}
        <div className="flex items-center gap-3">
          {/* View Selection Dropdown Trigger */}
          <div className="relative">
            <button
              onClick={() => setIsViewDropdownOpen(prev => !prev)}
              className="flex items-center gap-2 bg-surface-container border border-primary/10 hover:border-primary/30 text-on-surface-variant hover:text-on-surface rounded-full px-4.5 py-2.5 text-xs font-semibold tracking-wider uppercase font-mono transition-all cursor-pointer shadow-lg"
            >
              <Eye className="w-3.5 h-3.5 text-primary" />
              View: {activeLayout}
            </button>

            <AnimatePresence>
              {isViewDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsViewDropdownOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-48 bg-surface-container border border-primary/20 rounded-2xl shadow-2xl z-20 overflow-hidden font-mono text-xs"
                  >
                    <div className="p-1.5 flex flex-col gap-1">
                      {([
                        { mode: 'square', label: 'Square Grid' },
                        { mode: 'masonry', label: 'Masonry Grid' },
                        { mode: 'polaroid', label: 'Polaroid View' },
                        { mode: 'bounce', label: 'Bounce Cards' }
                      ] as const).map(({ mode, label }) => (
                        <button
                          key={mode}
                          onClick={() => {
                            setActiveLayout(mode);
                            setIsViewDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3.5 py-2 rounded-xl transition-all cursor-pointer font-bold ${
                            activeLayout === mode
                              ? 'bg-primary/10 text-primary  border border-primary/20'
                              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/40 border border-transparent'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Upload from phone (QR) */}
          <button
            onClick={() => setIsPhoneOpen(true)}
            className="flex items-center gap-2 bg-surface-container border border-primary/10 hover:border-primary/30 text-on-surface-variant hover:text-on-surface rounded-full px-4.5 py-2.5 text-xs font-semibold tracking-wider uppercase font-mono transition-all cursor-pointer shadow-lg"
          >
            <Smartphone className="w-3.5 h-3.5 text-primary" />
            Use phone
          </button>

          {/* Add Photo Button */}
          <button
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center gap-2 bg-primary hover:brightness-105 text-on-primary rounded-full px-5 py-2.5 text-xs font-semibold tracking-wider uppercase font-mono transition-all cursor-pointer shadow-lg shadow-primary/20 border border-primary/20"
          >
            <Upload className="w-3.5 h-3.5" />
            + Add Photo
          </button>
        </div>
      </header>

      {pendingUploads > 0 && (
        <p className="text-xs font-mono text-on-surface-variant" role="status">
          Saving {pendingUploads} photo{pendingUploads === 1 ? '' : 's'}…
        </p>
      )}
      {uploadError && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl p-4 text-xs font-medium" role="alert">
          {uploadError}
        </div>
      )}

      {/* Main Content Area */}
      <div className="relative min-h-[400px]">
        {galleryItems.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center text-center p-12 rounded-2xl bg-surface-container border border-primary/10 min-h-[350px] shadow-xl">
            <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center mb-6 border border-primary/10 shadow-[0_0_15px_rgba(255,42,133,0.05)]">
              <ImageIcon className="w-8 h-8 text-primary/60" />
            </div>
            <h3 className="text-lg font-bold text-on-surface mb-2">No memories added yet</h3>
            <p className="text-sm text-on-surface-variant max-w-sm leading-relaxed">
              Upload your first photo to start building your shared private scrapbook together.
            </p>
          </div>
        ) : (
          /* Gallery Layout Containers */
          <AnimatePresence mode="wait">
            {activeLayout === 'square' && (
              <motion.div
                key="square"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
              >
                {galleryItems.map(item => (
                  <div
                    key={item.id}
                    className="relative group aspect-square rounded-2xl overflow-hidden bg-surface-container border border-primary/10 shadow-lg"
                  >
                    <img src={item.photoUrl} alt={item.caption} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    {/* Hover caption overlay */}
                    <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-4 z-10 text-left">
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="self-end p-1.5 rounded-full bg-red-950/40 hover:bg-red-900 text-red-400 transition-colors border border-red-500/20 cursor-pointer"
                        title="Delete Image"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <div>
                        <p className="text-xs font-medium text-on-surface line-clamp-2 mb-1.5">{item.caption}</p>
                        <div className="flex items-center gap-3 text-[9px] text-on-surface-variant font-mono">
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-primary/60" />{item.date}</span>
                          <span className="flex items-center gap-1"><Folder className="w-3 h-3 text-primary/60" />{item.album}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {activeLayout === 'masonry' && (
              <motion.div
                key="masonry"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4"
              >
                {galleryItems.map(item => (
                  <div
                    key={item.id}
                    className="break-inside-avoid relative group rounded-2xl overflow-hidden bg-surface-container border border-primary/10 shadow-lg flex flex-col"
                  >
                    <img src={item.photoUrl} alt={item.caption} className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-102" />
                    <div className="p-4 bg-surface-container-high/40 border-t border-primary/10 flex flex-col gap-2 text-left">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold text-on-surface leading-relaxed">{item.caption}</p>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1 rounded-full text-on-surface-variant hover:text-red-400 transition-colors cursor-pointer"
                          title="Delete Image"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center gap-3 text-[9px] text-on-surface-variant font-mono">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-primary/60" />{item.date}</span>
                        <span className="flex items-center gap-1"><Folder className="w-3 h-3 text-primary/60" />{item.album}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {activeLayout === 'polaroid' && (
              <motion.div
                key="polaroid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
              >
                {galleryItems.map((item, index) => {
                  // Generate a slight random rotation for polaroid effect
                  const rot = (index % 3 === 0 ? -1.5 : index % 3 === 1 ? 1.5 : 0.5);
                  return (
                    <div
                      key={item.id}
                      className="relative rounded-lg p-3 bg-[#F5F0E8] shadow-2xl border border-black/10 group flex flex-col transition-all hover:scale-102 hover:z-10"
                      style={{ transform: `rotate(${rot}deg)` }}
                    >
                      <div className="aspect-[4/3] rounded overflow-hidden bg-surface-container relative">
                        <img src={item.photoUrl} alt={item.caption} className="w-full h-full object-cover" />
                        {/* Polaroid Hover Actions */}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-1.5 rounded-full bg-black/60 hover:bg-black/90 text-red-400 transition-colors border border-red-500/20 cursor-pointer shadow-lg"
                            title="Delete Image"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="pt-4 pb-2 px-1 text-left">
                        <p className="font-serif italic text-sm text-[#2a2a2a] leading-tight mb-2 font-bold truncate" style={{ fontFamily: 'Georgia, serif' }}>
                          {item.caption}
                        </p>
                        <div className="flex items-center justify-between text-[10px] text-on-surface-variant font-mono">
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{item.date}</span>
                          <span className="flex items-center gap-1"><Folder className="w-3 h-3" />{item.album}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            )}

            {activeLayout === 'bounce' && (
              <motion.div
                key="bounce"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="py-12 flex items-center justify-center overflow-hidden"
              >
                <BounceCards
                  images={galleryItems.slice(0, 5).map(item => item.photoUrl)}
                  onCardClick={(idx) => {
                    const item = galleryItems[idx];
                    if (item) {
                      alert(`"${item.caption}" - ${item.date}`);
                    }
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Phone upload (QR code) */}
      <PhoneUploadModal isOpen={isPhoneOpen} onClose={() => setIsPhoneOpen(false)} onPhotos={handlePhonePhotos} />

      {/* Upload Photo Modal */}
      <UploadPhotoModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUpload={handleUpload}
      />
    </motion.div>
  );
};

export default Gallery;
