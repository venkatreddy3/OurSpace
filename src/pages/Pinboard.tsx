import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore.js';
import { useTheme } from '../context/themeContext';
import { PinItem, pinboardService } from '../services/pinboard.service.js';
import { isFirebaseMocked } from '../services/firebase.js';
import { uploadImage } from '../services/cloudinary.service.js';
import { shrinkImageFile } from '../services/gallery.service.js';
import DotField from '../components/ui/DotField';
import InfiniteCanvas from '../components/pinboard/InfiniteCanvas';
import StickyNote from '../components/pinboard/StickyNote';
import PhotoPin from '../components/pinboard/PhotoPin';
import { Plus, Camera, RefreshCw } from 'lucide-react';

/**
 * Pinboard Page
 * Purpose:
 * - Edge-to-edge wall-to-wall canvas space.
 * - Displays a floating control header pill and a bottom stats indicator.
 * - Zero page margins or redundant double backgrounds.
 */
const FALLBACK_W = 256;
const FALLBACK_H = 200;
const CLUSTER_RADIUS = 650; // world px: notes this close count as "together"

/**
 * Picks the densest group of pins and returns the pan/zoom that centres it.
 * Falls back to the default view when the board is empty.
 */
const computeFocusView = (pins: PinItem[], vw: number, vh: number) => {
  if (pins.length === 0) return { zoom: 1, pan: { x: 0, y: 0 } };

  const box = (p: PinItem) => {
    const w = p.width || FALLBACK_W;
    const h = p.height || FALLBACK_H;
    return { cx: p.x + w / 2, cy: p.y + h / 2, w, h };
  };
  const boxes = pins.map(box);
  const dist = (a: { cx: number; cy: number }, b: { cx: number; cy: number }) => Math.hypot(a.cx - b.cx, a.cy - b.cy);

  // Seed = the pin with the most neighbours (ties go to the more recently raised pin)
  let seed = 0;
  let best = -1;
  boxes.forEach((b, i) => {
    const near = boxes.filter((o) => dist(b, o) <= CLUSTER_RADIUS).length;
    if (near > best || (near === best && pins[i].zIndex > pins[seed].zIndex)) {
      best = near;
      seed = i;
    }
  });

  // Refine once around the cluster centroid
  let members = boxes.filter((o) => dist(boxes[seed], o) <= CLUSTER_RADIUS);
  const centroid = {
    cx: members.reduce((n, m) => n + m.cx, 0) / members.length,
    cy: members.reduce((n, m) => n + m.cy, 0) / members.length,
  };
  members = boxes.filter((o) => dist(centroid, o) <= CLUSTER_RADIUS);
  if (members.length === 0) members = [boxes[seed]];

  const minX = Math.min(...members.map((m) => m.cx - m.w / 2));
  const maxX = Math.max(...members.map((m) => m.cx + m.w / 2));
  const minY = Math.min(...members.map((m) => m.cy - m.h / 2));
  const maxY = Math.max(...members.map((m) => m.cy + m.h / 2));

  // Zoom out only as far as needed to fit the cluster; never zoom in past 100%
  const pad = 120;
  const fit = Math.min((vw - pad) / (maxX - minX), (vh - pad) / (maxY - minY));
  const zoom = Math.max(0.25, Math.min(1, fit));

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  return { zoom, pan: { x: vw / 2 - cx * zoom, y: vh / 2 - cy * zoom } };
};

