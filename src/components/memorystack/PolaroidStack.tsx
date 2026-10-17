import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  motion,
  useMotionValue,
  useTransform,
  AnimatePresence,
  PanInfo,
} from 'framer-motion';
import { MapPin, Calendar, Heart, ChevronLeft, ChevronRight, Play, Pause, RotateCcw } from 'lucide-react';
import type { Memory } from '../../types/memory.js';
import { MOOD_META } from '../../types/memory.js';

// ─── Audio Wave Player ────────────────────────────────────────────────────────
interface AudioPlayerProps {
  audioUrl: string;
}

const AudioWavePlayer: React.FC<AudioPlayerProps> = ({ audioUrl }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onLoaded = () => setDuration(audio.duration);
    const onTimeUpdate = () => setProgress(audio.currentTime / (audio.duration || 1));
    const onEnded = () => { setIsPlaying(false); setProgress(0); };
    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
    };
  }, [audioUrl]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) { audio.pause(); setIsPlaying(false); }
    else { audio.play(); setIsPlaying(true); }
  };

  const handleScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    audio.currentTime = ratio * audio.duration;
    setProgress(ratio);
  };

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="mt-3 p-3 rounded-xl" style={{ background: 'rgba(255,42,133,0.08)', border: '1px solid rgba(255,42,133,0.2)' }}>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
          style={{ background: 'rgba(255,42,133,0.8)' }}
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5 text-white" /> : <Play className="w-3.5 h-3.5 text-white ml-0.5" />}
        </button>
        <div className="flex-1 flex flex-col gap-1">
          {/* Fake waveform bars */}
          <div
            className="h-7 flex items-center gap-[2px] cursor-pointer rounded overflow-hidden"
            onClick={handleScrub}
          >
            {Array.from({ length: 32 }).map((_, i) => {
              const barProgress = i / 32;
              const isActive = barProgress <= progress;
              const heights = [60, 80, 40, 100, 70, 55, 90, 45, 75, 60, 85, 35, 95, 65, 50, 80, 40, 70, 90, 55, 75, 60, 85, 45, 100, 65, 80, 50, 70, 90, 60, 75];
              return (
                <div
                  key={i}
                  className="rounded-full flex-1 transition-all duration-75"
                  style={{
                    height: `${heights[i] * 0.28}px`,
                    background: isActive ? '#FF2A85' : 'rgba(192,132,252,0.3)',
                  }}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] font-mono" style={{ color: 'rgba(192,132,252,0.7)' }}>
            <span>{fmt(progress * duration)}</span>
            <span>{fmt(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Single Polaroid Card ─────────────────────────────────────────────────────
interface PolaroidCardProps {
  memory: Memory;
  stackIndex: number; // 0 = top, 1 = second, 2 = third
  totalCount: number;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  isTop: boolean;
}

const PolaroidCard: React.FC<PolaroidCardProps> = ({
  memory,
  stackIndex,
  onSwipeLeft,
  onSwipeRight,
  isTop,
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-20, 0, 20]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);
  const mood = MOOD_META[memory.moodTag];

  // Background card visual depth
  const depthZ = stackIndex === 0 ? 0 : stackIndex === 1 ? -12 : -24;
  const depthScale = stackIndex === 0 ? 1 : stackIndex === 1 ? 0.94 : 0.88;
  const depthY = stackIndex === 0 ? 0 : stackIndex === 1 ? 16 : 30;

  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (!isTop) return;
      if (info.offset.x < -90) onSwipeLeft();
      else if (info.offset.x > 90) onSwipeRight();
    },
    [isTop, onSwipeLeft, onSwipeRight]
  );

  const handleFlip = () => {
    if (isTop) setIsFlipped((f) => !f);
  };

  return (
    <motion.div
      className="absolute"
      style={{
        width: 300,
        height: 380,
        zIndex: 10 - stackIndex,
        top: depthY,
        scale: depthScale,
        translateZ: depthZ,
        filter: stackIndex > 0 ? `brightness(${0.85 - stackIndex * 0.12})` : 'none',
      }}
      animate={{
        y: depthY,
        scale: depthScale,
        rotateZ: stackIndex === 1 ? -3 : stackIndex === 2 ? 5 : 0,
      }}
      transition={{ type: 'spring', stiffness: 260, damping: 28 }}
    >
      <motion.div
        drag={isTop ? 'x' : false}
        dragConstraints={{ left: -300, right: 300 }}
        dragElastic={0.15}
        onDragEnd={handleDragEnd}
        style={{ x, rotate, opacity: isTop ? opacity : 1 }}
        onClick={handleFlip}
        className="w-full h-full cursor-pointer select-none"
        whileHover={isTop ? { scale: 1.02, y: -4 } : {}}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        {/* 3D Flip Container */}
        <div
          style={{
            width: '100%',
            height: '100%',
            position: 'relative',
            transformStyle: 'preserve-3d',
            transition: 'transform 0.65s cubic-bezier(0.23, 1, 0.32, 1)',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          {/* ── FRONT FACE ── */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backfaceVisibility: 'hidden',
              borderRadius: 16,
              background: '#F5F0E8',
              boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06), inset 0 0 0 1px rgba(0,0,0,0.1)',
              padding: '12px 12px 0 12px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Photo area */}
            <div
              style={{
                flex: 1,
                borderRadius: 8,
                overflow: 'hidden',
                position: 'relative',
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
              }}
            >
              {memory.photoUrls[0] ? (
                <img
                  src={memory.photoUrls[0]}
                  alt={memory.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  draggable={false}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                  <span style={{ fontSize: 48 }}>{mood.emoji}</span>
                  <span
                    className="text-xs font-bold tracking-widest uppercase"
                    style={{ color: 'rgba(255,255,255,0.4)' }}
                  >
                    No Photo
                  </span>
                </div>
              )}

              {/* Mood badge overlay */}
              <div
                className="absolute top-2 right-2 px-2 py-1 rounded-full text-[10px] font-bold tracking-wide"
                style={{ background: mood.bg, color: mood.color, border: `1px solid ${mood.color}40` }}
              >
                {mood.emoji} {mood.label}
              </div>
            </div>

            {/* Polaroid bottom label */}
            <div
              style={{
                padding: '10px 6px 12px',
                textAlign: 'center',
              }}
            >
              <p
                className="font-bold text-sm truncate"
                style={{ color: '#2a2a2a', fontFamily: 'Georgia, serif' }}
              >
                {memory.title}
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: '#888' }}>
                {new Date(memory.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </p>
            </div>

            {/* Swipe hint */}
            {isTop && (
              <div
                className="absolute bottom-16 left-1/2 -translate-x-1/2 text-[9px] font-mono tracking-widest uppercase"
                style={{ color: 'rgba(0,0,0,0.3)' }}
              >
                tap to flip · swipe to skip
              </div>
            )}
          </div>

          {/* ── BACK FACE ── */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              borderRadius: 16,
              background: 'linear-gradient(145deg, #0d0d14 0%, #111118 100%)',
              border: '1px solid rgba(255,42,133,0.2)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.7), 0 0 40px rgba(255,42,133,0.1)',
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              overflowY: 'auto',
            }}
          >
            {/* Back header */}
            <div className="flex items-start justify-between gap-2">
              <h3
                className="text-sm font-bold leading-tight"
                style={{ color: '#F5F0E8', fontFamily: 'Georgia, serif' }}
              >
                {memory.title}
              </h3>
              <button
                onClick={(e) => { e.stopPropagation(); setIsFlipped(false); }}
                className="flex-shrink-0 p-1 rounded-full transition-opacity hover:opacity-70"
                style={{ color: 'rgba(192,132,252,0.6)' }}
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Description */}
            <p className="text-xs leading-relaxed" style={{ color: 'rgba(245,240,232,0.7)' }}>
              {memory.description}
            </p>

            {/* Meta */}
            <div className="flex flex-col gap-2 mt-auto">
              <div className="flex items-center gap-2 text-[11px]" style={{ color: 'rgba(192,132,252,0.8)' }}>
                <Calendar className="w-3 h-3 flex-shrink-0" />
                <span>{new Date(memory.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
              {memory.location && (
                <div className="flex items-center gap-2 text-[11px]" style={{ color: 'rgba(192,132,252,0.8)' }}>
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  <span>{memory.location}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-[11px]" style={{ color: mood.color }}>
                <Heart className="w-3 h-3 flex-shrink-0" />
                <span>{memory.likes.length} {memory.likes.length === 1 ? 'heart' : 'hearts'}</span>
              </div>
            </div>

            {/* Audio player */}
            {memory.audioUrl && <AudioWavePlayer audioUrl={memory.audioUrl} />}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Polaroid Stack Container ─────────────────────────────────────────────────
interface PolaroidStackProps {
  memories: Memory[];
}

const PolaroidStack: React.FC<PolaroidStackProps> = ({ memories }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [key, setKey] = useState(0);

  const visibleCards = memories.slice(currentIndex, currentIndex + 3);

  const goNext = useCallback(() => {
    if (currentIndex < memories.length - 1) {
      setCurrentIndex((i) => i + 1);
      setKey((k) => k + 1);
    }
  }, [currentIndex, memories.length]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      setKey((k) => k + 1);
    }
  }, [currentIndex]);

  const handleSwipeLeft = useCallback(() => {
    goNext();
  }, [goNext]);

  const handleSwipeRight = useCallback(() => {
    goNext();
  }, [goNext]);

  if (memories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <span className="text-5xl">📷</span>
        <p className="text-on-surface-variant text-sm">No memories yet. Create your first one!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-8 py-8">
      {/* Counter */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-mono" style={{ color: 'rgba(192,132,252,0.6)' }}>
          {currentIndex + 1} / {memories.length}
        </span>
        <div className="flex gap-1">
          {memories.slice(0, Math.min(memories.length, 8)).map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === currentIndex ? 16 : 4,
                height: 4,
                background: i === currentIndex ? '#FF2A85' : 'rgba(255,42,133,0.3)',
              }}
            />
          ))}
          {memories.length > 8 && (
            <span className="text-[10px] text-on-surface-variant ml-1">+{memories.length - 8}</span>
          )}
        </div>
      </div>

      {/* Stack Area */}
      <div
        className="relative flex items-center justify-center"
        style={{ width: 320, height: 420, perspective: 1000 }}
      >
        <AnimatePresence mode="popLayout">
          {visibleCards.map((memory, i) => (
            <motion.div
              key={`${memory.id}-${key}`}
              initial={i === 0 ? { x: 0, opacity: 1 } : undefined}
              exit={i === 0 ? { x: -350, rotate: -20, opacity: 0, transition: { duration: 0.35 } } : undefined}
            >
              <PolaroidCard
                memory={memory}
                stackIndex={i}
                totalCount={visibleCards.length}
                isTop={i === 0}
                onSwipeLeft={handleSwipeLeft}
                onSwipeRight={handleSwipeRight}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center gap-6">
        <button
          onClick={goPrev}
          disabled={currentIndex === 0}
          className="w-11 h-11 rounded-full flex items-center justify-center border transition-all disabled:opacity-30"
          style={{ border: '1px solid rgba(255,42,133,0.3)', background: 'rgba(255,42,133,0.05)', color: '#FF2A85' }}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="text-center">
          <p className="text-xs font-mono uppercase tracking-widest" style={{ color: 'rgba(192,132,252,0.5)' }}>
            swipe or tap arrows
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: 'rgba(192,132,252,0.3)' }}>
            tap card to flip
          </p>
        </div>

        <button
          onClick={goNext}
          disabled={currentIndex >= memories.length - 1}
          className="w-11 h-11 rounded-full flex items-center justify-center border transition-all disabled:opacity-30"
          style={{ border: '1px solid rgba(255,42,133,0.3)', background: 'rgba(255,42,133,0.05)', color: '#FF2A85' }}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>


    </div>
  );
};

export default PolaroidStack;
