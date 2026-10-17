import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Check, Eye, EyeOff, Heart, Loader2 } from 'lucide-react';
import { useAuthStore, needsProfile } from '../store/authStore.js';
import { auth } from '../services/firebase.js';
import {
  profileService,
  linkedUsername,
  ageFromDob,
  passwordStrength,
  USERNAME_RE,
  MIN_AGE,
  MAX_AGE,
  MIN_PASSWORD,
  type Gender,
} from '../services/profile.service.js';

/**
 * CompleteProfile Page
 * Shown after the first Google sign-in (and to older accounts that never filled it in).
 * Step 1: name, gender, date of birth. Step 2: username and password, so next time the person can
 * sign in with Google or with a username. The pairing code only appears once this is done.
 */

type Step = 'details' | 'credentials';

const GENDERS: { id: Gender; label: string }[] = [
  { id: 'female', label: 'Female' },
  { id: 'male', label: 'Male' },
  { id: 'nonbinary', label: 'Non-binary' },
  { id: 'private', label: 'Prefer not to say' },
];

const inputCls =
  'w-full bg-surface-container border border-border-gray rounded-2xl px-4 py-3 text-sm text-on-surface outline-none transition-colors focus:border-primary placeholder:text-on-surface-variant/70';
const labelCls = 'block text-xs font-medium text-on-surface-variant mb-1.5 text-left';

const ErrorBox: React.FC<{ message: string | null }> = ({ message }) =>
  message ? (
    <div role="alert" className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl px-4 py-3 text-xs font-medium text-left">
      {message}
    </div>
  ) : null;

