import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Check, Eye, EyeOff, Heart, Loader2, Mail, ShieldCheck } from 'lucide-react';
import type { AuthServices, Gender, GoogleProfile, SessionUser } from './types';

/**
 * LoginPage: the whole sign-in / sign-up flow.
 * Presentational: no router, stores or Firebase. Everything external comes through `services`,
 * so it can be designed on its own and dropped into the main app unchanged.
 *
 * Flow:
 *  welcome ─ Google ─► details ─► verify email ─► username + password ─► done
 *          └ username + password (returning users) ─► done
 */
export interface LoginPageProps {
  services: AuthServices;
  /** Called once the person is signed in (new or returning) */
  onComplete: (user: SessionUser) => void;
  /** Optional dev-only shortcut button */
  onBypass?: () => void;
  /** Dev hint shown on the verify step (e.g. the mock code) */
  devHint?: string;
}

type Step = 'welcome' | 'password-login' | 'details' | 'verify' | 'credentials' | 'done';
const SIGNUP_STEPS: Step[] = ['details', 'verify', 'credentials'];

const GENDERS: { id: Gender; label: string }[] = [
  { id: 'female', label: 'Female' },
  { id: 'male', label: 'Male' },
  { id: 'nonbinary', label: 'Non-binary' },
  { id: 'private', label: 'Prefer not to say' },
];

const inputCls =
  'w-full bg-surface-container border border-border-gray rounded-2xl px-4 py-3 text-sm text-on-surface outline-none transition-colors focus:border-primary placeholder:text-on-surface-variant/70';
const labelCls = 'block text-xs font-medium text-on-surface-variant mb-1.5 text-left';

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
  </svg>
);

const Spinner = () => <Loader2 className="w-4 h-4 animate-spin" />;

const ErrorBox: React.FC<{ message: string | null }> = ({ message }) =>
  message ? (
    <div role="alert" className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl px-4 py-3 text-xs font-medium text-left">
      {message}
    </div>
  ) : null;

/** Password strength 0..4 with a short label */
const strengthOf = (pw: string) => {
  let n = 0;
  if (pw.length >= 8) n++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) n++;
  if (/\d/.test(pw)) n++;
  if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 14) n++;
  return { n, label: ['Too short', 'Weak', 'Okay', 'Good', 'Strong'][pw.length < 8 ? 0 : n] };
};

/* ------------------------------------------------------------------------ */
/* 6-digit code input                                                       */
/* ------------------------------------------------------------------------ */
const CodeInput: React.FC<{ value: string; onChange: (v: string) => void; disabled?: boolean }> = ({ value, onChange, disabled }) => {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? '');

  const setAt = (i: number, d: string) => {
    const next = digits.slice();
    next[i] = d;
    onChange(next.join(''));
  };

  return (
    <div className="flex justify-center gap-2" role="group" aria-label="Verification code">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          value={d}
          disabled={disabled}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          aria-label={`Digit ${i + 1}`}
          onChange={(e) => {
            const c = e.target.value.replace(/\D/g, '').slice(-1);
            setAt(i, c);
            if (c && i < 5) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus();
            if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus();
            if (e.key === 'ArrowRight' && i < 5) refs.current[i + 1]?.focus();
          }}
          onPaste={(e) => {
            const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
            if (!p) return;
            e.preventDefault();
            onChange(p);
            refs.current[Math.min(p.length, 5)]?.focus();
          }}
          className="w-11 h-14 text-center text-xl font-semibold rounded-2xl bg-surface-container border border-border-gray text-on-surface outline-none focus:border-primary transition-colors disabled:opacity-50"
        />
      ))}
    </div>
  );
};

