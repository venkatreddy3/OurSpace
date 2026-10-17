import React, { useEffect, useState } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { Plus, X, RotateCcw } from 'lucide-react';
import { usePlayers, useSharedState } from './useSharedGame';

/* -------------------------------------------------------------------------- */
/* Decision Wheel                                                             */
/* -------------------------------------------------------------------------- */

const polar = (cx: number, cy: number, r: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return [cx + r * Math.sin(a), cy - r * Math.cos(a)];
};

const slicePath = (i: number, n: number) => {
  const step = 360 / n;
  const [x1, y1] = polar(100, 100, 96, i * step);
  const [x2, y2] = polar(100, 100, 96, (i + 1) * step);
  return `M100 100 L${x1} ${y1} A96 96 0 ${step > 180 ? 1 : 0} 1 ${x2} ${y2}Z`;
};

interface WheelState {
  options: string[];
  rotation: number;
  spin: { id: number; target: number; label: string } | null;
}

export const DecisionWheel: React.FC = () => {
  const [w, setW] = useSharedState<WheelState>(() => ({
    options: ['Pizza', 'Sushi', 'Tacos', 'Pasta'],
    rotation: 0,
    spin: null,
  }));
  const { options } = w;
  const [draft, setDraft] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);
  const controls = useAnimation();

  const addOption = () => {
    const v = draft.trim();
    if (!v || options.length >= 10) return;
    setW((p) => ({ ...p, options: [...p.options, v] }));
    setDraft('');
  };

  const spin = () => {
    if (spinning || options.length < 2) return;
    const step = 360 / options.length;
    const idx = Math.floor(Math.random() * options.length);
    const jitter = (Math.random() - 0.5) * step * 0.7;
    const current = w.rotation % 360;
    const target = w.rotation + 360 * 5 + ((360 - (idx + 0.5) * step - jitter - current) % 360 + 360) % 360;
    // The spin is part of the shared state, so both screens animate to the same result
    setW((p) => ({ ...p, rotation: target, spin: { id: Date.now(), target, label: options[idx] } }));
  };

  // Play whichever spin is current (started here or by the partner)
  useEffect(() => {
    const sp = w.spin;
    if (!sp) return;
    let cancelled = false;
    setSpinning(true);
    setResult(null);
    controls
      .start({ rotate: sp.target, transition: { duration: 4, ease: [0.17, 0.67, 0.18, 1] } })
      .then(() => {
        if (cancelled) return;
        setResult(sp.label);
        setSpinning(false);
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w.spin?.id]);

  // Editing the options clears the previous result
  useEffect(() => { setResult(null); }, [options.length]);

  const shades = ['var(--bg-surface-container-high)', 'var(--bg-surface-container-highest)'];

  return (
    <div className="space-y-5">
      <div className="relative mx-auto w-56 h-56 sm:w-64 sm:h-64">
        {/* pointer */}
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-10 w-0 h-0 border-x-[9px] border-x-transparent border-t-[16px] border-t-primary" />
        <motion.svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-sm" animate={controls} initial={{ rotate: 0 }}>
          <circle cx="100" cy="100" r="98" fill="var(--card-bg)" stroke="var(--border-gray)" strokeWidth="1.5" />
          {options.map((o, i) => {
            const mid = (i + 0.5) * (360 / options.length);
            const [tx, ty] = polar(100, 100, 62, mid);
            return (
              <g key={o + i}>
                <path d={slicePath(i, options.length)} fill={shades[i % 2]} stroke="var(--border-gray)" strokeWidth="1" />
                <text
                  x={tx}
                  y={ty}
                  fill="var(--on-surface)"
                  fontSize="10"
                  fontWeight="500"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${mid} ${tx} ${ty})`}
                >
                  {o.length > 11 ? o.slice(0, 10) + '…' : o}
                </text>
              </g>
            );
          })}
          <circle cx="100" cy="100" r="9" fill="var(--bg-background)" stroke="var(--border-gray)" />
        </motion.svg>
      </div>

      <div className="text-center min-h-[2.5rem]" aria-live="polite">
        {result ? (
          <p className="text-lg">
            Tonight we choose <span className="font-serif text-primary">{result}</span>
          </p>
        ) : (
          <p className="text-on-surface-variant text-sm">{spinning ? 'Spinning…' : 'Add your options, then spin.'}</p>
        )}
      </div>

      <button
        onClick={spin}
        disabled={spinning || options.length < 2}
        className="btn-orange w-full disabled:opacity-50 disabled:pointer-events-none"
      >
        {spinning ? 'Spinning…' : 'Spin the wheel'}
      </button>

      <div className="flex flex-wrap gap-2">
        {options.map((o, i) => (
          <span key={o + i} className="inline-flex items-center gap-1 text-xs bg-surface-container-high border border-border-gray rounded-full pl-3 pr-1.5 py-1">
            {o}
            <button
              onClick={() => setW((p) => ({ ...p, options: p.options.filter((_, j) => j !== i) }))}
              className="p-0.5 rounded-full hover:bg-surface-container-highest text-on-surface-variant"
              aria-label={`Remove ${o}`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); addOption(); }} className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add an option"
          maxLength={20}
          className="flex-1 bg-surface-container border border-border-gray rounded-full px-4 py-2 text-sm outline-none focus:border-primary"
        />
        <button type="submit" className="btn-outline-blue !px-4 !py-2" aria-label="Add option">
          <Plus className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Relationship Quiz (pass-and-play: both answer, then compare)               */
/* -------------------------------------------------------------------------- */

const QUESTIONS = [
  { q: 'Ideal Friday night?', a: ['Movie at home', 'Dinner out', 'Long walk', 'Game night'] },
  { q: 'Favourite way to start a morning?', a: ['Coffee in silence', 'Breakfast together', 'Workout', 'Sleep in'] },
  { q: 'Dream holiday?', a: ['Beach', 'City break', 'Mountains', 'Road trip'] },
  { q: 'Comfort food?', a: ['Pasta', 'Pizza', 'Ramen', 'Something sweet'] },
  { q: 'Best kind of date?', a: ['Cooking together', 'Museum', 'Picnic', 'Concert'] },
];

interface QuizState {
  i: number;
  ans: [number | null, number | null];
  score: number;
}

export const RelationshipQuiz: React.FC = () => {
  const { role, names } = usePlayers();
  const [st, setSt] = useSharedState<QuizState>(() => ({ i: 0, ans: [null, null], score: 0 }));
  const { i, ans, score } = st;
  const done = i >= QUESTIONS.length;
  const revealed = ans[0] !== null && ans[1] !== null;
  const reveal = revealed ? { a: ans[0] as number, b: ans[1] as number } : null;
  // Whose answer this device gives (on one shared device the players take turns)
  const actor: 0 | 1 = role ?? (ans[0] === null ? 0 : 1);
  const waitingForOther = role !== null && ans[role] !== null && !revealed;

  const restart = () => setSt({ i: 0, ans: [null, null], score: 0 });

  const pick = (n: number) => {
    if (revealed || ans[actor] !== null) return;
    setSt((p) => {
      const nextAns: [number | null, number | null] = [...p.ans];
      nextAns[actor] = n;
      const both = nextAns[0] !== null && nextAns[1] !== null;
      return { ...p, ans: nextAns, score: both && nextAns[0] === nextAns[1] ? p.score + 1 : p.score };
    });
  };

  const next = () => setSt((p) => ({ ...p, i: p.i + 1, ans: [null, null] }));

  if (done) {
    return (
      <div className="text-center space-y-4 py-4">
        <p className="text-xs uppercase tracking-[0.2em] text-on-surface-variant">Your result</p>
        <p className="font-display text-6xl">{score}/{QUESTIONS.length}</p>
        <p className="text-on-surface-variant">
          {score >= 4 ? 'Wonderfully in sync.' : score >= 2 ? 'Plenty left to discover about each other.' : 'Opposites attract. Try again!'}
        </p>
        <button onClick={restart} className="btn-orange">Play again</button>
      </div>
    );
  }

  const q = QUESTIONS[i];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-on-surface-variant">
        <span>Question {i + 1} of {QUESTIONS.length}</span>
        <span>Matches: {score}</span>
      </div>
      <div className="h-1 rounded-full bg-surface-container-highest overflow-hidden">
        <div className="h-full bg-primary transition-all" style={{ width: `${(i / QUESTIONS.length) * 100}%` }} />
      </div>
      <h4 className="font-serif text-2xl">{q.q}</h4>
      {!reveal && (
        <p className="text-sm text-on-surface-variant">
          {waitingForOther
            ? `Waiting for ${names[role === 0 ? 1 : 0]} to answer…`
            : role === null
            ? `${names[actor]}: pick your answer${actor === 1 ? ' (no peeking!)' : ''}.`
            : 'Pick your answer.'}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        {q.a.map((opt, n) => {
          const isA = reveal?.a === n;
          const isB = reveal?.b === n;
          return (
            <button
              key={opt}
              disabled={!!reveal || waitingForOther}
              onClick={() => pick(n)}
              className={`text-left text-sm px-4 py-3 rounded-2xl border transition-colors ${
                isA || isB
                  ? 'border-primary bg-primary-container text-on-primary-container'
                  : 'border-border-gray bg-surface-container hover:border-primary hover:text-primary'
              }`}
            >
              {opt}
              {reveal && (isA || isB) && (
                <span className="block text-[10px] uppercase tracking-wider mt-1 opacity-70">
                  {isA && isB ? 'Both' : isA ? names[0] : names[1]}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {reveal && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-sm">{reveal.a === reveal.b ? 'A match!' : 'Not this time.'}</p>
          <button onClick={next} className="btn-orange !py-2">{i + 1 === QUESTIONS.length ? 'See result' : 'Next'}</button>
        </div>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Tic-Tac-Toe (two players, one device)                                      */
/* -------------------------------------------------------------------------- */

const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

interface TttState {
  cells: (string | null)[];
  xTurn: boolean;
  wins: { X: number; O: number };
}

export const TicTacToe: React.FC = () => {
  const { names, canAct } = usePlayers();
  const [g, setG] = useSharedState<TttState>(() => ({ cells: Array(9).fill(null), xTurn: true, wins: { X: 0, O: 0 } }));
  const { cells, xTurn, wins } = g;

  const line = LINES.find(([a, b, c]) => cells[a] && cells[a] === cells[b] && cells[a] === cells[c]);
  const winner = line ? cells[line[0]] : null;
  const draw = !winner && cells.every(Boolean);
  const myTurn = canAct(xTurn ? 0 : 1);

  const play = (n: number) => {
    if (cells[n] || winner || !myTurn) return;
    const next = cells.slice();
    next[n] = xTurn ? 'X' : 'O';
    const w = LINES.find(([a, b, c]) => next[a] && next[a] === next[b] && next[a] === next[c]);
    const mark = w ? (next[w[0]] as 'X' | 'O') : null;
    setG({ cells: next, xTurn: !xTurn, wins: mark ? { ...wins, [mark]: wins[mark] + 1 } : wins });
  };

  const reset = () => setG((p) => ({ ...p, cells: Array(9).fill(null), xTurn: true }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span className="text-on-surface-variant">{names[0]} (X): {wins.X} · {names[1]} (O): {wins.O}</span>
        <button onClick={reset} className="inline-flex items-center gap-1 text-xs text-on-surface-variant hover:text-primary">
          <RotateCcw className="w-3.5 h-3.5" /> New round
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2 max-w-[260px] mx-auto">
        {cells.map((c, n) => (
          <button
            key={n}
            onClick={() => play(n)}
            aria-label={`Cell ${n + 1}${c ? `, ${c}` : ''}`}
            className={`aspect-square rounded-2xl border font-display text-4xl flex items-center justify-center transition-colors ${
              line?.includes(n)
                ? 'border-primary bg-primary-container text-on-primary-container'
                : 'border-border-gray bg-surface-container hover:border-primary'
            }`}
          >
            <span className={c === 'O' ? 'text-primary' : ''}>{c}</span>
          </button>
        ))}
      </div>
      <p className="text-center text-sm" aria-live="polite">
        {winner ? `${winner === 'X' ? names[0] : names[1]} wins!` : draw ? "It's a draw." : `${xTurn ? names[0] : names[1]} to play (${xTurn ? 'X' : 'O'})`}
      </p>
    </div>
  );
};
