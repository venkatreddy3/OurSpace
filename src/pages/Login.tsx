import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider, isFirebaseMocked } from '../services/firebase.js';
import { useAuthStore, needsProfile } from '../store/authStore.js';
import { motion } from 'framer-motion';
import { Heart, Sparkles, Shield, Compass, Eye, EyeOff, ArrowLeft } from 'lucide-react';

/**
 * Login Page
 * Purpose:
 * - Landing screen: Continue with Google (first visit or returning), or username and password
 *   for people who finished their profile.
 * - Routes users to profile completion (/complete-profile), partner linking (/pair-partner) or the
 *   dashboard (/) depending on how far along they are.
 * - Offers a Dev Bypass button only when Firebase is not configured (local mock mode).
 */
const inputCls =
  'w-full bg-surface-container border border-border-gray rounded-2xl px-4 py-3 text-sm text-on-surface outline-none transition-colors focus:border-primary placeholder:text-on-surface-variant/70';
const labelCls = 'block text-xs font-medium text-on-surface-variant mb-1.5 text-left';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { loginWithFirebaseUser, loginWithPassword, loginWithMock, isAuthenticated, user, error: storeError } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const [mode, setMode] = useState<'google' | 'password'>('google');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);

  // Auto-redirect once authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      if (needsProfile(user)) navigate('/complete-profile');
      else if (user.coupleId) navigate('/');
      else navigate('/pair-partner');
    }
  }, [isAuthenticated, user, navigate]);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setLocalError(null);

      // Trigger Firebase Google Auth popup
      const result = await signInWithPopup(auth, googleProvider);

      if (result.user) {
        // Send user credentials to backend server to sync Firestore
        await loginWithFirebaseUser(result.user);
      }
    } catch (err: any) {
      console.error('Firebase OAuth error:', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setLocalError(err.message || 'Authentication process failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setLocalError('Enter your username and password.');
      return;
    }
    setLoading(true);
    setLocalError(null);
    await loginWithPassword(username, password);
    setLoading(false);
  };

  const switchMode = (next: 'google' | 'password') => {
    setLocalError(null);
    useAuthStore.setState({ error: null });
    setMode(next);
  };

  const displayError = localError || storeError;

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-primary/30 blur-[90px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-60 h-60 rounded-full bg-primary/5 blur-[110px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="w-full max-w-md bg-surface-container border border-border-gray p-10 rounded-[28px] text-center space-y-8 relative"
      >
        {mode === 'password' && (
          <button
            type="button"
            onClick={() => switchMode('google')}
            className="absolute left-6 top-6 p-2 -m-2 text-on-surface-variant hover:text-primary transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}

        {/* Brand Logo Header */}
        <div className="space-y-3">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-on-background text-background mb-2">
            <Heart className="fill-current w-6 h-6" />
          </div>
          <h1 className="text-5xl font-serif tracking-tight text-on-surface">
            Our<span className="font-accent text-primary">space</span>
          </h1>
          <p className="text-on-surface-variant text-sm font-light leading-relaxed max-w-xs mx-auto">
            A private, secure, and intimate sanctuary designed exclusively for you and your partner.
          </p>
        </div>

        {mode === 'google' && (
          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-surface-container border border-border-gray/60">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span className="text-[10px] font-medium text-on-surface">100% Private</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-surface-container border border-border-gray/60">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-[10px] font-medium text-on-surface">Live Status</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-surface-container border border-border-gray/60">
              <Compass className="w-4 h-4 text-primary" />
              <span className="text-[10px] font-medium text-on-surface">Shared Log</span>
            </div>
          </div>
        )}

        {/* Alert Errors if any */}
        {displayError && (
          <div role="alert" className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl p-4 text-xs font-medium text-left">
            {displayError}
          </div>
        )}

        {mode === 'google' ? (
          <div className="space-y-4">
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-primary hover:brightness-105 text-on-primary font-medium rounded-full py-3.5 px-6 transition-all duration-300 active:scale-98 disabled:opacity-55 disabled:pointer-events-none cursor-pointer"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-on-primary" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Connecting...
                </span>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </button>

            {!isFirebaseMocked && (
              <>
                <div className="flex items-center gap-3 text-[11px] text-on-surface-variant">
                  <span className="flex-1 h-px bg-border-gray" /> or <span className="flex-1 h-px bg-border-gray" />
                </div>
                <button
                  type="button"
                  onClick={() => switchMode('password')}
                  className="w-full flex items-center justify-center border border-border-gray text-on-surface hover:border-primary hover:text-primary font-medium rounded-full py-3 px-6 transition-all duration-300 cursor-pointer text-sm"
                >
                  Sign in with username
                </button>
              </>
            )}

            {/* Dev Mode Bypass Button: only when Firebase isn't configured */}
            {isFirebaseMocked && (
              <button
                type="button"
                onClick={loginWithMock}
                className="w-full flex items-center justify-center gap-2 border border-border-gray text-on-surface hover:border-primary hover:text-primary font-medium rounded-full py-2.5 px-6 transition-all duration-300 cursor-pointer text-xs"
              >
                <span>Bypass Login (Dev Mode)</span>
              </button>
            )}

            <p className="text-[11px] text-on-surface-variant">
              New here? Continue with Google and we&rsquo;ll set up your username next.
            </p>
          </div>
        ) : (
          <form onSubmit={handlePasswordLogin} className="space-y-4 text-left" noValidate>
            <div className="text-center">
              <h2 className="font-serif text-2xl">Welcome back</h2>
              <p className="text-sm text-on-surface-variant mt-1">Sign in with your username and password.</p>
            </div>
            <div>
              <label htmlFor="lu" className={labelCls}>Username</label>
              <input
                id="lu"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoCapitalize="none"
                className={inputCls}
                placeholder="yourname"
              />
            </div>
            <div>
              <label htmlFor="lp" className={labelCls}>Password</label>
              <div className="relative">
                <input
                  id="lp"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className={`${inputCls} pr-11`}
                  placeholder="Your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary"
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full btn-orange disabled:opacity-55 disabled:pointer-events-none">
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
            <p className="text-[11px] text-on-surface-variant text-center">
              Forgot your password? You can always sign in with Google.
            </p>
            <button
              type="button"
              onClick={() => switchMode('google')}
              className="block mx-auto text-xs text-on-surface-variant hover:text-primary underline"
            >
              Use Google instead
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
};

export default Login;
