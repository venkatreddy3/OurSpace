import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ExternalLink, Headphones, Heart, Loader2, Music, Pause, Play, Search, Send, Trash2, X } from 'lucide-react';
import Stars from './Stars.js';
import { useIdentity } from './useIdentity.js';
import { playlistService, type PlaylistSong } from '../../services/playlist.service.js';
import { safeHttpUrl } from '../../utils/safeUrl.js';
import { pickFreshDesign } from '../pinboard/notePresets';

interface Suggestion {
  id: number;
  title: string;
  artist: string;
  artwork: string;
  previewUrl?: string;
  link?: string;
}

type Platform = 'android' | 'ios' | 'desktop';
const detectPlatform = (): Platform => {
  const ua = navigator.userAgent || '';
  if (/android/i.test(ua)) return 'android';
  if (/iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios';
  return 'desktop';
};

const MAX_MESSAGE = 200;

// ─── Listen pop-up ───────────────────────────────────────────────────────────
const ListenModal: React.FC<{ song: PlaylistSong; onClose: () => void }> = ({ song, onClose }) => {
  const platform = useMemo(detectPlatform, []);
  const q = encodeURIComponent(`${song.title} ${song.artist}`);
  const spotify = {
    name: 'Spotify',
    hint: 'Opens the song in the Spotify app',
    href: `https://open.spotify.com/search/${q}`,
    color: '#1DB954',
  };
  const apple = {
    name: 'Apple Music',
    hint: 'Opens the song in Apple Music',
    // The saved link was written by a partner's browser, so only plain web addresses are ever made clickable
    href: safeHttpUrl(song.link) || `https://music.apple.com/search?term=${q}`,
    color: '#FA243C',
  };
  const options = platform === 'android' ? [spotify] : platform === 'ios' ? [apple, spotify] : [spotify, apple];

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-surface-container border border-primary/15 rounded-3xl p-5 shadow-2xl"
      >
        <div className="flex items-center gap-3">
          {song.artwork ? (
            <img src={song.artwork} alt="" className="w-14 h-14 rounded-xl object-cover" />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
              <Music className="w-5 h-5 text-primary" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-on-surface truncate">{song.title}</p>
            <p className="text-xs text-on-surface-variant truncate">{song.artist}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-primary/10 cursor-pointer" aria-label="Close">
            <X className="w-4 h-4 text-on-surface-variant" />
          </button>
        </div>

        <p className="text-[11px] font-mono uppercase tracking-widest text-on-surface-variant/70 mt-5 mb-2">Listen on</p>
        <div className="space-y-2">
          {options.map((o) => (
            <a
              key={o.name}
              href={o.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
              className="flex items-center gap-3 p-3 rounded-2xl border border-primary/10 bg-surface-container-high hover:border-primary/30 transition-colors"
            >
              <span className="w-9 h-9 rounded-full flex items-center justify-center text-white" style={{ background: o.color }}>
                <Headphones className="w-4 h-4" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold text-on-surface">{o.name}</span>
                <span className="block text-xs text-on-surface-variant">{o.hint}</span>
              </span>
              <ExternalLink className="w-4 h-4 text-on-surface-variant" />
            </a>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Song card ───────────────────────────────────────────────────────────────
// Six looks, each a colour plus its own set of doodles. A song's look is its `design` number, so a card never
// changes when others are added or removed, and neighbours differ.
const ACCENTS = ['#b5546f', '#6f8f7a', '#6c82a8', '#b0875a', '#8b78a8', '#b36a5a'];
const DESIGN_COUNT = ACCENTS.length;
const DESIGN_IDS = ACCENTS.map((_, i) => String(i));

const Equalizer: React.FC = () => (
  <div className="flex items-end gap-[3px] h-4">
    {[0, 1, 2, 3].map((i) => (
      <motion.span
        key={i}
        className="w-[3px] rounded-full bg-white"
        animate={{ height: ['25%', '100%', '40%', '85%', '25%'] }}
        transition={{ duration: 0.9 + i * 0.12, repeat: Infinity, ease: 'easeInOut', delay: i * 0.08 }}
      />
    ))}
  </div>
);

// Hand-drawn doodles around the cover and beside the rating (3 themed sets, picked per song)
const Doodles: React.FC<{ color: string; variant: number }> = ({ color, variant }) => {
  const c = {
    fill: 'none',
    stroke: color,
    strokeWidth: 1.9,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  const dot = (x: number, y: number, r = 1.9) => <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill={color} />;

  const sets = [
    // love: heart, star, sparkles, music note
    <>
      <path {...c} d="M14 25c-7-5-10-9-7-13 3-3 6-1 7 2 1-3 4-5 7-2 3 4 0 8-7 13z" />
      <path {...c} d="M5 7l-2-3M22 6l2-3" />
      <path {...c} d="M176 5l3.2 7.4 8 .8-6 5.4 1.8 7.8-7-4.2-7 4.2 1.8-7.8-6-5.4 8-.8z" />
      <path {...c} d="M14 78v14M7 85h14M9 80l10 10M19 80L9 90" />
      {dot(8, 112)}
      {dot(18, 118, 1.2)}
      <path {...c} d="M171 96v-16l11-3v16M171 96a4 4 0 1 1-4-4M182 93a4 4 0 1 1-4-4" />
      {dot(176, 116)}
    </>,
    // cozy day: flower, sun, wave, cloud
    <>
      <g transform="translate(3 3) scale(1.05)">
        <circle {...c} cx="10" cy="10" r="2.3" />
        <circle {...c} cx="10" cy="3.7" r="3" />
        <circle {...c} cx="16.3" cy="10" r="3" />
        <circle {...c} cx="10" cy="16.3" r="3" />
        <circle {...c} cx="3.7" cy="10" r="3" />
      </g>
      <circle {...c} cx="176" cy="16" r="5" />
      <path {...c} d="M176 4v4M176 24v4M164 16h4M184 16h4M167 7l3 3M183 23l3 3M185 7l-3 3M169 23l-3 3" />
      <path {...c} d="M4 84c4-7 7 7 11 0s7 7 10 0" />
      <path {...c} d="M4 96c4-7 7 7 11 0s7 7 10 0" />
      <path {...c} d="M166 112c-6 0-7-8 0-9 1-7 12-7 14-1 7-1 9 9 2 10z" />
      {dot(172, 86)}
      {dot(182, 80, 1.2)}
    </>,
    // night: sparkle, moon, dots, curly arrow
    <>
      <path {...c} d="M14 5v18M5 14h18M8 8l12 12M20 8L8 20" />
      <path {...c} d="M183 5a11 11 0 1 0 5 17 9 9 0 0 1-5-17z" />
      {dot(172, 8, 1.2)}
      {dot(8, 80)}
      {dot(16, 90)}
      {dot(24, 100)}
      {dot(10, 108, 1.2)}
      <path {...c} d="M166 108c6-14 18-8 17 4M178 108l5 5 5-6" />
      <path {...c} d="M176 70l2 5 5 1-4 4 1 5-4-3-4 3 1-5-4-4 5-1z" transform="translate(0 -4) scale(.9)" />
    </>,
    // music: notes, vinyl record, equalizer bars, sparkle
    <>
      <path {...c} d="M10 24v-15l11-3v15M10 24a3.6 3.6 0 1 1-3.6-3.6M21 21a3.6 3.6 0 1 1-3.6-3.6" />
      <circle {...c} cx="176" cy="16" r="10" />
      <circle {...c} cx="176" cy="16" r="3" />
      <path {...c} d="M5 104v-9M11 104v-18M17 104v-12M23 104v-22" />
      {dot(8, 114, 1.4)}
      <path {...c} d="M174 100v16M166 108h16M168 102l12 12M180 102l-12 12" />
      {dot(186, 90, 1.3)}
    </>,
    // garden: leaf sprig, butterfly, little leaves, bud
    <>
      <path {...c} d="M6 26c2-10 8-16 18-18-1 10-7 16-18 18zM6 26l11-11" />
      <path {...c} d="M168 20c-8-12-2-16 8-6 10-10 16-6 8 6-4 7-12 5-8 0M176 14v12" />
      <path {...c} d="M8 84c0-8 6-12 14-12 0 8-6 12-14 12zM8 84l9-8" />
      {dot(10, 100)}
      {dot(20, 108, 1.3)}
      <path {...c} d="M176 110c-6 0-6-8 0-12 6 4 6 12 0 12zM176 110v8" />
      {dot(166, 92, 1.2)}
    </>,
    // sweet: diamond, cross-star, zigzag, curl
    <>
      <path {...c} d="M14 4l9 11-9 12-9-12z" />
      <path {...c} d="M176 4v24M164 16h24M168 8l16 16M184 8l-16 16" />
      <path {...c} d="M4 92l6-9 6 9 6-9 6 9" />
      <path {...c} d="M4 106l6-9 6 9 6-9 6 9" />
      <path {...c} d="M166 112c0-9 13-9 13 0s-11 7-9 0" />
      {dot(186, 100, 1.4)}
      {dot(172, 84, 1.2)}
    </>,
  ];
  const bottoms = [
    // little heart pair
    <>
      <path {...c} d="M12 24c-6-4-8-7-6-10 2-2 5-1 6 1 1-2 4-3 6-1 2 3 0 6-6 10z" />
      <path {...c} d="M25 12c-3-2-4-4-3-5 1-1 3 0 3 1 0-1 2-2 3-1 1 2 0 4-3 5z" />
    </>,
    // little leaf & dots
    <>
      <path {...c} d="M6 26c0-12 8-18 20-18 0 12-8 18-20 18zM6 26L18 14" />
    </>,
    // little stars
    <>
      <path {...c} d="M12 6l2 5 5 .5-4 3.5 1.2 5-4.2-2.7-4.2 2.7 1.2-5-4-3.5 5-.5z" />
      <path {...c} d="M25 20v7M21.5 23.5h7" />
    </>,
    // tiny note
    <>
      <path {...c} d="M12 24v-14l10-3v14M12 24a3.4 3.4 0 1 1-3.4-3.4M22 21a3.4 3.4 0 1 1-3.4-3.4" />
    </>,
    // sprout
    <>
      <path {...c} d="M16 28V16M16 16c-8 0-10-6-10-10 8 0 10 4 10 10zM16 20c6 0 9-4 10-9-7 0-10 3-10 9z" />
    </>,
    // little diamonds
    <>
      <path {...c} d="M12 5l7 8-7 9-7-9z" />
      <path {...c} d="M25 20l3.5 4-3.5 4-3.5-4z" />
    </>,
  ];
  const v = variant % DESIGN_COUNT;
  return (
    <>
      <svg aria-hidden viewBox="0 0 190 130" className="pointer-events-none absolute top-1 left-0 w-full" style={{ opacity: 0.85 }}>
        {sets[v]}
      </svg>
      <svg aria-hidden viewBox="0 0 32 32" className="pointer-events-none absolute right-3 bottom-[3.4rem] w-8 h-8" style={{ opacity: 0.85 }}>
        {bottoms[v]}
      </svg>
    </>
  );
};

interface CardProps {
  song: PlaylistSong;
  index: number;
  /** Which of the six looks to use (colour and doodles) */
  design: number;
  mine: boolean;
  partnerName: string;
  playing: boolean;
  onPreview: () => void;
  onListen: () => void;
  onRate: (n: number) => void;
  onDelete: () => void;
}

const SongCard: React.FC<CardProps> = ({ song, index, design, mine, partnerName, playing, onPreview, onListen, onRate, onDelete }) => {
  const accent = ACCENTS[design % DESIGN_COUNT];
  const variant = design % DESIGN_COUNT;
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.35, ease: 'easeOut', delay: Math.min(index, 8) * 0.04 }}
      whileHover={{ y: -3 }}
      className="group relative flex flex-col rounded-2xl p-2.5 border bg-surface-container overflow-hidden"
      style={{ borderColor: `${accent}40`, backgroundImage: `linear-gradient(${accent}12, ${accent}12)` }}
    >
      <Doodles color={accent} variant={variant} />

      {/* Square artwork with overlay controls */}
      <div className="relative aspect-square w-full max-w-[8.5rem] mx-auto rounded-xl overflow-hidden" style={{ background: `${accent}33` }}>
        {song.artwork ? (
          <img src={song.artwork} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ color: accent }}>
            <Music className="w-8 h-8" />
          </div>
        )}
        {playing && (
          <div className="absolute bottom-2.5 left-2.5 px-1.5 py-1 rounded-md bg-black/55">
            <Equalizer />
          </div>
        )}
        {song.previewUrl && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onPreview}
            className="absolute bottom-2 right-2 w-8 h-8 flex items-center justify-center rounded-full text-white cursor-pointer"
            style={{ background: accent }}
            title={playing ? 'Pause preview' : 'Play 30s preview'}
            aria-label={playing ? 'Pause preview' : 'Play preview'}
          >
            {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
          </motion.button>
        )}
        {mine && (
          <button
            onClick={onDelete}
            className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full bg-black/50 hover:bg-red-500 text-white opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all cursor-pointer"
            title="Remove song"
            aria-label="Remove song"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="relative pt-3 px-0.5 flex-1 flex flex-col gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-on-surface truncate leading-tight">{song.title}</p>
          <p className="text-xs text-on-surface-variant truncate">{song.artist}</p>
        </div>

        {song.message && (
          <p
            className="text-xs italic text-on-surface-variant pl-2.5 line-clamp-3"
            style={{ borderLeft: `2px solid ${accent}` }}
            title={song.message}
          >
            {song.message}
          </p>
        )}

        <div className="mt-auto pt-1 flex flex-col gap-2.5">
          <div className="flex flex-col gap-0.5 min-h-[2.1rem]">
            {mine ? (
              song.rating ? (
                <>
                  <Stars value={song.rating} size={14} />
                  <span className="text-[10px] text-on-surface-variant">{partnerName} rated</span>
                </>
              ) : (
                <span className="text-[10px] text-on-surface-variant/70">Waiting for {partnerName} to listen</span>
              )
            ) : (
              <>
                <Stars value={song.rating || 0} onChange={onRate} size={15} />
                <span className="text-[10px] text-on-surface-variant">{song.rating ? 'Your rating' : 'Rate after listening'}</span>
              </>
            )}
          </div>
          <button
            onClick={onListen}
            className="w-full h-8 flex items-center justify-center gap-1.5 rounded-full text-xs font-semibold border bg-transparent hover:text-white transition-colors cursor-pointer"
            style={{ borderColor: accent, color: accent }}
            onMouseEnter={(e) => { e.currentTarget.style.background = accent; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = accent; }}
          >
            <Headphones className="w-3.5 h-3.5" /> Listen
          </button>
        </div>
      </div>
    </motion.li>
  );
};

// ─── Playlist ────────────────────────────────────────────────────────────────
const Playlist: React.FC = () => {
  const { me, otherName, coupleId } = useIdentity();

  const [songs, setSongs] = useState<PlaylistSong[]>([]);
  // null = nobody has chosen yet: open on whichever list has something in it
  const [tabChoice, setTab] = useState<'theirs' | 'mine' | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSuggest, setShowSuggest] = useState(false);
  const [draft, setDraft] = useState<Suggestion | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [listenSong, setListenSong] = useState<PlaylistSong | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => playlistService.subscribe(coupleId, setSongs), [coupleId]);

  // Each song's look: the one saved on it, or (for older songs) its place in the order they were added,
  // so neighbouring cards never share a colour and doodles
  const designOf = useMemo(() => {
    const oldestFirst = [...songs].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
    const map = new Map<string, number>();
    oldestFirst.forEach((s, i) => map.set(s.id, (s.design ?? i) % DESIGN_COUNT));
    return map;
  }, [songs]);

  // Live song search (iTunes Search API: free, no key) as you type
  useEffect(() => {
    const q = title.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setSearching(false);
      return;
    }
    const ctrl = new AbortController();
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=song&limit=8`,
          { signal: ctrl.signal }
        );
        const data = await res.json();
        setSuggestions(
          (data.results || []).map((r: any) => ({
            id: r.trackId,
            title: r.trackName,
            artist: r.artistName,
            artwork: (r.artworkUrl100 || '').replace('100x100', '200x200'),
            previewUrl: r.previewUrl,
            link: r.trackViewUrl,
          }))
        );
        setShowSuggest(true);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') setSuggestions([]);
      } finally {
        if (!ctrl.signal.aborted) setSearching(false);
      }
    }, 300);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [title]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setShowSuggest(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  useEffect(() => () => audioRef.current?.pause(), []);

  const pick = (sg: Suggestion) => {
    setDraft(sg);
    setMessage('');
    setTitle('');
    setSuggestions([]);
    setShowSuggest(false);
  };

  const send = async () => {
    if (!draft || sending) return;
    setSending(true);
    setSendError(null);
    // A new song gets the least-used look, never the same as the song added just before it
    const newest = [...songs].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    const design = Number(
      pickFreshDesign(DESIGN_IDS, songs.map((s) => String(designOf.get(s.id) ?? 0)), newest ? String(designOf.get(newest.id) ?? 0) : null)
    );
    try {
      await playlistService.add({
        design,
        coupleId,
        authorId: me.uid,
        authorName: me.name,
        title: draft.title,
        artist: draft.artist,
        artwork: draft.artwork,
        previewUrl: draft.previewUrl,
        link: draft.link,
        message: message.trim() || undefined,
      });
      setDraft(null);
      setMessage('');
      setTab('mine'); // show the song just added under "From you"
    } catch (err) {
      console.error('Could not save the song:', err);
      setSendError(
        (err as { code?: string })?.code === 'permission-denied'
          ? 'That song couldn’t be saved: you don’t have permission. Please sign in again and make sure you are paired.'
          : 'That song couldn’t be saved. Please check your connection and try again.'
      );
    } finally {
      setSending(false);
    }
  };

  const togglePreview = (song: PlaylistSong) => {
    if (!song.previewUrl) return;
    if (playingId === song.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    audioRef.current?.pause();
    const a = new Audio(song.previewUrl);
    a.onended = () => setPlayingId(null);
    a.play().catch(() => setPlayingId(null));
    audioRef.current = a;
    setPlayingId(song.id);
  };

  const mine = songs.filter((s) => s.authorId === me.uid);
  const theirs = songs.filter((s) => s.authorId !== me.uid);
  const tab = tabChoice ?? (theirs.length === 0 && mine.length > 0 ? 'mine' : 'theirs');

  const renderList = (list: PlaylistSong[], isMine: boolean, empty: string) =>
    list.length === 0 ? (
      <p className="text-sm text-on-surface-variant/70 py-10 text-center border border-dashed border-primary/15 rounded-2xl">{empty}</p>
    ) : (
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] gap-3">
        <AnimatePresence initial={false}>
          {list.map((song, i) => (
            <SongCard
              key={song.id}
              song={song}
              index={i}
              design={designOf.get(song.id) ?? 0}
              mine={isMine}
              partnerName={otherName}
              playing={playingId === song.id}
              onPreview={() => togglePreview(song)}
              onListen={() => setListenSong(song)}
              onRate={(n) => playlistService.rate(song.id, n)}
              onDelete={() => playlistService.remove(song.id)}
            />
          ))}
        </AnimatePresence>
      </ul>
    );

  return (
    <div className="space-y-6 max-w-4xl">
      {sendError && (
        <div role="alert" className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl px-4 py-3 text-sm font-medium">
          {sendError}
        </div>
      )}

      {/* Search + compose */}
      <div className="bg-surface-container border border-primary/10 rounded-2xl p-5 space-y-4">
        {draft ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <img src={draft.artwork} alt="" className="w-14 h-14 rounded-xl object-cover" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-on-surface truncate">{draft.title}</p>
                <p className="text-xs text-on-surface-variant truncate">{draft.artist}</p>
              </div>
              <button
                onClick={() => setDraft(null)}
                className="p-2 rounded-full hover:bg-primary/10 cursor-pointer"
                aria-label="Choose a different song"
              >
                <X className="w-4 h-4 text-on-surface-variant" />
              </button>
            </div>
            <div className="relative">
              <textarea
                value={message}
                maxLength={MAX_MESSAGE}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                placeholder={`Add a message for ${otherName} — e.g. "This song reminds me of you" (optional)`}
                className="w-full resize-none bg-surface-container-high border border-primary/10 focus:border-primary/40 outline-none rounded-xl px-3.5 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50"
              />
              <span className="absolute bottom-2 right-3 text-[10px] font-mono text-on-surface-variant/50">
                {message.length}/{MAX_MESSAGE}
              </span>
            </div>
            <div className="flex justify-end">
              <button
                onClick={send}
                disabled={sending}
                className="flex items-center gap-2 bg-primary text-on-primary rounded-full px-5 py-2.5 text-sm font-medium disabled:opacity-50 cursor-pointer"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Recommend to {otherName}
              </button>
            </div>
          </div>
        ) : (
          <div className="relative" ref={boxRef}>
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 pointer-events-none" />
            <input
              className="w-full bg-surface-container-high border border-primary/10 focus:border-primary/40 outline-none rounded-xl pl-10 pr-10 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 transition-colors"
              placeholder="Search a song to recommend…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onFocus={() => suggestions.length && setShowSuggest(true)}
            />
            {searching && <Loader2 className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-primary" />}
            {showSuggest && suggestions.length > 0 && (
              <ul className="absolute z-30 left-0 right-0 top-full mt-2 max-h-96 overflow-y-auto bg-surface-container border border-primary/15 rounded-2xl shadow-2xl p-1.5">
                {suggestions.map((sg) => (
                  <li key={sg.id}>
                    <button
                      type="button"
                      onClick={() => pick(sg)}
                      className="w-full flex items-center gap-3 p-2 rounded-xl text-left hover:bg-primary/10 transition-colors cursor-pointer"
                    >
                      <img src={sg.artwork} alt="" className="w-11 h-11 rounded-lg object-cover bg-surface-container-high flex-shrink-0" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-on-surface truncate">{sg.title}</span>
                        <span className="block text-xs text-on-surface-variant truncate">{sg.artist}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Switch between partner's and my recommendations */}
      <div className="space-y-4">
        <div className="inline-flex p-1 bg-surface-container border border-primary/10 rounded-full">
          {([
            { id: 'theirs', label: `From ${otherName}`, count: theirs.length, icon: <Heart className="w-3.5 h-3.5" /> },
            { id: 'mine', label: 'From you', count: mine.length, icon: <Music className="w-3.5 h-3.5" /> },
          ] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                tab === t.id ? 'bg-on-background text-background shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {t.icon}
              {t.label}
              <span className="font-mono opacity-70">{t.count}</span>
            </button>
          ))}
        </div>
        {tab === 'theirs'
          ? renderList(theirs, false, `${otherName} hasn't recommended anything yet.`)
          : renderList(mine, true, 'Search above to recommend your first song.')}
      </div>

      <AnimatePresence>{listenSong && <ListenModal song={listenSong} onClose={() => setListenSong(null)} />}</AnimatePresence>
    </div>
  );
};

export default Playlist;
