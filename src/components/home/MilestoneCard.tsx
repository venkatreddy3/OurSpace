import React, { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { CalendarHeart, Gift, PartyPopper } from 'lucide-react';
import { useCountUp } from '../../hooks/useCountUp.js';

const MILESTONES = [7, 14, 30, 50, 100, 150, 200, 250, 300, 365, 500, 600, 730, 1000, 1095, 1461, 1500, 1826, 2000, 2500, 3000];
const DAY_MS = 86_400_000;

/** The milestone just passed and the next one (yearly once the list runs out) */
export const milestoneAround = (days: number): { previous: number; next: number } => {
  const next = MILESTONES.find((m) => m > days);
  if (next !== undefined) {
    const previous = [...MILESTONES].reverse().find((m) => m <= days) ?? 0;
    return { previous, next };
  }
  const previous = Math.floor(days / 365) * 365;
  return { previous, next: previous + 365 };
};

const parseLocalDate = (value: string): Date | null => {
  const [y, m, d] = value.split('T')[0].split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

const startOfToday = (): Date => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

/** The next time the "monthiversary" (same day of the month) comes round, never before today */
export const nextMonthiversary = (start: Date, today: Date): { date: Date; months: number } => {
  let months = Math.max(1, (today.getFullYear() - start.getFullYear()) * 12 + (today.getMonth() - start.getMonth()));
  const on = (offset: number) => {
    const first = new Date(start.getFullYear(), start.getMonth() + offset, 1);
    const lastDay = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    return new Date(first.getFullYear(), first.getMonth(), Math.min(start.getDate(), lastDay));
  };
  if (on(months) < today) months += 1;
  return { date: on(months), months };
};

export const nextAnniversary = (start: Date, today: Date): { date: Date; years: number } => {
  let years = Math.max(1, today.getFullYear() - start.getFullYear());
  const on = (y: number) => new Date(start.getFullYear() + y, start.getMonth(), start.getDate());
  if (on(years) < today) years += 1;
  return { date: on(years), years };
};

const daysUntil = (date: Date, today: Date) => Math.round((date.getTime() - today.getTime()) / DAY_MS);
const inWords = (n: number) => (n === 0 ? 'today' : n === 1 ? 'tomorrow' : `in ${n} days`);

interface MilestoneCardProps {
  /** YYYY-MM-DD, or null when the couple hasn't set it */
  anniversaryDate: string | null;
  onSetDate: () => void;
}

const RADIUS = 52;

/**
 * MilestoneCard
 * A progress ring to the next day-count milestone, plus the next monthiversary and anniversary.
 * Asks for the date if it hasn't been set.
 */
const MilestoneCard: React.FC<MilestoneCardProps> = ({ anniversaryDate, onSetDate }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const reduce = useReducedMotion();

  const start = anniversaryDate ? parseLocalDate(anniversaryDate) : null;
  const today = startOfToday();
  const days = start ? Math.max(0, daysUntil(today, start)) : 0;
  const { previous, next } = milestoneAround(days);
  const progress = start ? Math.min(1, Math.max(0, (days - previous) / (next - previous))) : 0;
  const shownDays = useCountUp(days, inView && !!start);

  const monthly = start ? nextMonthiversary(start, today) : null;
  const yearly = start ? nextAnniversary(start, today) : null;

  return (
    <div ref={ref} className="card-edge relative flex h-full flex-col rounded-[28px] p-6 sm:p-8 overflow-hidden">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-on-surface-variant">
        <PartyPopper className="h-4 w-4 text-primary" /> Milestones
      </div>

      {!start ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-8 text-center">
          <CalendarHeart className="h-12 w-12 text-primary" />
          <p className="font-display text-2xl">When did your story begin?</p>
          <p className="max-w-xs text-sm text-on-surface-variant">Set the day you got together and we will count down to every milestone.</p>
          <button type="button" onClick={onSetDate} className="btn-orange cursor-pointer">Set the date</button>
        </div>
      ) : (
        <div className="mt-5 flex flex-1 flex-col items-center gap-6 sm:flex-row sm:items-center">
          <div className="relative h-36 w-36 shrink-0">
            <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden="true">
              <circle cx="60" cy="60" r={RADIUS} fill="none" stroke="var(--border-gray)" strokeWidth="9" />
              <motion.circle
                cx="60"
                cy="60"
                r={RADIUS}
                fill="none"
                stroke="var(--primary)"
                strokeWidth="9"
                strokeLinecap="round"
                initial={reduce ? { pathLength: progress } : { pathLength: 0 }}
                animate={{ pathLength: inView ? progress : reduce ? progress : 0 }}
                transition={{ duration: 1.4, ease: 'easeOut' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-3xl tabular-nums leading-none">{shownDays}</span>
              <span className="mt-1 text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">days</span>
            </div>
          </div>

          <div className="w-full space-y-4 text-left">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-on-surface-variant">Next milestone</p>
              <p className="font-display text-2xl">
                {next} days <span className="text-sm font-sans text-on-surface-variant">· {next - days} to go</span>
              </p>
            </div>
            {monthly && (
              <div className="flex items-center gap-3 text-sm">
                <Gift className="h-4 w-4 shrink-0 text-primary" />
                <span>
                  Month {monthly.months} {inWords(daysUntil(monthly.date, today))}
                </span>
              </div>
            )}
            {yearly && (
              <div className="flex items-center gap-3 text-sm">
                <CalendarHeart className="h-4 w-4 shrink-0 text-primary" />
                <span>
                  Anniversary {yearly.years} {inWords(daysUntil(yearly.date, today))}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MilestoneCard;
