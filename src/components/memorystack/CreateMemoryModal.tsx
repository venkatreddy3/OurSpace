import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Mic, Calendar, MapPin, FileAudio, Image, Check } from 'lucide-react';
import type { CreateMemoryDto, MoodTag } from '../../types/memory.js';
import { MOOD_META } from '../../types/memory.js';
import { isFirebaseMocked } from '../../services/firebase.js';
import { uploadImage } from '../../services/cloudinary.service.js';
import { shrinkImageFile } from '../../services/gallery.service.js';

// ─── Types ────────────────────────────────────────────────────────────────────
interface CreateMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateMemoryDto) => Promise<void>;
  coupleId: string;
  authorId: string;
}

const MOODS: MoodTag[] = ['Loved', 'Excited', 'Cozy', 'Nostalgic', 'Funny'];

// ─── Image Dropzone ───────────────────────────────────────────────────────────
interface ImageDropzoneProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
}

const ImageDropzone: React.FC<ImageDropzoneProps> = ({ files, onFilesChange }) => {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;
    const imageFiles = Array.from(newFiles).filter((f) => f.type.startsWith('image/'));
    onFilesChange([...files, ...imageFiles].slice(0, 8)); // Max 8 images
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(e.dataTransfer.files);
  };

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className="cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center gap-2 py-6"
        style={{
          borderColor: isDragging ? 'var(--primary)' : 'var(--border-gray)',
          background: isDragging ? 'color-mix(in srgb, var(--primary) 8%, transparent)' : 'var(--bg-surface-container-low)',
          boxShadow: isDragging ? '0 0 20px color-mix(in srgb, var(--primary) 15%, transparent)' : 'none',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => processFiles(e.target.files)}
        />
        <Image className="w-6 h-6" style={{ color: isDragging ? 'var(--primary)' : 'var(--on-surface-variant)' }} />
        <p className="text-xs text-center" style={{ color: isDragging ? 'var(--primary)' : 'var(--on-surface)' }}>
          {isDragging ? 'Drop to add photos' : 'Drop photos here or click to upload'}
        </p>
        <p className="text-[10px]" style={{ color: 'var(--on-surface-variant)' }}>
          Supports JPG, PNG, GIF · Up to 8 images
        </p>
      </div>

      {/* Preview grid */}
      {files.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {files.map((file, i) => (
            <div key={i} className="relative group aspect-square rounded-xl overflow-hidden">
              <img
                src={URL.createObjectURL(file)}
                alt={`preview-${i}`}
                className="w-full h-full object-cover"
              />
              <button
                onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: 'rgba(0,0,0,0.7)' }}
              >
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Audio Upload ─────────────────────────────────────────────────────────────
interface AudioUploadProps {
  audioFile: File | null;
  onFileChange: (file: File | null) => void;
}

const AudioUpload: React.FC<AudioUploadProps> = ({ audioFile, onFileChange }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => onFileChange(e.target.files?.[0] || null)}
      />
      {!audioFile ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed transition-all"
          style={{ borderColor: 'var(--border-gray)', background: 'var(--bg-surface-container-low)', color: 'var(--on-surface)' }}
        >
          <FileAudio className="w-4 h-4 flex-shrink-0" />
          <span className="text-xs">Upload audio file (voice note / soundtrack)</span>
        </button>
      ) : (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{ background: 'color-mix(in srgb, var(--primary) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--primary) 25%, transparent)' }}
        >
          <Mic className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--primary)' }} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate" style={{ color: 'var(--primary)' }}>{audioFile.name}</p>
            <p className="text-[10px]" style={{ color: 'var(--on-surface-variant)' }}>
              {(audioFile.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
          <button
            type="button"
            onClick={() => onFileChange(null)}
            className="p-1 rounded-full hover:opacity-70 transition-opacity"
            style={{ color: 'var(--on-surface)' }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {/* Voice recorder placeholder */}
      <div
        className="mt-2 flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed"
        style={{ borderColor: 'var(--border-gray)', background: 'var(--bg-surface-container-low)' }}
      >
        <Mic className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--on-surface-variant)' }} />
        <span className="text-[10px]" style={{ color: 'var(--on-surface-variant)' }}>
          Live voice recorder — coming soon 🎤
        </span>
      </div>
    </div>
  );
};

// ─── Form Field Wrapper ───────────────────────────────────────────────────────
const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="space-y-1.5">
    <label className="block text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--on-surface)' }}>
      {label}
    </label>
    {children}
  </div>
);

// ─── Input Styles ─────────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg-surface-container-low)',
  border: '1px solid var(--border-gray)',
  borderRadius: 12,
  padding: '10px 14px',
  color: 'var(--on-surface)',
  fontSize: 13,
  outline: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s',
};

