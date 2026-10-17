import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Eye, EyeOff, KeyRound, Loader2, User as UserIcon } from 'lucide-react';
import { useAuthStore } from '../store/authStore.js';
import { isFirebaseMocked } from '../services/firebase.js';
import { profileService, passwordStrength, MIN_PASSWORD } from '../services/profile.service.js';

/**
 * Settings Page
 * Purpose:
 * - Shows the signed-in person's account details.
 * - Lets them change their password. They prove it's them with the current password, or, if they
 *   forgot it, by signing in with Google again.
 */

const inputCls =
  'w-full bg-surface-container border border-border-gray rounded-2xl px-4 py-3 text-sm text-on-surface outline-none transition-colors focus:border-primary placeholder:text-on-surface-variant/70';
const labelCls = 'block text-xs font-medium text-on-surface-variant mb-1.5 text-left';

const Settings: React.FC = () => {
  const { user } = useAuthStore();
  const isMock = isFirebaseMocked || import.meta.env.VITE_ENABLE_MOCK_AUTH === 'true';

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const strength = passwordStrength(newPassword);

  const newPasswordError =
    newPassword.length < MIN_PASSWORD ? `New password needs at least ${MIN_PASSWORD} characters.`
    : newPassword !== confirm ? 'The new passwords don’t match.'
    : null;

  const submit = async (verifyWith: 'password' | 'google') => {
    setDone(false);
    if (verifyWith === 'password' && !currentPassword) return setError('Enter your current password.');
    if (newPasswordError) return setError(newPasswordError);
    if (verifyWith === 'password' && currentPassword === newPassword) return setError('Choose a password you haven’t used just now.');

    setBusy(true);
    setError(null);
    try {
      await profileService.changePassword(newPassword, verifyWith === 'google' ? 'google' : { currentPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirm('');
      setDone(true);
    } catch (err) {
      setError((err as Error).message || 'Could not change your password.');
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submit('password');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-8 max-w-2xl w-full mx-auto px-4 sm:px-6 py-8"
    >
      <header className="border-b border-primary/10 pb-6">
        <h1 className="text-3xl font-bold font-serif text-on-surface">Settings</h1>
        <p className="text-on-surface-variant mt-1">Your account and sign-in details.</p>
      </header>

      {/* Account */}
      <section className="rounded-2xl bg-surface-container border border-primary/10 p-6 space-y-4" aria-labelledby="account-heading">
        <h2 id="account-heading" className="flex items-center gap-2 font-serif text-xl text-on-surface">
          <UserIcon className="w-5 h-5 text-primary" /> Account
        </h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <dt className="text-xs text-on-surface-variant">Name</dt>
            <dd className="text-on-surface font-medium">{user?.displayName || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-on-surface-variant">Username</dt>
            <dd className="text-on-surface font-medium">{user?.username || '—'}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-on-surface-variant">Google email</dt>
            <dd className="text-on-surface font-medium break-all">{user?.email || '—'}</dd>
          </div>
        </dl>
      </section>

      {/* Change password */}
      <section className="rounded-2xl bg-surface-container border border-primary/10 p-6" aria-labelledby="password-heading">
        <h2 id="password-heading" className="flex items-center gap-2 font-serif text-xl text-on-surface">
          <KeyRound className="w-5 h-5 text-primary" /> Change password
        </h2>
        <p className="text-sm text-on-surface-variant mt-1">
          This is the password you use with your username. Signing in with Google isn&rsquo;t affected.
        </p>

        {isMock ? (
          <p className="mt-4 text-sm text-on-surface-variant bg-surface-container-high rounded-xl px-4 py-3">
            Passwords aren&rsquo;t used in local demo mode.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="mt-5 space-y-4" noValidate>
            {error && (
              <div role="alert" className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl px-4 py-3 text-xs font-medium">
                {error}
              </div>
            )}
            {done && (
              <div role="status" className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-2xl px-4 py-3 text-xs font-medium">
                <Check className="w-4 h-4" /> Your password has been changed.
              </div>
            )}

            <div>
              <label htmlFor="cur" className={labelCls}>Current password</label>
              <input
                id="cur"
                type={showPw ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                className={inputCls}
                placeholder="Your current password"
              />
            </div>

            <div>
              <label htmlFor="new" className={labelCls}>New password</label>
              <div className="relative">
                <input
                  id="new"
                  type={showPw ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  className={`${inputCls} pr-11`}
                  placeholder={`At least ${MIN_PASSWORD} characters`}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary"
                  aria-label={showPw ? 'Hide passwords' : 'Show passwords'}
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {newPassword && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 flex gap-1">
                    {[1, 2, 3, 4].map((n) => (
                      <span
                        key={n}
                        className={`h-1 flex-1 rounded-full ${newPassword.length >= MIN_PASSWORD && strength.n >= n ? (strength.n >= 3 ? 'bg-emerald-500' : 'bg-amber-400') : 'bg-border-gray'}`}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] text-on-surface-variant w-14 text-right">{strength.label}</span>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="conf" className={labelCls}>Confirm new password</label>
              <input
                id="conf"
                type={showPw ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                className={inputCls}
                placeholder="Type it again"
              />
            </div>

            <button type="submit" disabled={busy} className="w-full btn-orange disabled:opacity-55 disabled:pointer-events-none">
              {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving&hellip;</> : 'Change password'}
            </button>

            <p className="text-xs text-on-surface-variant text-center">
              Forgot your current password?{' '}
              <button
                type="button"
                disabled={busy}
                onClick={() => void submit('google')}
                className="text-primary font-medium hover:underline disabled:opacity-55"
              >
                Verify with Google instead
              </button>
            </p>
          </form>
        )}
      </section>
    </motion.div>
  );
};

export default Settings;
