import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore.js';
import AnniversaryDialog from './AnniversaryDialog';

const dismissKey = (coupleId: string) => `ourspace-anniversary-prompt-dismissed-${coupleId}`;

const wasDismissed = (coupleId: string): boolean => {
  try {
    return sessionStorage.getItem(dismissKey(coupleId)) === '1';
  } catch {
    return false;
  }
};

/**
 * AnniversaryPrompt
 * Asks the couple, once per visit, since when they are together, as long as no date is set yet.
 * It closes by itself when either partner saves a date. "Maybe later" hides it until the next visit;
 * the Love Clock, Home counter and Settings all offer another way to set it.
 */
const AnniversaryPrompt: React.FC = () => {
  const couple = useAuthStore((s) => s.couple);
  const [open, setOpen] = useState(false);

  const coupleId = couple?.id;
  const hasDate = Boolean(couple?.anniversaryDate);

  useEffect(() => {
    setOpen(Boolean(coupleId) && !hasDate && !wasDismissed(coupleId!));
  }, [coupleId, hasDate]);

  const close = () => {
    if (coupleId) {
      try {
        sessionStorage.setItem(dismissKey(coupleId), '1');
      } catch {
        /* storage unavailable: it just may ask again */
      }
    }
    setOpen(false);
  };

  return <AnniversaryDialog isOpen={open} onClose={close} />;
};

export default AnniversaryPrompt;
