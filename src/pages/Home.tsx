import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../context/themeContext';
import { SleepyCats, Letter, Squiggle } from '../components/ui/Doodles';
import { useNudgeStore } from '../store/nudgeStore';

const WORLD_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCfwgfABSMkDW0k9ie0Sm6873rAz8NvOxx2qya4jpS8MWO3pvOlel1wT0iu8YmbFx4ZHQQpkHqDB2tk_SLR1kk8kqLJw1-gO4Zy2tcB5h0ie36Tpny1YkFoAo-7YPNeiQNZnHatA-Ye6LLcvOuxlzJ_2RyH_iM_9Ylg5yC2WCqjCZaXkNZaX9QnUhAARUQ87g8GKtmLx7fJNxHeIgsVBpEDrv40eO-q8f7qlNpgZ6_07GDYNHFLq41W7Q';

const DEFAULT_AVATAR =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuC2pBL_KRS9xDjOhjDzHhk6TWsEcpwwN2viRmji1iHTOxWpdrrQZC1ph6viEasNpSL5bm1041UBtjHtvrFv_WYqqwoXuHnHjb0W9RYDzn4F5aGq-GAMmBdsR0sY4T4YB_TdQKb5NQItHb63xKV9W0CcxKo7HNpu3Sk6t84ZkQuP-OYV29v6X2MUmhXI7VIAhnQhoJoWmzUKO-jFqv2J2x28mRGJJ7GGadSm0RzHoJPBfzrC63yxW0gz0g';

const navLinks = [
  { to: '/pinboard', label: 'Pinboard' },
  { to: '/memory-stack', label: 'Timeline' },
  { to: '/games', label: 'Games' },
  { to: '/recommendations', label: 'Recommendations' },
  { to: '/gallery', label: 'Gallery' },
];

const favorites = [
  { to: '/pinboard', title: 'Pinboard', note: 'Notes & photos', icon: 'push_pin', tint: 'bg-tint-1' },
  { to: '/memory-stack', title: 'Timeline', note: 'Every moment', icon: 'auto_stories', tint: 'bg-tint-2' },
  { to: '/games', title: 'Games', note: 'Play together', icon: 'sports_esports', tint: 'bg-tint-3' },
  { to: '/recommendations', title: 'Picks', note: 'Dates & films', icon: 'explore', tint: 'bg-tint-4' },
];

const hotspots = [
  { to: '/memory-stack', label: 'The Memory Oak', icon: 'nature', pos: 'top-[34%] left-[20%]', anim: 'animate-float' },
  { to: '/recommendations', label: 'The Star Gazery', icon: 'star', pos: 'top-[18%] right-[8%]', anim: 'animate-float-delayed' },
  { to: '/pinboard', label: 'The Cozy Cabin', icon: 'cabin', pos: 'bottom-[22%] left-[52%]', anim: 'animate-float-reverse' },
];

/**
 * Home Page (editorial landing dashboard)
 * Purpose:
 * - Cream, light-weight headline layout with thin-bordered cards and a dark feature band.
 * - Keeps the clickable "pocket world" hotspots, days-together counter, profile menu and theme toggle.
 */