/* ------------------------------------------------------------------------ */
/* Main component                                                           */
/* ------------------------------------------------------------------------ */
const LoginPage: React.FC<LoginPageProps> = ({ services, onComplete, onBypass, devHint }) => {
  const [step, setStep] = useState<Step>('welcome');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Google profile + details
  const [google, setGoogle] = useState<GoogleProfile | null>(null);
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [age, setAge] = useState('');
  const [phone, setPhone] = useState('');

  // Email verification
  const [code, setCode] = useState('');
  const [cooldown, setCooldown] = useState(0);

  // Credentials
  const [username, setUsername] = useState('');
  const [usernameState, setUsernameState] = useState<'idle' | 'checking' | 'free' | 'taken'>('idle');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);

  // Returning-user login
  const [loginUser, setLoginUser] = useState('');
  const [loginPw, setLoginPw] = useState('');

  const [finished, setFinished] = useState<SessionUser | null>(null);

  const go = (s: Step) => { setError(null); setStep(s); };

  // Resend countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Username availability (debounced)
  const usernameValid = /^[a-z0-9_.]{3,20}$/.test(username);
  useEffect(() => {
    if (!usernameValid) { setUsernameState('idle'); return; }
    setUsernameState('checking');
    let stale = false;
    const t = setTimeout(async () => {
      const free = await services.checkUsername(username);
      if (!stale) setUsernameState(free ? 'free' : 'taken');
    }, 400);
    return () => { stale = true; clearTimeout(t); };
  }, [username, usernameValid, services]);

  // Auto-submit the code when all 6 digits are in
  useEffect(() => {
    if (step === 'verify' && code.length === 6 && !busy) void submitCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, step]);

  const run = async (fn: () => Promise<void>, fallback: string) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : fallback);
    } finally {
      setBusy(false);
    }
  };

  const finish = (user: SessionUser) => {
    setFinished(user);
    setStep('done');
    setTimeout(() => onComplete(user), 1600);
  };

  /* ---- actions ---- */
  const googleSignIn = () =>
    run(async () => {
      const { profile, existing } = await services.googleSignIn();
      if (existing) return finish(existing);
      setGoogle(profile);
      setName(profile.name);
      setStep('details');
    }, 'Google sign-in didn’t work. Please try again.');

  const ageNum = Number(age);
  const phoneDigits = phone.replace(/[^\d]/g, '');
  const detailsError =
    name.trim().length < 2 ? 'Please enter your name.'
    : !gender ? 'Please pick an option for gender.'
    : !Number.isInteger(ageNum) || ageNum < 16 || ageNum > 120 ? 'Age must be between 16 and 120.'
    : phone && (phoneDigits.length < 7 || phoneDigits.length > 15) ? 'That phone number doesn’t look right.'
    : null;

  const submitDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (detailsError) return setError(detailsError);
    if (!google) return;
    void run(async () => {
      await services.sendCode(google.email);
      setCode('');
      setCooldown(30);
      setStep('verify');
    }, 'We couldn’t send the code. Please try again.');
  };

  const resend = () =>
    google && run(async () => {
      await services.sendCode(google.email);
      setCode('');
      setCooldown(30);
    }, 'We couldn’t resend the code.');

  async function submitCode() {
    if (!google) return;
    setBusy(true);
    setError(null);
    try {
      const ok = await services.verifyCode(google.email, code);
      if (ok) setStep('credentials');
      else { setError('That code isn’t right. Check your email and try again.'); setCode(''); }
    } catch {
      setError('Couldn’t verify the code. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const strength = strengthOf(password);
  const credError =
    !usernameValid ? 'Username: 3-20 letters, numbers, dots or underscores.'
    : usernameState === 'taken' ? 'That username is taken.'
    : password.length < 8 ? 'Password needs at least 8 characters.'
    : password !== confirm ? 'Passwords don’t match.'
    : null;

  const submitCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    if (credError) return setError(credError);
    if (!google || !gender) return;
    void run(async () => {
      const user = await services.createAccount({
        name: name.trim(), gender, age: ageNum, phone: phone.trim(), email: google.email, username, password,
      });
      finish(user);
    }, 'We couldn’t create your account. Please try again.');
  };

  const submitPasswordLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUser.trim() || !loginPw) return setError('Enter your username and password.');
    void run(async () => finish(await services.loginWithPassword(loginUser.trim().toLowerCase(), loginPw)), 'Couldn’t sign you in.');
  };

  const signupIndex = SIGNUP_STEPS.indexOf(step);
  const back = (to: Step) => (
    <button type="button" onClick={() => go(to)} className="absolute left-6 top-6 p-2 -m-2 text-on-surface-variant hover:text-primary transition-colors" aria-label="Back">
      <ArrowLeft className="w-5 h-5" />
    </button>
  );

  const primaryBtn = 'w-full btn-orange disabled:opacity-55 disabled:pointer-events-none';

  return (
    <div className="min-h-[80vh] w-full flex flex-col items-center justify-center relative overflow-hidden px-4 py-10">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-primary/25 blur-[90px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-60 h-60 rounded-full bg-primary/5 blur-[110px] pointer-events-none" />

      <div className="w-full max-w-md bg-surface-container border border-border-gray p-8 sm:p-10 rounded-[28px] text-center relative">
        {step === 'password-login' && back('welcome')}
        {step === 'details' && back('welcome')}
        {step === 'verify' && back('details')}
        {step === 'credentials' && back('verify')}

        {/* Brand */}
        <div className="space-y-3 mb-7">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-on-background text-background">
            <Heart className="fill-current w-6 h-6" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-serif tracking-tight text-on-surface">
            Our<span className="font-accent text-primary">space</span>
          </h1>
        </div>

        {/* Progress (sign-up only) */}
        {signupIndex >= 0 && (
          <div className="flex items-center justify-center gap-2 mb-6" aria-label={`Step ${signupIndex + 1} of 3`}>
            {SIGNUP_STEPS.map((s, i) => (
              <span key={s} className={`h-1.5 rounded-full transition-all ${i === signupIndex ? 'w-8 bg-primary' : i < signupIndex ? 'w-4 bg-primary/60' : 'w-4 bg-border-gray'}`} />
            ))}
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.22 }}
            className="space-y-5"
          >
            {/* ------------------------------ welcome ------------------------------ */}
            {step === 'welcome' && (
              <>
                <p className="text-on-surface-variant text-sm leading-relaxed max-w-xs mx-auto">
                  A private, secure, and intimate sanctuary designed exclusively for you and your partner.
                </p>
                <ErrorBox message={error} />
                <button onClick={googleSignIn} disabled={busy} className={`${primaryBtn} gap-3`}>
                  {busy ? <><Spinner /> Connecting&hellip;</> : <><span className="bg-white rounded-full p-1 flex"><GoogleIcon /></span> Continue with Google</>}
                </button>
                <div className="flex items-center gap-3 text-[11px] text-on-surface-variant">
                  <span className="flex-1 h-px bg-border-gray" /> or <span className="flex-1 h-px bg-border-gray" />
                </div>
                <button onClick={() => go('password-login')} className="w-full btn-outline-blue text-sm">
                  Sign in with username
                </button>
                {onBypass && (
                  <button type="button" onClick={onBypass} className="text-xs text-on-surface-variant hover:text-primary underline">
                    Bypass Login (Dev Mode)
                  </button>
                )}
                <p className="text-[11px] text-on-surface-variant">By signing in, you agree to our private shared space policies.</p>
              </>
            )}

            {/* --------------------------- password login --------------------------- */}
            {step === 'password-login' && (
              <form onSubmit={submitPasswordLogin} className="space-y-4">
                <div>
                  <h2 className="font-serif text-2xl">Welcome back</h2>
                  <p className="text-sm text-on-surface-variant mt-1">Sign in with your username and password.</p>
                </div>
                <ErrorBox message={error} />
                <div>
                  <label htmlFor="lu" className={labelCls}>Username</label>
                  <input id="lu" value={loginUser} onChange={(e) => setLoginUser(e.target.value)} autoComplete="username" autoCapitalize="none" className={inputCls} placeholder="yourname" />
                </div>
                <div>
                  <label htmlFor="lp" className={labelCls}>Password</label>
                  <div className="relative">
                    <input id="lp" type={showPw ? 'text' : 'password'} value={loginPw} onChange={(e) => setLoginPw(e.target.value)} autoComplete="current-password" className={`${inputCls} pr-11`} placeholder="Your password" />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary" aria-label={showPw ? 'Hide password' : 'Show password'}>
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={busy} className={primaryBtn}>{busy ? <><Spinner /> Signing in&hellip;</> : 'Sign in'}</button>
                <button type="button" onClick={googleSignIn} disabled={busy} className="text-xs text-on-surface-variant hover:text-primary underline">
                  Use Google instead
                </button>
              </form>
            )}

            {/* ------------------------------ details ------------------------------ */}
            {step === 'details' && google && (
              <form onSubmit={submitDetails} className="space-y-4 text-left" noValidate>
                <div className="text-center">
                  <h2 className="font-serif text-2xl">Tell us about you</h2>
                  <p className="text-sm text-on-surface-variant mt-1">So your partner sees the real you.</p>
                </div>
                <ErrorBox message={error} />
                <div>
                  <label htmlFor="nm" className={labelCls}>Your name</label>
                  <input id="nm" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className={inputCls} placeholder="Full name" />
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
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1">
                    <label htmlFor="ag" className={labelCls}>Age</label>
                    <input id="ag" type="number" inputMode="numeric" min={16} max={120} value={age} onChange={(e) => setAge(e.target.value)} className={inputCls} placeholder="25" />
                  </div>
                  <div className="col-span-2">
                    <label htmlFor="ph" className={labelCls}>Phone <span className="opacity-60">(optional)</span></label>
                    <input id="ph" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" className={inputCls} placeholder="+1 555 123 4567" />
                  </div>
                </div>
                <div>
                  <label htmlFor="em" className={labelCls}>Email (from Google)</label>
                  <div className="relative">
                    <input id="em" value={google.email} readOnly className={`${inputCls} pr-10 opacity-80 cursor-not-allowed`} />
                    <Check className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                  </div>
                </div>
                <button type="submit" disabled={busy} className={primaryBtn}>{busy ? <><Spinner /> Sending code&hellip;</> : 'Continue'}</button>
              </form>
            )}

            {/* ------------------------------- verify ------------------------------- */}
            {step === 'verify' && google && (
              <div className="space-y-5">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-primary-container text-on-primary-container flex items-center justify-center">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-serif text-2xl">Check your email</h2>
                  <p className="text-sm text-on-surface-variant mt-1">
                    We sent a 6-digit code to <span className="font-medium text-on-surface break-all">{google.email}</span>.
                  </p>
                </div>
                <ErrorBox message={error} />
                <CodeInput value={code} onChange={setCode} disabled={busy} />
                {devHint && <p className="text-[11px] text-on-surface-variant bg-surface-container-high rounded-xl px-3 py-2">Dev: {devHint}</p>}
                <button onClick={submitCode} disabled={busy || code.length < 6} className={primaryBtn}>
                  {busy ? <><Spinner /> Verifying&hellip;</> : 'Verify email'}
                </button>
                <p className="text-xs text-on-surface-variant">
                  Didn&rsquo;t get it?{' '}
                  {cooldown > 0 ? (
                    <span>Resend in {cooldown}s</span>
                  ) : (
                    <button onClick={resend} disabled={busy} className="text-primary font-medium hover:underline">Resend code</button>
                  )}
                </p>
              </div>
            )}

            {/* ----------------------------- credentials ----------------------------- */}
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
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                      autoComplete="username"
                      autoCapitalize="none"
                      maxLength={20}
                      className={`${inputCls} pr-10`}
                      placeholder="letters, numbers, . or _"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2">
                      {usernameState === 'checking' && <Loader2 className="w-4 h-4 animate-spin text-on-surface-variant" />}
                      {usernameState === 'free' && <Check className="w-4 h-4 text-emerald-500" />}
                    </span>
                  </div>
                  <p className={`text-[11px] mt-1 ${usernameState === 'taken' ? 'text-red-500' : usernameState === 'free' ? 'text-emerald-500' : 'text-on-surface-variant'}`}>
                    {usernameState === 'taken' ? 'That username is taken.' : usernameState === 'free' ? 'Username is available.' : '3-20 characters.'}
                  </p>
                </div>
                <div>
                  <label htmlFor="pw" className={labelCls}>Password</label>
                  <div className="relative">
                    <input id="pw" type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" className={`${inputCls} pr-11`} placeholder="At least 8 characters" />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary" aria-label={showPw ? 'Hide password' : 'Show password'}>
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {password && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 flex gap-1">
                        {[1, 2, 3, 4].map((n) => (
                          <span key={n} className={`h-1 flex-1 rounded-full ${password.length >= 8 && strength.n >= n ? (strength.n >= 3 ? 'bg-emerald-500' : 'bg-amber-400') : 'bg-border-gray'}`} />
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
                <button type="submit" disabled={busy} className={primaryBtn}>{busy ? <><Spinner /> Creating account&hellip;</> : 'Create account'}</button>
              </form>
            )}

            {/* -------------------------------- done -------------------------------- */}
            {step === 'done' && finished && (
              <div className="space-y-4 py-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 14 }}
                  className="w-16 h-16 mx-auto rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center"
                >
                  <ShieldCheck className="w-8 h-8" />
                </motion.div>
                <div>
                  <h2 className="font-serif text-2xl">You&rsquo;re in, {finished.name.split(' ')[0]}!</h2>
                  <p className="text-sm text-on-surface-variant mt-1">Taking you to your space&hellip;</p>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default LoginPage;
