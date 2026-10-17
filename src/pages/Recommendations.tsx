import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Compass, Film, Heart, ImagePlus, Loader2, MapPin, Music, Plus, Search, Sparkles, X } from 'lucide-react';
import Playlist from '../components/recommendations/Playlist.js';
import RecCard from '../components/recommendations/RecCard.js';
import TabDoodle from '../components/recommendations/TabDoodle.js';
import { useIdentity } from '../components/recommendations/useIdentity.js';
import { recsService, type RecItem } from '../services/recs.service.js';

/**
 * Recommendations Page
 * Purpose:
 * - Shared Watchlist (movies/shows you both want to watch).
 * - Places to Visit (travel or local food bucket list).
 * - General Recommendations (couple books, ideas, recipes, etc.).
 * - Playlist (songs you recommend to each other).
 */

type Tab = 'watchlist' | 'places' | 'playlist';

const ADD_META: Record<string, { button: string; title: string; meta: string; desc: string }> = {
  watchlist: { button: 'Add to watchlist', title: 'Movie or show name', meta: 'Where to watch / duration (optional)', desc: 'Why you want to watch it (optional)' },
  places: { button: 'Add place', title: 'Place name', meta: 'Location / opening hours (optional)', desc: 'Why you want to go (optional)' },
};

interface MovieHit {
  id: number | string;
  title: string;
  meta: string;
  desc: string;
  cover: string;
}

const inputCls =
  'w-full bg-surface-container-high border border-primary/10 focus:border-primary/40 outline-none rounded-xl px-3.5 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50';

const emptyForm = { title: '', desc: '', meta: '', cover: '' };