const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user, couple, logout } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const [profileOpen, setProfileOpen] = useState(false);
  const openComposer = useNudgeStore((s) => s.openComposer);

  // Days since anniversary date
  const getDaysTogether = () => {
    if (!couple?.anniversaryDate) return 842; // Mockup default fallback
    const diffTime = Date.now() - new Date(couple.anniversaryDate).getTime();
    if (diffTime < 0) return 0;
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  const targetDays = getDaysTogether();
  const [days, setDays] = useState(Math.max(0, targetDays - 50));

  // Count-up counter animation on mount
  useEffect(() => {
    let current = Math.max(0, targetDays - 50);
    const step = () => {
      if (current < targetDays) {
        current += Math.ceil((targetDays - current) / 10);
        setDays(current);
        requestAnimationFrame(step);
      } else {
        setDays(targetDays);
      }
    };
    const timer = setTimeout(() => requestAnimationFrame(step), 600);
    return () => clearTimeout(timer);
  }, [targetDays]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const userPhoto = user?.photoURL || DEFAULT_AVATAR;
  const userName = user?.displayName || 'Jordan';

  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-on-background flex flex-col relative overflow-x-clip transition-colors duration-300">
      {/* Header bar */}
      <header className="sticky top-0 z-50 bg-background transition-colors duration-300">
        <div className="h-16 sm:h-20 w-full max-w-6xl mx-auto px-5 sm:px-8 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <span className="font-display text-xl sm:text-2xl">Ourspace</span>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((l) => (
              <Link key={l.to} to={l.to} className="text-sm font-medium hover:text-primary transition-colors">
                {l.label}
              </Link>
            ))}
            <button onClick={() => openComposer()} className="text-sm font-medium hover:text-primary transition-colors cursor-pointer">
              Send a note
            </button>
          </nav>

          <div className="flex items-center gap-1 sm:gap-3 relative">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-full hover:bg-surface-container-high transition-colors flex items-center justify-center cursor-pointer"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              <span className="material-symbols-outlined text-xl">{theme === 'dark' ? 'light_mode' : 'dark_mode'}</span>
            </button>

            <div className="relative">
              <img
                alt="Profile"
                className="w-9 h-9 rounded-full object-cover border border-border-gray hover:scale-105 transition-transform duration-300 cursor-pointer"
                src={userPhoto}
                onClick={() => setProfileOpen(!profileOpen)}
              />
              {profileOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
                  <div className="absolute right-0 mt-3 w-52 bg-surface border border-border-gray rounded-2xl shadow-xl py-2 z-20 animate-fade-in-up-1 text-on-background text-sm">
                    <div className="px-4 py-2 border-b border-border-gray">
                      <p className="text-xs font-semibold truncate">{userName}</p>
                      <p className="text-[10px] opacity-70 truncate">{user?.email}</p>
                    </div>
                    <button
                      onClick={() => { setProfileOpen(false); navigate('/pair-partner'); }}
                      className="w-full text-left px-4 py-2 text-xs hover:bg-surface-container-high transition-colors flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-sm">link</span> Couple settings
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-xs text-primary hover:bg-surface-container-high transition-colors flex items-center gap-2 font-medium"
                    >
                      <span className="material-symbols-outlined text-sm">logout</span> Log out
                    </button>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 rounded-full hover:bg-surface-container-high transition-colors cursor-pointer"
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
            >
              <span className="material-symbols-outlined text-2xl">{menuOpen ? 'close' : 'menu'}</span>
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav className="md:hidden border-t border-border-gray bg-background px-5 py-4 flex flex-col gap-1">
            {navLinks.map((l) => (
              <Link key={l.to} to={l.to} onClick={() => setMenuOpen(false)} className="py-3 font-display text-xl border-b border-border-gray/60">
                {l.label}
              </Link>
            ))}
            <button
              onClick={() => { setMenuOpen(false); openComposer(); }}
              className="py-3 text-left font-display text-xl"
            >
              Send a note
            </button>
          </nav>
        )}
      </header>

      <main className="w-full flex-1">
        {/* Hero */}
        <section className="max-w-6xl mx-auto px-5 sm:px-8 pt-10 sm:pt-16 pb-12 text-center">
          <p className="text-sm text-on-surface-variant mb-4 animate-fade-in-up-1">Welcome back, {userName}</p>
        </section>

        {/* Our little world (clickable hotspots) */}
        <section className="max-w-6xl mx-auto px-5 sm:px-8 pb-16 sm:pb-24">
          <h2 className="font-display text-3xl sm:text-5xl text-center mb-8">Our little world</h2>
          <div className="relative w-full h-[360px] sm:h-[500px] rounded-[28px] sm:rounded-[40px] overflow-hidden border border-border-gray group">
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-[10s] group-hover:scale-105 ease-in-out"
              style={{ backgroundImage: `url('${WORLD_IMAGE}')` }}
            />
            {hotspots.map((h) => (
              <div key={h.label} className={`absolute ${h.pos} ${h.anim}`}>
                <button
                  onClick={() => navigate(h.to)}
                  className="group/node flex flex-col items-center gap-2 -translate-x-1/2 -translate-y-1/2 transition-transform duration-300 hover:scale-110 cursor-pointer"
                  aria-label={h.label}
                >
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-surface flex items-center justify-center border border-border-gray shadow-lg">
                    <span className="material-symbols-outlined text-2xl sm:text-3xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>{h.icon}</span>
                  </div>
                  <div className="bg-on-background text-background px-3 py-1 rounded-full text-[10px] font-medium tracking-wider mt-1 opacity-0 group-hover/node:opacity-100 transition-all duration-300 translate-y-2 group-hover/node:translate-y-0 uppercase whitespace-nowrap">
                    {h.label}
                  </div>
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Blue favourites section */}
        <section className="section-ink">
          <div className="max-w-6xl mx-auto px-5 sm:px-8 py-16 sm:py-24">
            <h2 className="font-display text-3xl sm:text-5xl text-center">Our favorites</h2>
            <div className="mt-10 sm:mt-14 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
              {favorites.map((f) => (
                <Link
                  key={f.to}
                  to={f.to}
                  className="bg-card-bg text-on-surface rounded-[24px] sm:rounded-[32px] p-3 sm:p-4 flex flex-col hover:-translate-y-1 transition-transform duration-300"
                >
                  <div className={`${f.tint} rounded-[18px] sm:rounded-[24px] aspect-square flex items-center justify-center`}>
                    <span className="material-symbols-outlined text-on-surface" style={{ fontSize: "clamp(3rem, 9vw, 5rem)", fontVariationSettings: "'FILL' 1" }}>{f.icon}</span>
                  </div>
                  <div className="text-center py-4">
                    <p className="font-display text-lg sm:text-2xl">{f.title}</p>
                    <p className="text-xs sm:text-sm text-on-surface-variant mt-1">{f.note}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Statement + counter */}
        <section className="max-w-4xl mx-auto px-5 sm:px-8 py-16 sm:py-24 text-center">
          <SleepyCats className="mx-auto w-48 sm:w-64" catA="#e4e4ea" catB="#f6e7c8" stripe="#c9a46a" />
          <p className="mt-6 text-sm text-on-surface-variant">For a safe and happy home</p>
          <h2 className="font-display text-3xl sm:text-5xl mt-3">
            We want every day together to be full of joy.
          </h2>
          <Squiggle className="mx-auto mt-6 w-32 text-primary" />
          <div className="mt-10 inline-flex flex-col items-center card-edge px-10 py-6">
            <span className="text-xs uppercase tracking-[0.2em] text-on-surface-variant">Our journey</span>
            <span id="days-counter" className="font-display text-7xl sm:text-8xl tabular-nums mt-1">{days}</span>
            <span className="text-lg">days together</span>
          </div>
        </section>

        {/* Say hello panel */}
        <section className="max-w-6xl mx-auto px-5 sm:px-8 pb-16 sm:pb-24">
          <div className="grid md:grid-cols-2 rounded-[28px] sm:rounded-[40px] overflow-hidden border border-border-gray">
            <div className="section-ink p-8 sm:p-12 flex flex-col items-center justify-center text-center gap-4">
              <Letter className="w-40 sm:w-52 text-on-background" fill="var(--primary)" />
              <h2 className="font-display text-3xl sm:text-4xl">Say hello to your partner</h2>
              <p className="max-w-xs opacity-90">Share your invite code or pair up, then start filling your space together.</p>
            </div>
            <div className="p-8 sm:p-12 flex flex-col justify-center gap-4 bg-surface">
              <button onClick={() => navigate('/pair-partner')} className="btn-orange w-full">Pair with partner</button>
              <button onClick={() => navigate('/gallery')} className="btn-outline-blue w-full">Add to the gallery</button>
              <button onClick={() => navigate('/recommendations')} className="btn-outline-blue w-full">Find a date idea</button>
            </div>
          </div>
        </section>
      </main>

      <footer className="w-full border-t border-border-gray py-8">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-on-surface-variant text-center">
          <span>© {new Date().getFullYear()} Ourspace. Your private sanctuary.</span>
          <div className="flex gap-8">
            <Link to="/pinboard" className="hover:text-primary transition-colors">Privacy</Link>
            <Link to="/pinboard" className="hover:text-primary transition-colors">Terms</Link>
            <Link to="/pair-partner" className="hover:text-primary transition-colors">Support</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