// ─── Main Modal ───────────────────────────────────────────────────────────────
const CreateMemoryModal: React.FC<CreateMemoryModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  coupleId,
  authorId,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [location, setLocation] = useState('');
  const [moodTag, setMoodTag] = useState<MoodTag>('Loved');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDate(new Date().toISOString().split('T')[0]);
    setLocation('');
    setMoodTag('Loved');
    setImageFiles([]);
    setAudioFile(null);
    setSuccess(false);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const readFileAsDataURL = (file: File): Promise<string> =>
    new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result as string);
      reader.onerror = rej;
      reader.readAsDataURL(file);
    });

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!title.trim() || isSubmitting) return;
      setIsSubmitting(true);

      // Mock mode keeps photos as data URLs; real mode uploads them to Cloudinary and stores the URL
      const isMock = isFirebaseMocked || import.meta.env.VITE_ENABLE_MOCK_AUTH === 'true';
      const photoUrls: string[] = [];
      try {
        for (const file of imageFiles) {
          photoUrls.push(isMock ? await readFileAsDataURL(file) : await uploadImage(await shrinkImageFile(file)));
        }
      } catch (err) {
        console.error('Photo upload failed:', err);
        setIsSubmitting(false);
        return;
      }

      let audioUrl: string | undefined;
      if (audioFile) {
        audioUrl = await readFileAsDataURL(audioFile);
      }

      const dto: CreateMemoryDto = {
        coupleId,
        authorId,
        title: title.trim(),
        description: description.trim(),
        date,
        location: location.trim(),
        moodTag,
        photoUrls,
        audioUrl,
      };

      try {
        await onSubmit(dto);
        setSuccess(true);
        setTimeout(() => {
          handleClose();
        }, 1200);
      } catch (err) {
        console.error('Failed to create memory:', err);
        setIsSubmitting(false);
      }
    },
    [title, description, date, location, moodTag, imageFiles, audioFile, coupleId, authorId, onSubmit, isSubmitting]
  );

  const getFocusStyle = (name: string): React.CSSProperties => ({
    ...inputStyle,
    borderColor: focusedField === name ? 'var(--primary)' : 'var(--border-gray)',
    boxShadow: focusedField === name ? '0 0 0 3px color-mix(in srgb, var(--primary) 8%, transparent)' : 'none',
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(0,0,0,0.6)' }}
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, y: 60, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 60, scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="relative w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden rounded-3xl pointer-events-auto"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-gray)',
                boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
              }}
            >
              {/* Header */}
              <div
                className="shrink-0 z-10 flex items-center justify-between px-6 py-5 border-b"
                style={{
                  background: 'var(--bg-surface)',
                  borderColor: 'var(--border-gray)',
                }}
              >
                <div>
                  <h2 className="font-display text-2xl leading-tight" style={{ color: 'var(--on-surface)' }}>
                    Capture a Memory
                  </h2>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--on-surface-variant)' }}>
                    Add to your shared memory vault
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:opacity-70"
                  style={{ background: 'var(--bg-surface-container-high)', color: 'var(--on-surface)' }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Success overlay */}
              <AnimatePresence>
                {success && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 rounded-3xl"
                    style={{ background: 'var(--bg-surface)' }}
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      className="w-16 h-16 rounded-full flex items-center justify-center"
                      style={{ background: 'color-mix(in srgb, var(--primary) 20%, transparent)', border: '2px solid #FF2A85', boxShadow: '0 0 30px color-mix(in srgb, var(--primary) 40%, transparent)' }}
                    >
                      <Check className="w-7 h-7" style={{ color: 'var(--primary)' }} />
                    </motion.div>
                    <p className="text-sm font-bold" style={{ color: 'var(--on-surface)' }}>Memory saved! ❤️</p>
                    <p className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>Added to your vault</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Form */}
              <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              {/* Scrollable body (data-lenis-prevent lets the mouse wheel scroll it despite smooth-scroll) */}
              <div data-lenis-prevent className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-6 space-y-5" style={{ scrollbarWidth: 'thin' }}>
                {/* Title */}
                <Field label="Memory Title">
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onFocus={() => setFocusedField('title')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Give this memory a name…"
                    style={getFocusStyle('title')}
                    required
                  />
                </Field>

                {/* Description */}
                <Field label="Intimate Description">
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onFocus={() => setFocusedField('desc')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Tell the story behind this moment…"
                    rows={4}
                    style={{
                      ...getFocusStyle('desc'),
                      resize: 'none',
                      lineHeight: 1.6,
                    }}
                  />
                </Field>

                {/* Date & Location */}
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Date">
                    <div className="relative">
                      <Calendar
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
                        style={{ color: 'var(--on-surface-variant)' }}
                      />
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        onFocus={() => setFocusedField('date')}
                        onBlur={() => setFocusedField(null)}
                        style={{ ...getFocusStyle('date'), paddingLeft: 32, colorScheme: 'light dark' }}
                        required
                      />
                    </div>
                  </Field>
                  <Field label="Location">
                    <div className="relative">
                      <MapPin
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
                        style={{ color: 'var(--on-surface-variant)' }}
                      />
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        onFocus={() => setFocusedField('loc')}
                        onBlur={() => setFocusedField(null)}
                        placeholder="Where were you?"
                        style={{ ...getFocusStyle('loc'), paddingLeft: 32 }}
                      />
                    </div>
                  </Field>
                </div>

                {/* Mood Selector */}
                <Field label="How did it feel?">
                  <div className="grid grid-cols-5 gap-2">
                    {MOODS.map((mood) => {
                      const meta = MOOD_META[mood];
                      const isSelected = moodTag === mood;
                      return (
                        <button
                          key={mood}
                          type="button"
                          onClick={() => setMoodTag(mood)}
                          className="flex flex-col items-center gap-1 py-2 px-1 rounded-xl border transition-all"
                          style={{
                            borderColor: isSelected ? meta.color : 'var(--border-gray)',
                            background: isSelected ? meta.bg : 'var(--bg-surface-container-low)',
                            boxShadow: isSelected ? `0 0 12px ${meta.color}40` : 'none',
                          }}
                        >
                          <span style={{ fontSize: 20 }}>{meta.emoji}</span>
                          <span
                            className="text-[9px] font-bold tracking-wide"
                            style={{ color: isSelected ? meta.color : 'var(--on-surface)' }}
                          >
                            {meta.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </Field>

                {/* Photos */}
                <Field label="Photos">
                  <ImageDropzone files={imageFiles} onFilesChange={setImageFiles} />
                </Field>

                {/* Audio */}
                <Field label="Voice Note / Audio">
                  <AudioUpload audioFile={audioFile} onFileChange={setAudioFile} />
                </Field>

              </div>

              {/* Pinned footer so Save is always reachable */}
              <div
                className="shrink-0 px-6 py-4 border-t"
                style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-gray)' }}
              >
                <motion.button
                  type="submit"
                  disabled={!title.trim() || isSubmitting}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3.5 rounded-xl font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2"
                  style={{
                    background: !title.trim() || isSubmitting
                      ? 'var(--bg-surface-container-highest)'
                      : 'linear-gradient(135deg, var(--primary) 0%, color-mix(in srgb, var(--primary) 70%, white) 100%)',
                    color: !title.trim() || isSubmitting ? 'var(--on-surface-variant)' : 'var(--on-primary)',
                    boxShadow: !title.trim() || isSubmitting ? 'none' : '0 8px 24px color-mix(in srgb, var(--primary) 35%, transparent)',
                    cursor: !title.trim() || isSubmitting ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Saving memory…
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Save to Vault
                    </>
                  )}
                </motion.button>
              </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CreateMemoryModal;
