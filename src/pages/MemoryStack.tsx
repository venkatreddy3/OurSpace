import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Filter, ChevronDown, X, Sparkles } from 'lucide-react';
import { useAuthStore } from '../store/authStore.js';
import { memoryService } from '../services/memory.service.js';
import { MOOD_META, type Memory, type MoodTag, type CreateMemoryDto, type Milestone } from '../types/memory.js';
import InfiniteOrbitDeck from '../components/memorystack/InfiniteOrbitDeck.js';
import VerticalTimeline from '../components/memorystack/VerticalTimeline.js';
import CreateMemoryModal from '../components/memorystack/CreateMemoryModal.js';

// ─── Filter State ─────────────────────────────────────────────────────────────
interface FilterState {
  moodTag: MoodTag | null;
  year: number | null;
}

// ─── Filter Dropdown ──────────────────────────────────────────────────────────
interface FilterDropdownProps {
  filters: FilterState;
  onChange: (f: FilterState) => void;
  availableYears: number[];
}

const FilterDropdown: React.FC<FilterDropdownProps> = ({ filters, onChange, availableYears }) => {
  const [open, setOpen] = useState(false);
  const activeCount = (filters.moodTag ? 1 : 0) + (filters.year ? 1 : 0);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-all cursor-pointer border ${
          activeCount > 0
            ? 'bg-primary-container text-on-primary-container border-primary/35'
            : 'bg-surface-container border-primary/10 text-on-surface-variant hover:text-on-surface hover:border-primary/20'
        }`}
      >
        <Filter className="w-3.5 h-3.5" />
        Filter
        {activeCount > 0 && (
          <span className="w-4 h-4 rounded-full bg-primary text-on-primary dark:bg-white dark:text-black flex items-center justify-center text-[9px] font-bold">
            {activeCount}
          </span>
        )}
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.16 }}
            className="absolute right-0 top-full mt-2 z-30 rounded-2xl overflow-hidden bg-surface-container border border-primary/10 shadow-2xl"
            style={{ width: 220 }}
          >
            <div className="p-4 space-y-4">
              {/* Mood filter */}
              <div>
                <p className="text-[10px] font-bold tracking-widest uppercase mb-2 text-on-surface-variant font-sans">
                  Mood
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(MOOD_META) as MoodTag[]).map((mood) => {
                    const meta = MOOD_META[mood];
                    const isActive = filters.moodTag === mood;
                    return (
                      <button
                        key={mood}
                        onClick={() => onChange({ ...filters, moodTag: isActive ? null : mood })}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer border ${
                          isActive
                            ? 'bg-primary/20 border-primary text-primary font-bold shadow-sm'
                            : 'bg-surface-container-high border-primary/5 text-on-surface-variant hover:text-on-surface'
                        }`}
                      >
                        {meta.emoji} {meta.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Year filter */}
              {availableYears.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold tracking-widest uppercase mb-2 text-on-surface-variant font-sans">
                    Year
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {availableYears.map((yr) => {
                      const isActive = filters.year === yr;
                      return (
                        <button
                          key={yr}
                          onClick={() => onChange({ ...filters, year: isActive ? null : yr })}
                          className={`px-3 py-1 rounded-full text-[10px] font-bold font-mono transition-all cursor-pointer border ${
                            isActive
                              ? 'bg-primary/20 border-primary text-primary font-bold shadow-sm'
                              : 'bg-surface-container-high border-primary/5 text-on-surface-variant hover:text-on-surface'
                          }`}
                        >
                          {yr}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Clear */}
              {(filters.moodTag || filters.year) && (
                <button
                  onClick={() => { onChange({ moodTag: null, year: null }); setOpen(false); }}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-medium transition-all bg-surface-container-high border border-primary/10 hover:bg-surface-container text-on-surface-variant hover:text-on-surface cursor-pointer"
                >
                  <X className="w-3 h-3" /> Clear filters
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {open && <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />}
    </div>
  );
};

// ─── MemoryStack Page ─────────────────────────────────────────────────────────
/**
 * MemoryStack Page
 * ─────────────────────────────────────────────────────────────────────────────
 * Renders directly to the top-bar controls and dual-view toggle.
 * No envelope or letter card — navigates straight into the memory vault.
 */
const MemoryStack: React.FC = () => {
  const { user } = useAuthStore();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({ moodTag: null, year: null });

  const coupleId = user?.coupleId || 'mock-couple-123';
  const authorId = user?.uid || 'dev-user-uid';

  const availableYears = Array.from(
    new Set(memories.map((m) => new Date(m.date).getFullYear()))
  ).sort((a, b) => b - a);

  const filteredMemories = memories.filter((m) => {
    if (filters.moodTag && m.moodTag !== filters.moodTag) return false;
    if (filters.year && new Date(m.date).getFullYear() !== filters.year) return false;
    return true;
  });

  // Timeline mirrors the memories live (oldest → newest)
  const milestones: Milestone[] = [...filteredMemories]
    .sort(
      (a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime() ||
        // same date: oldest upload first, latest upload last
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
    .map((m) => {
      const imageUrls = (m.photoUrls || []).slice(0, 2);
      return {
        id: m.id,
        dateLabel: new Date(m.date)
          .toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
          .toUpperCase(),
        isoDate: m.date,
        title: m.title,
        caption: m.description,
        imageUrls,
        layout: imageUrls.length >= 2 ? 'grid' : imageUrls.length === 1 ? 'single' : 'none',
      };
    });

  useEffect(() => {
    const unsubscribe = memoryService.subscribeMemories(coupleId, setMemories);
    return unsubscribe;
  }, [coupleId]);
  const handleCreateMemory = useCallback(async (dto: CreateMemoryDto) => {
    await memoryService.createMemory(dto);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-screen bg-background text-on-background transition-colors duration-300"
    >
      <div className="mx-auto px-5 sm:px-8" style={{ maxWidth: 760, paddingTop: 56, paddingBottom: 120 }}>

        {/* ── Page Header ─────────────────────────────────────────────────── */}
        <header style={{ marginBottom: 48 }}>
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <h1 className="font-serif text-3xl sm:text-4xl font-bold text-on-surface leading-tight mb-1.5">
                MemoryStack
              </h1>
              <p className="font-sans text-xs text-on-surface-variant opacity-80 letter-spacing-[0.01em]">
                A shared vault of every moment between you two.
              </p>
            </div>

            {/* Add Memory CTA */}
            <motion.button
              onClick={() => setIsModalOpen(true)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 flex-shrink-0 px-5 py-2.5 rounded-full bg-primary hover:bg-primary-container text-white dark:bg-primary-container dark:text-on-primary-container font-sans text-xs font-semibold tracking-wider uppercase font-mono shadow-md hover:bg-primary/95 transition-all cursor-pointer border-none outline-none"
            >
              <Plus className="w-4 h-4" />
              Add Memory
            </motion.button>
          </div>

          {/* ── Controls row ─────────────────────────────────────────────── */}
          <div className="flex items-center justify-between gap-3 mt-6">
            <span className="text-[11px] font-mono uppercase tracking-widest text-on-surface-variant/70">Orbit · Journey</span>
            <div className="flex items-center gap-2">
              {/* Memory count badge */}
              {memories.length > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-mono bg-surface-container border border-primary/10 text-on-surface-variant">
                  <Sparkles className="w-3 h-3" />
                  {memories.length} memories
                </div>
              )}
              <FilterDropdown
                filters={filters}
                onChange={setFilters}
                availableYears={availableYears}
              />
            </div>
          </div>

          {/* ── Active filter pills ──────────────────────────────────────── */}
          {(filters.moodTag || filters.year) && (
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span className="text-[11px] text-on-surface-variant opacity-60 font-sans">
                Showing:
              </span>
              {filters.moodTag && (
                <button
                  onClick={() => setFilters((f) => ({ ...f, moodTag: null }))}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-surface-container border border-primary/20 text-on-surface-variant hover:text-on-surface hover:border-primary/40 cursor-pointer"
                >
                  {MOOD_META[filters.moodTag].emoji} {filters.moodTag}
                  <X className="w-2.5 h-2.5 ml-0.5" />
                </button>
              )}
              {filters.year && (
                <button
                  onClick={() => setFilters((f) => ({ ...f, year: null }))}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-surface-container border border-primary/20 text-on-surface-variant hover:text-on-surface hover:border-primary/40 cursor-pointer"
                >
                  {filters.year}
                  <X className="w-2.5 h-2.5 ml-0.5" />
                </button>
              )}
              <span className="text-[11px] text-on-surface-variant opacity-50">
                {filteredMemories.length} result{filteredMemories.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </header>

        {/* ── Orbit, then the journey timeline below ───────────────────────── */}
        <div className="w-full flex justify-center overflow-visible">
          <InfiniteOrbitDeck memories={filteredMemories} />
        </div>

        <section className="mt-24">
          <VerticalTimeline milestones={milestones} anchorId="journey-start" />
        </section>
      </div>

      {/* ── Create Memory Modal ─────────────────────────────────────────── */}
      <CreateMemoryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateMemory}
        coupleId={coupleId}
        authorId={authorId}
      />
    </motion.div>
  );
};

export default MemoryStack;