const Pinboard: React.FC = () => {
  const { user } = useAuthStore();
  const { theme } = useTheme();
  const [pins, setPins] = useState<PinItem[]>([]);
  const [zoomScale, setZoomScale] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const viewState = useRef({ pan: { x: 0, y: 0 }, zoom: 1 });
  const animFrame = useRef<number | null>(null);
  viewState.current = { pan, zoom: zoomScale };

  const coupleId = user?.coupleId || 'mock-couple-123';
  const authorId = user?.uid || 'dev-user-uid';

  // Sync pins snapshot streams
  useEffect(() => {
    const unsubscribe = pinboardService.subscribePins(coupleId, (fetchedPins) => {
      setPins((prevPins) => {
        return fetchedPins.map((fetched) => {
          const matchingLocal = prevPins.find((p) => p.id === fetched.id);
          if (matchingLocal && fetched.id === activeDragId) {
            return { ...fetched, x: matchingLocal.x, y: matchingLocal.y, zIndex: matchingLocal.zIndex };
          }
          return fetched;
        });
      });
    });

    return () => {
      unsubscribe();
    };
  }, [coupleId, activeDragId]);

  const handleAddNote = async () => {
    watchForNewPin();
    const randomOffset = () => Math.floor(Math.random() * 80) - 40;
    const maxZ = pins.reduce((max, p) => (p.zIndex > max ? p.zIndex : max), 1);
    
    await pinboardService.createPin({
      coupleId,
      authorId,
      type: 'note',
      title: 'Quick sticky',
      content: '',
      color: 'pastel-yellow',
      x: 180 + randomOffset(),
      y: 120 + randomOffset(),
      zIndex: maxZ + 1,
    });
  };

  const handleImageFile = (file: File, x: number, y: number) => {
    const maxZ = pins.reduce((max, p) => (p.zIndex > max ? p.zIndex : max), 1);
    const isMock = isFirebaseMocked || import.meta.env.VITE_ENABLE_MOCK_AUTH === 'true';
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        // Mock mode keeps the data URL; real mode uploads a shrunk copy to Cloudinary and stores its URL
        const photoUrl = isMock ? (reader.result as string) : await uploadImage(await shrinkImageFile(file));
        watchForNewPin();
        await pinboardService.createPin({
          coupleId,
          authorId,
          type: 'photo',
          title: file.name,
          content: 'Caption this memory ✨',
          photoUrl,
          color: 'obsidian-glass',
          x,
          y,
          zIndex: maxZ + 1,
        });
      } catch (err) {
        console.error('Could not add the photo pin:', err);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleToolbarAddPhoto = (file: File) => {
    handleImageFile(file, 200, 100);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleToolbarAddPhoto(file);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleDragStart = (id: string) => {
    setActiveDragId(id);
    const maxZ = pins.reduce((max, p) => (p.zIndex > max ? p.zIndex : max), 1);
    setPins((prev) =>
      prev.map((p) => (p.id === id ? { ...p, zIndex: maxZ + 1 } : p))
    );
  };

  const handleDrag = (id: string, x: number, y: number) => {
    setPins((prev) => prev.map((p) => (p.id === id ? { ...p, x, y } : p)));
  };

  const handleDragEnd = async (id: string, x: number, y: number) => {
    setActiveDragId(null);
    const targetPin = pins.find((p) => p.id === id);
    const zIndex = targetPin ? targetPin.zIndex : 1;
    await pinboardService.updatePinPosition(id, x, y, zIndex);
  };

  // Glide the canvas to a target pan/zoom
  const animateView = (target: { zoom: number; pan: { x: number; y: number } }) => {
    if (animFrame.current) cancelAnimationFrame(animFrame.current);
    const from = viewState.current;
    const start = performance.now();
    const duration = 500;
    const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const k = ease(t);
      setZoomScale(from.zoom + (target.zoom - from.zoom) * k);
      setPan({
        x: from.pan.x + (target.pan.x - from.pan.x) * k,
        y: from.pan.y + (target.pan.y - from.pan.y) * k,
      });
      animFrame.current = t < 1 ? requestAnimationFrame(step) : null;
    };
    animFrame.current = requestAnimationFrame(step);
  };

  const viewSize = () => {
    const el = viewRef.current;
    return { vw: el?.clientWidth || window.innerWidth, vh: el?.clientHeight || window.innerHeight };
  };

  // Recenter: fly to the busiest cluster of notes (not the empty middle of the board)
  const handleResetView = () => {
    const { vw, vh } = viewSize();
    animateView(computeFocusView(pins, vw, vh));
  };

  // After adding a note or photo, fly to the new one
  const knownIds = useRef<Set<string> | null>(null);
  const watchForNewPin = () => {
    knownIds.current = new Set(pins.map((p) => p.id));
  };
  // When the board first opens with notes on it, start focused on the busiest cluster
  const initialFocusDone = useRef(false);
  useEffect(() => {
    if (initialFocusDone.current || pins.length === 0 || knownIds.current) return;
    initialFocusDone.current = true;
    const { vw, vh } = viewSize();
    const target = computeFocusView(pins, vw, vh);
    setZoomScale(target.zoom);
    setPan(target.pan);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pins]);

  useEffect(() => {
    const known = knownIds.current;
    if (!known) return;
    const fresh = [...pins].reverse().find((p) => !known.has(p.id));
    if (!fresh) return;
    knownIds.current = null;
    const { vw, vh } = viewSize();
    const w = fresh.width || (fresh.type === 'photo' ? 224 : FALLBACK_W);
    const h = fresh.height || (fresh.type === 'photo' ? 290 : FALLBACK_H);
    const zoom = Math.min(1, Math.max(0.8, viewState.current.zoom));
    animateView({ zoom, pan: { x: vw / 2 - (fresh.x + w / 2) * zoom, y: vh / 2 - (fresh.y + h / 2) * zoom } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pins]);

  return (
    <div className="w-full h-[calc(100vh-4rem)] lg:h-screen relative overflow-hidden flex flex-col select-none bg-background transition-colors duration-300">
      {/* Wall-to-Wall Infinite DotGrid Background */}
      <div className="absolute inset-0 z-0">
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
          <DotField
            gradientFrom={theme === 'dark' ? '#9A9A9F' : '#6A6A6A'}
            gradientTo={theme === 'dark' ? '#9A9A9F' : '#6A6A6A'}
            gradientAngle={72}
            dotRadius={2.4}
            dotSpacing={22}
            cursorRadius={170}
            bulgeStrength={0.8}
            glowRadius={240}
            glowColor={theme === 'dark' ? '#FB5F7B' : '#F43F5E'}
            glowIntensity={0.14}
            pattern="grid"
            twist={0}
            baseOpacity={theme === 'dark' ? 0.22 : 0.4}
            waveAmplitude={1.5}
            speed={1}
            sparkle={false}
            interactive
            holdToZoom
            intro
            lightMode={theme !== 'dark'}
            aurora={theme === 'dark' ? ['#2A1A21', '#1C191B', '#241B22', '#161315'] : ['#F3E3EA', '#ECEBE6', '#F6EAF0', '#E9E7E2']}
            auroraIntensity={0.45}
            offsetX={pan.x}
            offsetY={pan.y}
            zoomScale={zoomScale}
          />
        </div>
      </div>

      {/* Floating Top Controls Header Toolbar */}
      <div className="absolute top-3 sm:top-6 left-1/2 -translate-x-1/2 z-30 max-w-[calc(100vw-1.5rem)] bg-surface border border-border-gray px-3 sm:px-5 py-2 sm:py-3 rounded-full flex items-center gap-3 sm:gap-6 shadow-md select-none transition-colors duration-300">
        <div className="hidden sm:flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-[10px] font-bold tracking-wider uppercase font-mono text-on-surface">
            Shared Workspace
          </span>
        </div>
        <div className="hidden sm:block h-4 border-l border-border-gray" />
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
          <button
            onClick={handleAddNote}
            className="flex items-center gap-1.5 bg-primary hover:brightness-105 text-on-primary font-semibold rounded-full px-3 sm:px-4 py-2 text-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> <span>Add<span className="hidden sm:inline"> Note</span></span>
          </button>
          <button
            onClick={triggerFileUpload}
            className="flex items-center gap-1.5 bg-surface hover:bg-surface-container-high border border-border-gray text-on-surface font-semibold rounded-full px-3 sm:px-4 py-2 text-xs transition-colors cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5" /> <span>Photo</span>
          </button>
          <button
            onClick={handleResetView}
            className="flex items-center gap-1.5 bg-surface hover:bg-surface-container-high border border-border-gray text-on-surface font-semibold rounded-full px-3 sm:px-4 py-2 text-xs transition-colors cursor-pointer"
            title="Reset Zoom & Pan"
          >
            <RefreshCw className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Recenter View</span>
          </button>
        </div>
      </div>

      {/* Edge-to-Edge Canvas Content area */}
      <div ref={viewRef} className="flex-1 w-full h-full relative overflow-hidden z-10">
        <InfiniteCanvas
          pan={pan}
          setPan={setPan}
          zoomScale={zoomScale}
          setZoomScale={setZoomScale}
          onImageDrop={handleImageFile}
          onRecenter={handleResetView}
        >
          {pins.map((pin) => {
            if (pin.type === 'note') {
              return (
                <StickyNote
                  key={pin.id}
                  pin={pin}
                  onDragStart={handleDragStart}
                  onDrag={handleDrag}
                  onDragEnd={handleDragEnd}
                />
              );
            } else {
              return (
                <PhotoPin
                  key={pin.id}
                  pin={pin}
                  onDragStart={handleDragStart}
                  onDrag={handleDrag}
                  onDragEnd={handleDragEnd}
                />
              );
            }
          })}
        </InfiniteCanvas>
      </div>

      {/* Floating Info Stats Indicator in Bottom Left */}
      <div className="absolute bottom-6 left-6 z-30 bg-surface border border-border-gray px-4 py-2.5 rounded-2xl flex items-center gap-3 shadow-md text-[10px] text-on-surface font-mono transition-colors duration-300">
        <span className="font-bold text-primary">PINS:</span>
        <span>{pins.length}</span>
      </div>
    </div>
  );
};

export default Pinboard;