const Recommendations: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('watchlist');

  const categories = [
    { id: 'watchlist', label: 'Watchlist', icon: <Film className="w-4 h-4" /> },
    { id: 'playlist', label: 'Playlist', icon: <Music className="w-4 h-4" /> },
    { id: 'places', label: 'Places to Visit', icon: <MapPin className="w-4 h-4" /> },
  ];

  const { me, otherName, coupleId } = useIdentity();
  const [items, setItems] = useState<RecItem[]>([]);
  // null = nobody has chosen yet: open on whichever list has something in it
  const [viewChoice, setView] = useState<'theirs' | 'mine' | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => recsService.subscribe(coupleId, setItems), [coupleId]);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [movieHits, setMovieHits] = useState<MovieHit[]>([]);
  const [searching, setSearching] = useState(false);
  // What the last search ended with: nothing to say, no matches, or the service couldn't be reached
  const [searchStatus, setSearchStatus] = useState<'idle' | 'empty' | 'failed'>('idle');

  useEffect(() => {
    setShowForm(false);
    setForm(emptyForm);
    setView(null);
    setSaveError(null);
  }, [activeTab]);

  // Suggest matches with a photo as you type - shows via TVMaze, places and bookmarks via Wikipedia (both free, no key)
  useEffect(() => {
    const q = form.title.trim();
    const active = activeTab === 'watchlist' || (showForm && activeTab !== 'playlist');
    if (!active || q.length < 2 || (activeTab !== 'watchlist' && form.cover)) {
      setMovieHits([]);
      setSearching(false);
      setSearchStatus('idle');
      return;
    }
    const ctrl = new AbortController();
    setSearching(true);
    setSearchStatus('idle');
    const t = setTimeout(async () => {
      try {
        if (activeTab === 'watchlist') {
          // Movies & series with posters (IMDb's titles-only suggestion feed: free, no key).
          // The general feed puts people first, so a name like "john" would return no titles at all.
          const res = await fetch(
            `https://v3.sg.media-imdb.com/suggestion/titles/x/${encodeURIComponent(q.toLowerCase())}.json`,
            { signal: ctrl.signal }
          );
          if (!res.ok) throw new Error(`Movie search answered ${res.status}`);
          const kinds: Record<string, string> = {
            movie: 'Movie',
            tvMovie: 'TV movie',
            tvSeries: 'Series',
            tvMiniSeries: 'Mini-series',
            tvSpecial: 'Special',
            short: 'Short',
          };
          const items = ((await res.json()).d || []) as any[];
          const hits = items
            .filter((r) => String(r.id).startsWith('tt') && r.i?.imageUrl && kinds[r.qid])
            .slice(0, 8)
            .map((r) => ({
              id: r.id,
              title: r.l,
              meta: `${kinds[r.qid]}${r.y ? ` • ${r.y}` : ''}`,
              desc: r.s || '',
              cover: String(r.i.imageUrl).replace(/\._V1_.*\.jpg$/, '._V1_UX400_.jpg'),
            }));
          setMovieHits(hits);
          setSearchStatus(hits.length === 0 ? 'empty' : 'idle');
        } else {
          // Places & bookmarks (Wikipedia search: free, no key)
          const url =
            'https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&generator=search' +
            `&gsrsearch=${encodeURIComponent(q)}&gsrlimit=8&prop=pageimages|extracts` +
            '&piprop=thumbnail&pithumbsize=480&exintro=1&explaintext=1&exchars=160';
          const res = await fetch(url, { signal: ctrl.signal });
          const pages = Object.values((await res.json()).query?.pages || {}) as any[];
          setMovieHits(
            pages
              .filter((p) => p.thumbnail?.source)
              .sort((a, b) => a.index - b.index)
              .slice(0, 6)
              .map((p) => ({
                id: p.pageid,
                title: String(p.title),
                meta: '',
                desc: String(p.extract || '').trim(),
                cover: p.thumbnail.source,
              }))
          );
        }
      } catch (err) {
        // A newer keystroke aborts the older request on purpose; anything else means the search itself failed
        if ((err as Error)?.name !== 'AbortError' && !ctrl.signal.aborted) {
          setMovieHits([]);
          setSearchStatus('failed');
        }
      } finally {
        if (!ctrl.signal.aborted) setSearching(false);
      }
    }, 350);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [form.title, form.cover, showForm, activeTab]);

  // Shrink uploaded photos so they stay small in storage
  const handleCoverFile = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 480;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
        setForm((f) => ({ ...f, cover: canvas.toDataURL('image/jpeg', 0.8) }));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const submitRec = async (category: 'watchlist' | 'places', data: { title: string; desc: string; meta: string; cover?: string }) => {
    setSaveError(null);
    try {
      await recsService.add({
        coupleId,
        authorId: me.uid,
        authorName: me.name,
        category,
        title: data.title,
        desc: data.desc,
        meta: data.meta,
        cover: data.cover,
      });
      setView('mine');
    } catch (err) {
      console.error('Could not save the recommendation:', err);
      setSaveError(
        (err as { code?: string })?.code === 'permission-denied'
          ? 'That recommendation couldn’t be saved: you don’t have permission. Please sign in again and make sure you are paired.'
          : 'That recommendation couldn’t be saved. Please check your connection and try again.'
      );
    }
  };

  const addRec = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || activeTab === 'playlist') return;
    void submitRec(activeTab, {
      title: form.title.trim(),
      desc: form.desc.trim(),
      meta: form.meta.trim(),
      cover: form.cover || undefined,
    });
    setForm(emptyForm);
    setMovieHits([]);
    setShowForm(false);
  };

  const addMovie = (h: MovieHit) => {
    void submitRec('watchlist', { title: h.title, desc: h.desc, meta: h.meta, cover: h.cover });
    setForm(emptyForm);
    setMovieHits([]);
  };

  const addCopy = ADD_META[activeTab];
  const inTab = items.filter((r) => r.category === activeTab);
  const theirs = inTab.filter((r) => r.authorId !== me.uid);
  const mine = inTab.filter((r) => r.authorId === me.uid);
  const view = viewChoice ?? (theirs.length === 0 && mine.length > 0 ? 'mine' : 'theirs');
  // Places are one common list; other tabs switch between partner's and mine
  const common = activeTab === 'places';
  const shown = common ? inTab : view === 'theirs' ? theirs : mine;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.5 }}
      className="@container relative space-y-6 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8"
    >
      <TabDoodle tab={activeTab} />
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-primary/10 pb-6">
        <div>
          <h1 className="text-3xl font-bold font-serif text-on-surface flex items-center gap-2">
            Shared Recommendations <Compass className="text-primary w-6 h-6" />
          </h1>
          <p className="text-on-surface-variant mt-1">Share movies, songs and places you both want to check out.</p>
        </div>
      </header>

      {saveError && (
        <div role="alert" className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl px-4 py-3 text-sm font-medium">
          {saveError}
        </div>
      )}

      {/* Tabs + add button */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-2 p-1 bg-surface-container border border-primary/10 rounded-xl w-full max-w-2xl">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveTab(cat.id as Tab)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === cat.id
                  ? 'bg-on-background text-background shadow-sm'
                  : 'text-on-surface-variant hover:bg-surface-container-high/40 hover:text-on-surface'
              }`}
            >
              {cat.icon}
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
        {activeTab !== 'playlist' && activeTab !== 'watchlist' && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 bg-primary hover:brightness-105 text-on-primary rounded-full px-5 py-2.5 text-sm font-medium transition-colors cursor-pointer"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? 'Cancel' : addCopy.button}
          </button>
        )}
      </div>

      {activeTab === 'playlist' && <Playlist />}

      {activeTab === 'watchlist' && (
        <div className="bg-surface-container border border-primary/10 rounded-2xl p-5 max-w-2xl">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 pointer-events-none" />
            <input
              className={`${inputCls} pl-10 pr-10`}
              placeholder="Search a movie or show to add…"
              value={form.title}
              onChange={(e) => setForm({ ...emptyForm, title: e.target.value })}
            />
            {searching && <Loader2 className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-primary" />}
            {movieHits.length > 0 && (
              <ul className="absolute z-30 left-0 right-0 top-full mt-2 max-h-96 overflow-y-auto bg-surface-container border border-primary/15 rounded-2xl shadow-2xl p-1.5">
                {movieHits.map((h) => (
                  <li key={h.id}>
                    <button
                      type="button"
                      onClick={() => addMovie(h)}
                      className="w-full flex items-center gap-3 p-2 rounded-xl text-left hover:bg-primary/10 transition-colors cursor-pointer"
                    >
                      <img src={h.cover} alt="" className="w-10 h-14 rounded-md object-cover bg-surface-container-high flex-shrink-0" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-on-surface truncate">{h.title}</span>
                        <span className="block text-xs text-primary">{h.meta}</span>
                        {h.desc && <span className="block text-xs text-on-surface-variant truncate">{h.desc}</span>}
                      </span>
                      <Plus className="w-4 h-4 text-primary flex-shrink-0" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {!searching && movieHits.length === 0 && searchStatus !== 'idle' && (
            <p className="mt-3 text-xs text-on-surface-variant" role="status">
              {searchStatus === 'failed'
                ? 'Couldn’t reach the movie search. Check your connection and try again.'
                : `No movies found for “${form.title.trim()}”. Try another spelling.`}
            </p>
          )}
        </div>
      )}

      {activeTab !== 'playlist' && activeTab !== 'watchlist' && showForm && (
        <motion.form
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={addRec}
          className="bg-surface-container border border-primary/10 rounded-2xl p-5 grid gap-3 max-w-2xl"
        >
          <div className="relative">
            <input
              autoFocus
              className={inputCls}
              placeholder={`${addCopy.title} *`}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value, cover: '' })}
            />
            {searching && <Loader2 className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-primary" />}
            {movieHits.length > 0 && (
              <ul className="absolute z-30 left-0 right-0 top-full mt-2 max-h-80 overflow-y-auto bg-surface-container border border-primary/15 rounded-2xl shadow-2xl p-1.5">
                {movieHits.map((h) => (
                  <li key={`${h.meta}-${h.id}`}>
                    <button
                      type="button"
                      onClick={() => {
                        setForm((f) => ({ title: h.title, meta: h.meta || f.meta, desc: h.desc, cover: h.cover }));
                        setMovieHits([]);
                      }}
                      className="w-full flex items-center gap-3 p-2 rounded-xl text-left hover:bg-primary/10 transition-colors cursor-pointer"
                    >
                      <img src={h.cover} alt="" className="w-9 h-12 rounded-md object-cover bg-surface-container-high flex-shrink-0" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-on-surface truncate">{h.title}</span>
                        <span className="block text-xs text-on-surface-variant line-clamp-2">{h.desc}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <input className={inputCls} placeholder={addCopy.meta} value={form.meta} onChange={(e) => setForm({ ...form, meta: e.target.value })} />
          <textarea rows={2} className={`${inputCls} resize-none`} placeholder={addCopy.desc} value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })} />

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 text-xs font-semibold text-on-surface-variant hover:text-primary hover:border-primary/40 cursor-pointer transition-colors">
              <ImagePlus className="w-4 h-4" /> {form.cover ? 'Change cover' : 'Add cover photo'}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleCoverFile(e.target.files?.[0])} />
            </label>
            {form.cover && (
              <span className="relative">
                <img src={form.cover} alt="" className="w-10 h-10 rounded-lg object-cover" />
                <button
                  type="button"
                  onClick={() => setForm({ ...form, cover: '' })}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-black/70 text-white flex items-center justify-center cursor-pointer"
                  aria-label="Remove cover"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!form.title.trim()}
              className="bg-primary text-on-primary rounded-full px-5 py-2 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Save
            </button>
          </div>
        </motion.form>
      )}

      {/* Switch between partner's and my picks */}
      {activeTab !== 'playlist' && (
        <div className="space-y-4">
          {!common && (
          <div className="inline-flex p-1 bg-surface-container border border-primary/10 rounded-full">
            {([
              { id: 'theirs', label: `From ${otherName}`, count: theirs.length, icon: <Heart className="w-3.5 h-3.5" /> },
              { id: 'mine', label: 'From you', count: mine.length, icon: <Sparkles className="w-3.5 h-3.5" /> },
            ] as const).map((t) => (
              <button
                key={t.id}
                onClick={() => setView(t.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                  view === t.id ? 'bg-on-background text-background shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {t.icon}
                {t.label}
                <span className="font-mono opacity-70">{t.count}</span>
              </button>
            ))}
          </div>
          )}

          {shown.length === 0 ? (
            <p className="text-sm text-on-surface-variant/70 py-10 text-center border border-dashed border-primary/15 rounded-2xl max-w-2xl">
              {!common && view === 'theirs'
                ? `${otherName} hasn't added anything here yet.`
                : activeTab === 'watchlist'
                  ? 'Search above to add your first movie or show.'
                  : 'Use the button above to add your first place.'}
            </p>
          ) : (
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] gap-4">
              <AnimatePresence initial={false}>
                {shown.map((rec, index) => (
                  <RecCard
                    key={rec.id}
                    rec={rec}
                    index={index}
                    mine={rec.authorId === me.uid}
                    showAuthor={common}
                    partnerName={otherName}
                    onRate={(n) => recsService.rate(rec.id, n)}
                    onRemove={() => recsService.remove(rec.id)}
                  />
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default Recommendations;
