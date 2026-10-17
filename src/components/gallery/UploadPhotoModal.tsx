import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Calendar, Folder, MessageSquare } from 'lucide-react';

interface UploadPhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (data: {
    files: File[];
    caption: string;
    date: string;
    album: string;
  }) => void;
}

const ALBUMS = ['General', 'Summer Trip 🏖️', 'Our Kitchen Disasters 🍳', 'Pets & Cute Moments 🐾'];

const UploadPhotoModal: React.FC<UploadPhotoModalProps> = ({ isOpen, onClose, onUpload }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [caption, setCaption] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [album, setAlbum] = useState('General');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      const selectedFiles = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
      setFiles(prev => [...prev, ...selectedFiles]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
      setFiles(prev => [...prev, ...selectedFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) return;
    onUpload({ files, caption, date, album });
    handleClose();
  };

  const handleClose = () => {
    setFiles([]);
    setCaption('');
    setDate(new Date().toISOString().split('T')[0]);
    setAlbum('General');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 cursor-default"
            onClick={handleClose}
          />

          {/* Modal content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="fixed inset-x-4 top-10 bottom-10 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 w-full max-w-lg bg-surface border border-primary/20 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden max-h-[90vh] transition-colors duration-300"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-primary/10">
              <h3 className="text-sm font-bold tracking-wider uppercase font-mono text-on-surface flex items-center gap-2">
                <Upload className="w-4 h-4 text-primary" />
                Add Photos to Gallery
              </h3>
              <button
                onClick={handleClose}
                className="p-1 rounded-full text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable form body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Dropzone */}
              <div>
                <label className="block text-[10px] font-bold tracking-widest uppercase font-mono text-on-surface-variant mb-1.5">
                  Photos
                </label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                    isDragging
                      ? 'border-primary bg-primary/5'
                      : 'border-primary/10 hover:border-primary/35 bg-surface-container-low/50'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <Upload className={`w-8 h-8 mx-auto mb-3 transition-colors ${isDragging ? 'text-primary' : 'text-on-surface-variant/70'}`} />
                  <p className="text-xs text-on-surface font-medium">
                    Drag and drop photos here, or click to browse
                  </p>
                  <p className="text-[10px] text-on-surface-variant opacity-80 mt-1 font-mono">
                    Supports JPG, PNG, WEBP, GIF
                  </p>
                </div>
              </div>

              {/* Preview Selected Files */}
              {files.length > 0 && (
                <div className="grid grid-cols-4 gap-2 border border-primary/10 p-3 rounded-xl bg-surface-container-low max-h-36 overflow-y-auto">
                  {files.map((file, i) => (
                    <div key={i} className="relative group aspect-square rounded-lg overflow-hidden bg-surface-container-high border border-primary/10">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`upload-preview-${i}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-red-500 transition-opacity rounded-lg cursor-pointer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Caption */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold tracking-widest uppercase font-mono text-on-surface-variant flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-primary/65" />
                  Caption
                </label>
                <textarea
                  value={caption}
                  onChange={e => setCaption(e.target.value)}
                  placeholder="Caption this memory..."
                  rows={2}
                  className="w-full bg-surface-container border border-primary/10 focus:border-primary/45 rounded-xl px-3.5 py-2.5 text-xs text-on-surface placeholder-on-surface-variant/40 outline-none transition-all resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Date */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold tracking-widest uppercase font-mono text-on-surface-variant flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-primary/65" />
                    Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full bg-surface-container border border-primary/10 focus:border-primary/45 rounded-xl px-3.5 py-2.5 text-xs text-on-surface outline-none transition-all"
                    required
                  />
                </div>

                {/* Album */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold tracking-widest uppercase font-mono text-on-surface-variant flex items-center gap-1.5">
                    <Folder className="w-3.5 h-3.5 text-primary/65" />
                    Album
                  </label>
                  <select
                    value={album}
                    onChange={e => setAlbum(e.target.value)}
                    className="w-full bg-surface-container border border-primary/10 focus:border-primary/45 rounded-xl px-3.5 py-2.5 text-xs text-on-surface outline-none transition-all cursor-pointer"
                  >
                    {ALBUMS.map(a => (
                      <option key={a} value={a} className="bg-surface-container text-on-surface">
                        {a}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 py-2.5 rounded-xl border border-primary/10 hover:bg-surface-container text-on-surface-variant font-bold text-xs tracking-wider transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={files.length === 0}
                  className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-primary/90 disabled:bg-primary/40 disabled:cursor-not-allowed text-white font-bold text-xs tracking-wider transition-colors cursor-pointer"
                >
                  Upload
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default UploadPhotoModal;
