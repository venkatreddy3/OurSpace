import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Loader2 } from 'lucide-react';
import Dialog from '../ui/Dialog';
import { useAuthStore } from '../../store/authStore.js';
import { coupleService, todayLocalIso } from '../../services/couple.service.js';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * AnniversaryDialog
 * Asks since when the couple has been together. Saving it starts the Love Clock and the Home counter.
 * Also used to change the date later.
 */
const AnniversaryDialog: React.FC<Props> = ({ isOpen, onClose }) => {
  const { couple, partner } = useAuthStore();
  const [date, setDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Start from the saved date when there is one
  useEffect(() => {
    if (isOpen) {
      setDate(couple?.anniversaryDate?.split('T')[0] ?? '');
      setError(null);
    }
  }, [isOpen, couple?.anniversaryDate]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await coupleService.setAnniversary(date);
      onClose();
    } catch (err) {
      setError((err as Error).message || 'Could not save the date. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const hasDate = Boolean(couple?.anniversaryDate);

  // Portal to <body> so the sidebar's stacking context or transforms can't clip or cover the dialog
  return createPortal(
    <Dialog isOpen={isOpen} onClose={onClose} title={hasDate ? 'Change your date' : 'When did your story begin?'}>
      <form onSubmit={save} className="space-y-4">
        <p className="text-sm text-on-surface-variant">
          {hasDate
            ? 'Pick the day you and your partner got together.'
            : `Pick the day you and ${partner?.displayName || 'your partner'} got together and we'll start counting from there.`}
        </p>
        <div>
          <label htmlFor="together-since" className="block text-xs font-medium text-on-surface-variant mb-1.5">
            Together since
          </label>
          <input
            id="together-since"
            type="date"
            value={date}
            max={todayLocalIso()}
            min="1950-01-01"
            onChange={(e) => setDate(e.target.value)}
            required
            className="w-full bg-surface-container border border-border-gray rounded-2xl px-4 py-3 text-sm text-on-surface outline-none transition-colors focus:border-primary dark:[color-scheme:dark]"
          />
        </div>
        {error && (
          <div role="alert" className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl px-4 py-3 text-xs font-medium">
            {error}
          </div>
        )}
        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-full text-sm text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
          >
            {hasDate ? 'Cancel' : 'Maybe later'}
          </button>
          <button
            type="submit"
            disabled={busy || !date}
            className="btn-orange disabled:opacity-55 disabled:pointer-events-none"
          >
            {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving&hellip;</> : <><Check className="w-4 h-4" /> Start counting</>}
          </button>
        </div>
      </form>
    </Dialog>,
    document.body
  );
};

export default AnniversaryDialog;
