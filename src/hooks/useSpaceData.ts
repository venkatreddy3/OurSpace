import { useEffect, useState } from 'react';
import { memoryService } from '../services/memory.service.js';
import { pinboardService, type PinItem } from '../services/pinboard.service.js';
import { galleryService, type GalleryItem } from '../services/gallery.service.js';
import { playlistService, type PlaylistSong } from '../services/playlist.service.js';
import { recsService, type RecItem } from '../services/recs.service.js';
import type { Memory } from '../types/memory.js';

export interface SpaceData {
  memories: Memory[] | null;
  pins: PinItem[] | null;
  photos: GalleryItem[] | null;
  songs: PlaylistSong[] | null;
  recs: RecItem[] | null;
}

const EMPTY: SpaceData = { memories: null, pins: null, photos: null, songs: null, recs: null };

/**
 * Live view of everything a couple has added (null for a part until its first answer arrives).
 * Uses the same listeners as each page, so it is limited to the couple's own data by the same rules.
 */
export const useSpaceData = (coupleId: string | null): SpaceData => {
  const [data, setData] = useState<SpaceData>(EMPTY);

  useEffect(() => {
    setData(EMPTY);
    if (!coupleId) return;
    const unsubscribers = [
      memoryService.subscribeMemories(coupleId, (memories) => setData((d) => ({ ...d, memories }))),
      pinboardService.subscribePins(coupleId, (pins) => setData((d) => ({ ...d, pins }))),
      galleryService.subscribe(coupleId, (photos) => setData((d) => ({ ...d, photos }))),
      playlistService.subscribe(coupleId, (songs) => setData((d) => ({ ...d, songs }))),
      recsService.subscribe(coupleId, (recs) => setData((d) => ({ ...d, recs }))),
    ];
    return () => unsubscribers.forEach((stop) => stop());
  }, [coupleId]);

  return data;
};

export default useSpaceData;
