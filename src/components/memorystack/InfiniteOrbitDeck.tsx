import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Calendar, MapPin, Heart, Play, Pause, ChevronLeft, ChevronRight } from 'lucide-react';
import OrbitImages from './OrbitImages.js';
import type { Memory } from '../../types/memory.js';
import { MOOD_META } from '../../types/memory.js';

interface InfiniteOrbitDeckProps {
  memories: Memory[];
  onSelectMemory?: (memory: Memory) => void;
}

export const InfiniteOrbitDeck: React.FC<InfiniteOrbitDeckProps> = ({
  memories,
  onSelectMemory,
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // Map memories or use configured fallback images
  const orbitItems = useMemo(() => {
    // Every uploaded photo joins the orbit
    return memories.flatMap((m) =>
      (m.photoUrls || []).map((src) => ({ src, alt: m.title, memory: m }))
    );
  }, [memories]);

  const activeItem = orbitItems[selectedIndex % orbitItems.length];
  const activeMemory = activeItem?.memory;
  const mood = activeMemory ? MOOD_META[activeMemory.moodTag] : null;

  const handleItemClick = (index: number) => {
    setSelectedIndex(index);
    const clickedItem = orbitItems[index % orbitItems.length];
    if (clickedItem?.memory && onSelectMemory) {
      onSelectMemory(clickedItem.memory);
    }
  };

  const handlePrev = () => {
    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : orbitItems.length - 1));
  };

  const handleNext = () => {
    setSelectedIndex((prev) => (prev + 1) % orbitItems.length);
  };

  if (orbitItems.length === 0) {
    return (
      <div className="w-full max-w-[540px] mx-auto text-center rounded-2xl border border-dashed border-primary/20 py-14 px-6">
        <Sparkles className="w-6 h-6 mx-auto mb-3 text-primary/70" />
        <p className="font-serif text-lg font-bold text-on-surface">No moments yet</p>
        <p className="text-xs text-on-surface-variant mt-1">
          Add a memory with a photo and it will start orbiting here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full select-none">
      {/* ── Orbit Controls Header ── */}
      <div className="w-full flex items-center justify-between px-2 mb-4">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-bold bg-primary/10 text-primary border border-primary/20">
            <Sparkles className="w-3.5 h-3.5" /> Infinite Orbit
          </span>
          <span className="text-xs text-on-surface-variant font-mono">
            {orbitItems.length} moments orbiting
          </span>
        </div>

        {/* Pause / Play Rotation button */}
        <button
          onClick={() => setIsPaused((p) => !p)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-medium transition-all cursor-pointer bg-surface-container border border-primary/15 text-on-surface hover:border-primary/40 hover:bg-surface-container-high"
          title={isPaused ? 'Resume Orbit' : 'Pause Orbit'}
        >
          {isPaused ? (
            <>
              <Play className="w-3.5 h-3.5 text-primary fill-primary" />
              <span>Resume</span>
            </>
          ) : (
            <>
              <Pause className="w-3.5 h-3.5 text-primary" />
              <span>Pause</span>
            </>
          )}
        </button>
      </div>

      {/* ── Main Orbit Canvas ── */}
      <div className="relative w-full max-w-[760px] py-6 sm:py-10 px-2 overflow-visible">
        <OrbitImages
          images={orbitItems.map((item) => ({ src: item.src, alt: item.alt }))}
          shape="ellipse"
          radiusX={340}
          radiusY={80}
          rotation={-8}
          duration={30}
          itemSize={90}
          depth={0.6}
          showPath={true}
          pathColor="rgba(255, 42, 133, 0.3)"
          pathWidth={2}
          paused={isPaused}
          onItemClick={handleItemClick}
          centerContent={
            <div
              className="flex flex-row items-center gap-2 select-none pointer-events-none text-primary leading-none"
              style={{ fontFamily: "'Dancing Script', cursive", fontWeight: 600, textShadow: '0 0 24px rgba(255, 42, 133, 0.25)' }}
            >
              <span style={{ fontSize: 34 }}>Moments</span>
              <span style={{ fontSize: 44 }} aria-label="Infinity">∞</span>
            </div>
          }
        />
      </div>

      {/* ── Drag & Navigation Instructions ── */}
      <p className="text-[11px] font-mono text-on-surface-variant/70 tracking-wider uppercase mt-4 mb-6 text-center">
        Drag orbit sideways to spin • Tap any photo to glide to front
      </p>

      {/* ── Selected Moment Showcase Card ── */}
      {activeMemory && (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeMemory.id || selectedIndex}
            initial={{ opacity: 0, y: 15, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="w-full max-w-[540px] rounded-2xl bg-surface-container border border-primary/20 p-5 shadow-xl shadow-primary/5 mt-2"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {mood && (
                    <span
                      className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide border"
                      style={{
                        background: mood.bg,
                        color: mood.color,
                        borderColor: `${mood.color}40`,
                      }}
                    >
                      {mood.emoji} {mood.label}
                    </span>
                  )}
                  <span className="text-[11px] font-mono text-on-surface-variant">
                    Moment #{selectedIndex + 1}
                  </span>
                </div>
                <h3 className="font-serif text-lg font-bold text-on-surface mt-1">
                  {activeMemory.title}
                </h3>
              </div>

              {/* Quick prev/next buttons */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={handlePrev}
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-surface-container-high border border-primary/15 text-on-surface hover:text-primary hover:border-primary/40 transition-all cursor-pointer"
                  title="Previous moment"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleNext}
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-surface-container-high border border-primary/15 text-on-surface hover:text-primary hover:border-primary/40 transition-all cursor-pointer"
                  title="Next moment"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Description */}
            <p className="text-xs text-on-surface-variant leading-relaxed mt-3">
              {activeMemory.description}
            </p>

            {/* Meta row */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 mt-3 border-t border-primary/10 text-[11px] text-on-surface-variant">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1 font-mono">
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  {new Date(activeMemory.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
                {activeMemory.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    {activeMemory.location}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-primary font-mono text-[11px]">
                <Heart className="w-3.5 h-3.5 fill-primary" />
                <span>
                  {activeMemory.likes?.length || 1} love
                </span>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
};

export default InfiniteOrbitDeck;