const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const CompleteProfile: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading, isAuthenticated, checkAuth, completeProfile, logout } = useAuthStore();

  const [step, setStep] = useState<Step>('details');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [dob, setDob] = useState('');

  const lockedUsername = linkedUsername(auth?.currentUser ?? null);
  const [username, setUsername] = useState(lockedUsername ?? '');
  const [usernameState, setUsernameState] = useState<'idle' | 'checking' | 'free' | 'taken'>('idle');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);

  // Keep the auth state fresh when this page is opened directly
  useEffect(() => {
    const unsubscribe = checkAuth();
    return () => unsubscribe();
  }, [checkAuth]);

  // Prefill the name from the Google profile once it has loaded
  useEffect(() => {
    if (user && !name) setName(user.displayName === 'User' ? '' : user.displayName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Route people who don't belong here
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated || !user) navigate('/login');
    else if (!needsProfile(user)) navigate(user.coupleId ? '/' : '/pair-partner');
  }, [isLoading, isAuthenticated, user, navigate]);

  // Debounced username availability
  const usernameValid = USERNAME_RE.test(username);
  useEffect(() => {
    if (lockedUsername || !usernameValid) {
      setUsernameState('idle');
      return;
    }
    setUsernameState('checking');
    let stale = false;
    const t = setTimeout(async () => {
      try {
        const free = await profileService.checkUsername(username);
        if (!stale) setUsernameState(free ? 'free' : 'taken');
      } catch {
        if (!stale) setUsernameState('idle');
      }
    }, 400);
    return () => {
      stale = true;
      clearTimeout(t);
    };
  }, [username, usernameValid, lockedUsername]);

  const today = new Date();
  const maxDob = isoDate(new Date(today.getFullYear() - MIN_AGE, today.getMonth(), today.getDate()));
  const minDob = isoDate(new Date(today.getFullYear() - MAX_AGE, today.getMonth(), today.getDate()));

  const age = ageFromDob(dob);
  const detailsError =
    name.trim().length < 2 ? 'Please enter your name.'
    : !gender ? 'Please pick an option for gender.'
    : age === null ? 'Please enter your date of birth.'
    : age < MIN_AGE ? `You must be at least ${MIN_AGE} to use OurSpace.`
    : age > MAX_AGE ? 'Please enter a valid date of birth.'
    : null;

  const strength = passwordStrength(password);
  const credError =
    !usernameValid ? 'Username: 3 to 20 letters, numbers, dots or underscores.'
    : usernameState === 'taken' ? 'That username is taken.'
    : password.length < MIN_PASSWORD ? `Password needs at least ${MIN_PASSWORD} characters.`
    : password !== confirm ? 'Passwords don’t match.'
    : null;

  const submitDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (detailsError) return setError(detailsError);
    setError(null);
    setStep('credentials');
  };

  const submitCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (credError) return setError(credError);
    if (!gender) return;
    setBusy(true);
    setError(null);
    const ok = await completeProfile({ name: name.trim(), gender, dob, username, password });
    setBusy(false);
    if (!ok) {
      // The store keeps the message; show it here
      setError(useAuthStore.getState().error || 'We couldn’t save your profile. Please try again.');
      return;
    }
    navigate('/pair-partner');
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-on-surface-variant">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const stepIndex = step === 'details' ? 0 : 1;

  return (
    <div className="min-h-[80vh] w-full flex flex-col items-center justify-center relative overflow-hidden px-4 py-10">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-primary/25 blur-[90px] pointer-events-none" />

      <div className="w-full max-w-md bg-surface-container border border-border-gray p-8 sm:p-10 rounded-[28px] text-center relative">
        {step === 'credentials' && (
          <button
            type="button"
            onClick={() => { setError(null); setStep('details'); }}
            className="absolute left-6 top-6 p-2 -m-2 text-on-surface-variant hover:text-primary transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}

        <div className="space-y-3 mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-on-background text-background">
            <Heart className="fill-current w-6 h-6" />
          </div>
          <h1 className="text-4xl font-serif tracking-tight text-on-surface">
            Our<span className="font-accent text-primary">space</span>
          </h1>
        </div>

        <div className="flex items-center justify-center gap-2 mb-6" aria-label={`Step ${stepIndex + 1} of 2`}>
          {(['details', 'credentials'] as Step[]).map((s, i) => (
            <span
              key={s}
              className={`h-1.5 rounded-full transition-all ${i === stepIndex ? 'w-8 bg-primary' : i < stepIndex ? 'w-4 bg-primary/60' : 'w-4 bg-border-gray'}`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.22 }}
            className="space-y-5"
          >
            {step === 'details' && (
              <form onSubmit={submitDetails} className="space-y-4 text-left" noValidate>
                <div className="text-center">
                  <h2 className="font-serif text-2xl">Tell us about you</h2>
                  <p className="text-sm text-on-surface-variant mt-1">So your partner sees the real you.</p>
                </div>
                <ErrorBox message={error} />
                <div>
                  <label htmlFor="nm" className={labelCls}>Your name</label>
                  <input id="nm" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={60} className={inputCls} placeholder="Full name" />
                </div>
                <div>
                  <span className={labelCls}>Gender</span>
                  <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Gender">
                    {GENDERS.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        role="radio"
                        aria-checked={gender === g.id}
                        onClick={() => setGender(g.id)}
                        className={`rounded-2xl border px-3 py-2.5 text-sm transition-colors ${gender === g.id ? 'border-primary bg-primary-container text-on-primary-container font-medium' : 'border-border-gray bg-surface-container text-on-surface hover:border-primary'}`}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label htmlFor="dob" className={labelCls}>Date of birth</label>
                  <input id="dob" type="date" value={dob} min={minDob} max={maxDob} onChange={(e) => setDob(e.target.value)} autoComplete="bday" className={inputCls} />
                  <p className="text-[11px] text-on-surface-variant mt-1">You must be {MIN_AGE} or older. Your partner won&rsquo;t see this.</p>
                </div>
                <button type="submit" className="w-full btn-orange">Continue</button>
              </form>
            )}

            {step === 'credentials' && (
              <form onSubmit={submitCredentials} className="space-y-4 text-left" noValidate>
                <div className="text-center">
                  <h2 className="font-serif text-2xl">Create your login</h2>
                  <p className="text-sm text-on-surface-variant mt-1">Next time, sign in with Google or your username.</p>
                </div>
                <ErrorBox message={error} />
                <div>
                  <label htmlFor="un" className={labelCls}>Username</label>
                  <div className="relative">
                    <input
                      id="un"
                      value={username}
                      readOnly={!!lockedUsername}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                      autoComplete="username"
                      autoCapitalize="none"
                      maxLength={20}
                      className={`${inputCls} pr-10 ${lockedUsername ? 'opacity-80 cursor-not-allowed' : ''}`}
                      placeholder="letters, numbers, . or _"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2">
                      {usernameState === 'checking' && <Loader2 className="w-4 h-4 animate-spin text-on-surface-variant" />}
                      {(usernameState === 'free' || lockedUsername) && <Check className="w-4 h-4 text-emerald-500" />}
                    </span>
                  </div>
                  <p className={`text-[11px] mt-1 ${usernameState === 'taken' ? 'text-red-500' : usernameState === 'free' ? 'text-emerald-500' : 'text-on-surface-variant'}`}>
                    {lockedUsername
                      ? 'You picked this earlier. Set your password to finish.'
                      : usernameState === 'taken' ? 'That username is taken.'
                      : usernameState === 'free' ? 'Username is available.'
                      : '3 to 20 letters, numbers, dots or underscores.'}
                  </p>
                </div>
                <div>
                  <label htmlFor="pw" className={labelCls}>Password</label>
                  <div className="relative">
                    <input id="pw" type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" className={`${inputCls} pr-11`} placeholder={`At least ${MIN_PASSWORD} characters`} />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary" aria-label={showPw ? 'Hide password' : 'Show password'}>
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {password && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 flex gap-1">
                        {[1, 2, 3, 4].map((n) => (
                          <span key={n} className={`h-1 flex-1 rounded-full ${password.length >= MIN_PASSWORD && strength.n >= n ? (strength.n >= 3 ? 'bg-emerald-500' : 'bg-amber-400') : 'bg-border-gray'}`} />
                        ))}
                      </div>
                      <span className="text-[11px] text-on-surface-variant w-14 text-right">{strength.label}</span>
                    </div>
                  )}
                </div>
                <div>
                  <label htmlFor="cf" className={labelCls}>Confirm password</label>
                  <input id="cf" type={showPw ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" className={inputCls} placeholder="Type it again" />
                </div>
                <button type="submit" disabled={busy} className="w-full btn-orange disabled:opacity-55 disabled:pointer-events-none">
                  {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving&hellip;</> : 'Finish'}
                </button>
              </form>
            )}
          </motion.div>
        </AnimatePresence>

        <button type="button" onClick={() => void logout().then(() => navigate('/login'))} className="mt-6 text-xs text-on-surface-variant hover:text-primary underline">
          Sign out
        </button>
      </div>
    </div>
  );
};

export default CompleteProfile;
