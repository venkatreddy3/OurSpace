import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, needsProfile } from '../store/authStore.js';
import { motion } from 'framer-motion';
import { Copy, Check, ArrowRight, HeartHandshake } from 'lucide-react';

/**
 * PairPartner Page
 * Purpose:
 * - Links two users using 6-character unique invite codes.
 * - Displays active user's copyable invite code.
 * - Submits partner's invite code to server.
 * - Monitors firestore changes to automatically redirect when pairing is completed.
 */
const PairPartner: React.FC = () => {
  const navigate = useNavigate();
  const { user, pairWithPartner, isPairingLoading, error, checkAuth } = useAuthStore();
  const [partnerCode, setPartnerCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Subscribe to auth state updates on mount
  useEffect(() => {
    const unsubscribe = checkAuth();
    return () => {
      unsubscribe();
    };
  }, [checkAuth]);

  // The invite code only exists once the profile is complete
  useEffect(() => {
    if (needsProfile(user)) navigate('/complete-profile');
  }, [user, navigate]);

  // Redirect to dashboard immediately when user gets linked with a coupleId
  useEffect(() => {
    if (user?.coupleId) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleCopyCode = () => {
    if (!user?.inviteCode) return;
    navigator.clipboard.writeText(user.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePairSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    const cleanedCode = partnerCode.trim().toUpperCase();

    if (!cleanedCode) {
      setLocalError('Please enter an invite code.');
      return;
    }
    if (cleanedCode.length !== 6) {
      setLocalError('Invite codes must be exactly 6 characters.');
      return;
    }
    if (cleanedCode === user?.inviteCode) {
      setLocalError('You cannot pair with your own invite code.');
      return;
    }

    const success = await pairWithPartner(cleanedCode);
    if (success) {
      navigate('/');
    }
  };

  const activeError = localError || error;

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-primary/5 blur-[90px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-lg bg-surface-container border border-border-gray p-8 rounded-3xl space-y-8 shadow-xl"
      >
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 border border-primary/20 text-primary mb-2">
            <HeartHandshake className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold font-serif text-on-surface">Connect with your Partner</h2>
          <p className="text-on-surface-variant text-sm max-w-xs mx-auto">
            Share your unique pairing code with your partner, or enter theirs below.
          </p>
        </div>

        {/* Display Error Message */}
        {activeError && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl p-4 text-xs font-medium text-left">
            {activeError}
          </div>
        )}

        {/* Step 1: Copy Your Code */}
        <div className="space-y-3 bg-surface-container border border-border-gray p-5 rounded-2xl">
          <label className="block text-xs font-bold text-primary uppercase tracking-widest">
            Step 1: Your Invite Code
          </label>
          <div className="flex gap-2">
            <div className="flex-1 bg-surface-container border border-border-gray rounded-xl px-4 py-3 font-mono text-on-surface flex items-center justify-between">
              <span className="text-lg font-bold tracking-widest text-on-surface">{user?.inviteCode || 'GENERATING...'}</span>
              <button
                onClick={handleCopyCode}
                className="text-on-surface-variant hover:text-on-surface transition-colors p-1"
                title="Copy Invite Code"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <p className="text-[11px] text-on-surface-variant">
            Share this 6-character code. Once your partner inputs it, your private space will link.
          </p>
        </div>

        <div className="flex items-center justify-center gap-4 text-on-surface-variant text-xs font-semibold uppercase tracking-wider">
          <span className="h-px bg-zinc-850 flex-1" />
          <span>or</span>
          <span className="h-px bg-zinc-850 flex-1" />
        </div>

        {/* Step 2: Enter Partner Code */}
        <form onSubmit={handlePairSubmit} className="space-y-3 bg-surface-container border border-border-gray p-5 rounded-2xl">
          <label className="block text-xs font-bold text-primary uppercase tracking-widest">
            Step 2: Enter Partner's Code
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              maxLength={6}
              value={partnerCode}
              onChange={(e) => setPartnerCode(e.target.value)}
              placeholder="6-character code"
              className="flex-1 bg-surface-container border border-border-gray rounded-xl px-4 py-3 text-on-surface placeholder-on-surface-variant focus:outline-none focus:border-primary font-mono tracking-widest text-center uppercase"
              disabled={isPairingLoading}
            />
            <button
              type="submit"
              disabled={isPairingLoading}
              className="bg-primary hover:brightness-105 text-on-primary rounded-xl px-5 flex items-center justify-center transition-colors disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            >
              {isPairingLoading ? (
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
            </button>
          </div>
        </form>

        {/* Status Indicator */}
        <div className="text-center pt-2">
          <div className="inline-flex items-center gap-2 text-xs text-on-surface-variant font-medium">
            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-ping" />
            <span>Waiting for connection...</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PairPartner;
