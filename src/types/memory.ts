/**
 * Memory Core Data Model for MemoryStack Feature
 * Firestore Collection: `memories`
 */

export type MoodTag = 'Loved' | 'Excited' | 'Cozy' | 'Nostalgic' | 'Funny';

export const MOOD_META: Record<
  MoodTag,
  { emoji: string; label: string; color: string; bg: string }
> = {
  Loved: {
    emoji: '❤️',
    label: 'Loved',
    color: '#FF2A85',
    bg: 'rgba(255,42,133,0.15)',
  },
  Excited: {
    emoji: '✨',
    label: 'Excited',
    color: '#FACC15',
    bg: 'rgba(250,204,21,0.15)',
  },
  Cozy: {
    emoji: '☕',
    label: 'Cozy',
    color: '#FB923C',
    bg: 'rgba(251,146,60,0.15)',
  },
  Nostalgic: {
    emoji: '🌙',
    label: 'Nostalgic',
    color: '#C084FC',
    bg: 'rgba(192,132,252,0.15)',
  },
  Funny: {
    emoji: '😂',
    label: 'Funny',
    color: '#34D399',
    bg: 'rgba(52,211,153,0.15)',
  },
};

export interface Memory {
  id: string;
  coupleId: string;
  authorId: string;
  title: string;
  description: string;
  /** ISO date string e.g. "2025-09-01" */
  date: string;
  /** Text string location e.g. "Paris, France" */
  location: string;
  moodTag: MoodTag;
  photoUrls: string[];
  /** Optional URL to a voice note or audio track */
  audioUrl?: string;
  /** Array of user UIDs who liked this memory */
  likes: string[];
  createdAt: string;
}

/** DTO for creating a new memory (omits auto-generated fields) */
export type CreateMemoryDto = Omit<Memory, 'id' | 'createdAt' | 'likes'>;

// ─── Milestone — used by the elegant VerticalTimeline ────────────────────────

/**
 * Layout variant for a timeline milestone's photo presentation.
 * single  = one full-width image
 * grid    = two images side-by-side
 * none    = text / caption only
 */
export type MilestoneLayout = 'single' | 'grid' | 'none';

/** A single dated milestone entry displayed in the vertical timeline. */
export interface Milestone {
  id: string;
  /** Display date label e.g. "MAY 17, 2026" (shown as uppercase) */
  dateLabel: string;
  /** ISO date string for sorting e.g. "2026-05-17" */
  isoDate: string;
  /** Milestone heading — Playfair Display */
  title: string;
  /** Optional rich caption / intimate note */
  caption?: string;
  /** One or two photo URLs */
  imageUrls?: string[];
  /** Controls photo presentation style */
  layout: MilestoneLayout;
}

