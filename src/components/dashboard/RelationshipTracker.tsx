import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Edit2, X, Check, Calendar } from 'lucide-react';
import { useAuthStore } from '../../store/authStore.js';
import { db, isFirebaseMocked } from '../../services/firebase.js';
import { doc, updateDoc } from 'firebase/firestore';

// Helper to calculate exact elapsed time
const getElapsed = (start: Date, end: Date) => {
  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();
  let hours = end.getHours() - start.getHours();
  let minutes = end.getMinutes() - start.getMinutes();
  let seconds = end.getSeconds() - start.getSeconds();

  if (seconds < 0) {
    seconds += 60;
    minutes--;
  }
  if (minutes < 0) {
    minutes += 60;
    hours--;
  }
  if (hours < 0) {
    hours += 24;
    days--;
  }
  if (days < 0) {
    const prevMonthEnd = new Date(end.getFullYear(), end.getMonth(), 0);
    days += prevMonthEnd.getDate();
    months--;
  }
  if (months < 0) {
    months += 12;
    years--;
  }

  return { years, months, days, hours, minutes, seconds };
};

const RelationshipTracker: React.FC = () => {
  const { couple } = useAuthStore();
  const [elapsed, setElapsed] = useState({ years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isEditing, setIsEditing] = useState(false);
  const [dateInput, setDateInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Retrieve date or default to '2025-09-01'
  const anniversaryStr = couple?.anniversaryDate || '2025-09-01';

  useEffect(() => {
    const startDate = new Date(anniversaryStr);
    
    // Immediate calculation
    setElapsed(getElapsed(startDate, new Date()));

    const timer = setInterval(() => {
      setElapsed(getElapsed(startDate, new Date()));
    }, 1000);

    return () => clearInterval(timer);
  }, [anniversaryStr]);

  const handleEditOpen = () => {
    setDateInput(anniversaryStr.split('T')[0]);
    setError(null);
    setIsEditing(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dateInput) return;
    setIsSaving(true);
    setError(null);

    const isMock = isFirebaseMocked || import.meta.env.VITE_ENABLE_MOCK_AUTH === 'true';

    try {
      const selectedDate = new Date(dateInput);
      if (isNaN(selectedDate.getTime())) {
        throw new Error('Invalid date selected.');
      }

      if (selectedDate > new Date()) {
        throw new Error('Anniversary date cannot be in the future.');
      }

      const coupleId = couple?.id || 'mock-couple-123';

      if (isMock) {
        // Mock storage update
        const cachedSession = localStorage.getItem('ourspace-mock-session');
        if (cachedSession) {
          const parsed = JSON.parse(cachedSession);
          parsed.couple = {
            ...parsed.couple,
            anniversaryDate: dateInput,
          };
          localStorage.setItem('ourspace-mock-session', JSON.stringify(parsed));
        }
        
        // Update local store state dynamically
        useAuthStore.setState({
          couple: {
            ...couple!,
            anniversaryDate: dateInput,
          }
        });
      } else {
        // Firebase database update
        const coupleRef = doc(db, 'couples', coupleId);
        await updateDoc(coupleRef, {
          anniversaryDate: dateInput,
        });

        // Sync local store
        useAuthStore.setState({
          couple: {
            ...couple!,
            anniversaryDate: dateInput,
          }
        });
      }

      setIsEditing(false);
    } catch (err: any) {
      console.error('Failed to update anniversary:', err);
      setError(err.message || 'Failed to update anniversary date.');
    } finally {
      setIsSaving(false);
    }
  };

  const formattedAnniversary = new Date(anniversaryStr).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <>
      <div 
        className="bg-surface-container border border-primary/20 rounded-2xl p-4 shadow-lg relative overflow-hidden group select-none max-w-[280px] w-full"
      >
        {/* Subtle glowing heart outline underlay */}
        <div 
          className="absolute -right-6 -bottom-6 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-700 text-primary"
        >
          <Heart className="w-28 h-28 fill-current" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-2 relative z-10">
          <div className="flex items-center gap-1.5">
            <Heart className="w-4 h-4 fill-primary text-primary animate-pulse shadow-[0_0_8px_rgba(255,42,133,0.4)]" />
            <span className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant font-mono">
              Together For
            </span>
          </div>

          <button
            onClick={handleEditOpen}
            className="p-1 rounded-full hover:bg-surface-container-high/60 border border-transparent hover:border-border-gray/50 text-on-surface-variant hover:text-on-surface transition-all cursor-pointer"
            title="Edit Anniversary Date"
          >
            <Edit2 className="w-3 h-3" />
          </button>
        </div>

        {/* Big Counter Display */}
        <div className="space-y-0.5 relative z-10">
          <div className="text-base font-bold tracking-tight text-on-surface flex flex-wrap items-center gap-x-1 gap-y-0.5">
            {elapsed.years > 0 && (
              <span>
                {elapsed.years}y
              </span>
            )}
            {elapsed.years > 0 && (elapsed.months > 0 || elapsed.days > 0) && (
              <span className="text-on-surface-variant">•</span>
            )}
            {elapsed.months > 0 && (
              <span>
                {elapsed.months}m
              </span>
            )}
            {(elapsed.years > 0 || elapsed.months > 0) && elapsed.days > 0 && (
              <span className="text-on-surface-variant">•</span>
            )}
            <span>
              {elapsed.days}d
            </span>
          </div>

          {/* Running Clock Subtext */}
          <div className="text-[10px] font-mono text-primary/80 tracking-wider">
            {elapsed.hours.toString().padStart(2, '0')}h : {elapsed.minutes.toString().padStart(2, '0')}m : {elapsed.seconds.toString().padStart(2, '0')}s
          </div>
        </div>

        {/* Footer date */}
        <div className="mt-3 pt-2 border-t border-border-gray/40 text-[9px] text-zinc-550 font-mono tracking-wide relative z-10">
          Since {formattedAnniversary}
        </div>
      </div>

      {/* Edit Date Modal */}
      <AnimatePresence>
        {isEditing && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4 cursor-default"
              onClick={() => setIsEditing(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                className="bg-surface-container border border-primary/20 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold tracking-wider uppercase font-mono text-on-surface flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-primary" />
                    Set Start Date
                  </h3>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="p-1 rounded-full text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSave} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold tracking-widest uppercase font-mono text-on-surface-variant mb-1.5">
                      Relationship Anniversary
                    </label>
                    <input
                      type="date"
                      value={dateInput}
                      onChange={(e) => setDateInput(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full bg-surface-container border border-primary/10 focus:border-primary/40 rounded-xl px-3.5 py-2.5 text-xs text-on-surface outline-none transition-all color-scheme-dark"
                      style={{ colorScheme: 'dark' }}
                      required
                    />
                  </div>

                  {error && (
                    <div className="text-[10px] text-red-500 font-mono">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary disabled:bg-primary/40 text-white font-bold text-xs tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSaving ? (
                      'Saving...'
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" /> Save Changes
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default RelationshipTracker;
