import React from 'react';
import { RotateCcw } from 'lucide-react';
import { usePlayers, useSharedState } from './useSharedGame';

/* -------------------------------------------------------------------------- */
/* Connect Four                                                               */
/* -------------------------------------------------------------------------- */

const ROWS = 6;
const COLS = 7;
type Cell = 0 | 1 | 2;

const findFour = (b: Cell[][]): [number, number][] | null => {
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = b[r][c];
      if (!p) continue;
      for (const [dr, dc] of dirs) {
        const cells: [number, number][] = [[r, c]];
        for (let k = 1; k < 4; k++) {
          const nr = r + dr * k;
          const nc = c + dc * k;
          if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || b[nr][nc] !== p) break;
          cells.push([nr, nc]);
        }
        if (cells.length === 4) return cells;
      }
    }
  }
  return null;
};

interface C4State {
  board: Cell[][];
  turn: 1 | 2;
  wins: { 1: number; 2: number };
}

export const ConnectFour: React.FC = () => {
  const { names, canAct } = usePlayers();
  const empty = (): Cell[][] => Array.from({ length: ROWS }, () => Array<Cell>(COLS).fill(0));
  const [g, setG] = useSharedState<C4State>(() => ({ board: empty(), turn: 1, wins: { 1: 0, 2: 0 } }));
  const { board, turn, wins } = g;

  const win = findFour(board);
  const winner = win ? board[win[0][0]][win[0][1]] : 0;
  const full = !winner && board[0].every(Boolean);
  const myTurn = canAct(turn === 1 ? 0 : 1);

  const drop = (c: number) => {
    if (winner || full || !myTurn) return;
    let r = ROWS - 1;
    while (r >= 0 && board[r][c]) r--;
    if (r < 0) return;
    const next = board.map((row) => row.slice());
    next[r][c] = turn;
    if (findFour(next)) setG({ board: next, turn, wins: { ...wins, [turn]: wins[turn] + 1 } });
    else setG({ board: next, turn: turn === 1 ? 2 : 1, wins });
  };

  const reset = () => setG((p) => ({ ...p, board: empty(), turn: 1 }));
  const isWin = (r: number, c: number) => !!win?.some(([wr, wc]) => wr === r && wc === c);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span className="text-on-surface-variant">{names[0]}: {wins[1]} · {names[1]}: {wins[2]}</span>
        <button onClick={reset} className="inline-flex items-center gap-1 text-xs text-on-surface-variant hover:text-primary">
          <RotateCcw className="w-3.5 h-3.5" /> New round
        </button>
      </div>
      <div className="rounded-2xl border border-border-gray bg-surface-container-high p-2">
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: COLS }, (_, c) => (
            <button key={c} onClick={() => drop(c)} aria-label={`Drop in column ${c + 1}`} className="flex flex-col gap-1.5 group">
              {board.map((row, r) => {
                const v = row[c];
                return (
                  <span
                    key={r}
                    className={`aspect-square rounded-full border transition-colors ${
                      v === 1
                        ? 'bg-on-background border-on-background'
                        : v === 2
                        ? 'bg-primary border-primary'
                        : 'bg-surface-container border-border-gray group-hover:border-primary/60'
                    } ${isWin(r, c) ? 'ring-2 ring-offset-2 ring-offset-surface-container-high ring-primary' : ''}`}
                  />
                );
              })}
            </button>
          ))}
        </div>
      </div>
      <p className="text-center text-sm" aria-live="polite">
        {winner ? `${names[winner - 1]} wins!` : full ? "It's a draw." : `${names[turn - 1]}'s turn`}
        {!winner && !full && (
          <span className={`inline-block w-3 h-3 rounded-full align-middle ml-2 ${turn === 1 ? 'bg-on-background' : 'bg-primary'}`} />
        )}
      </p>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Memory Match (turn-based pairs)                                            */
/* -------------------------------------------------------------------------- */

const SYMBOLS = ['🌹', '☕', '🎬', '🍕', '🌙', '🎧'];
const shuffled = () => [...SYMBOLS, ...SYMBOLS].sort(() => Math.random() - 0.5);

interface MemState {
  deck: string[];
  flipped: number[];
  matched: number[];
  turn: 0 | 1;
  score: [number, number];
}

export const MemoryMatch: React.FC = () => {
  const { names, canAct } = usePlayers();
  const [g, setG] = useSharedState<MemState>(() => ({ deck: shuffled(), flipped: [], matched: [], turn: 0, score: [0, 0] }));
  const { deck, flipped, matched, turn, score } = g;

  const over = matched.length === deck.length;
  const locked = flipped.length >= 2;

  const flip = (i: number) => {
    if (locked || over || !canAct(turn) || flipped.includes(i) || matched.includes(i)) return;
    const next = [...flipped, i];
    setG((p) => ({ ...p, flipped: next }));
    if (next.length < 2) return;
    // The player who flipped resolves the pair; the result is shared with the partner
    const [a, b] = next;
    if (deck[a] === deck[b]) {
      setTimeout(() => {
        setG((p) => ({
          ...p,
          matched: [...p.matched, a, b],
          flipped: [],
          score: turn === 0 ? [p.score[0] + 1, p.score[1]] : [p.score[0], p.score[1] + 1],
        }));
      }, 500);
    } else {
      setTimeout(() => {
        setG((p) => ({ ...p, flipped: [], turn: turn === 0 ? 1 : 0 }));
      }, 900);
    }
  };

  const reset = () => setG({ deck: shuffled(), flipped: [], matched: [], turn: 0, score: [0, 0] });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span className="text-on-surface-variant">{names[0]}: {score[0]} · {names[1]}: {score[1]}</span>
        <button onClick={reset} className="inline-flex items-center gap-1 text-xs text-on-surface-variant hover:text-primary">
          <RotateCcw className="w-3.5 h-3.5" /> Shuffle
        </button>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {deck.map((s, i) => {
          const open = flipped.includes(i) || matched.includes(i);
          return (
            <button
              key={i}
              onClick={() => flip(i)}
              aria-label={open ? s : 'Hidden card'}
              className={`aspect-square rounded-2xl border text-3xl flex items-center justify-center transition-all duration-300 ${
                matched.includes(i)
                  ? 'border-primary bg-primary-container'
                  : open
                  ? 'border-border-gray bg-surface-container'
                  : 'border-border-gray bg-surface-container-high hover:border-primary'
              }`}
            >
              {open ? s : ''}
            </button>
          );
        })}
      </div>
      <p className="text-center text-sm" aria-live="polite">
        {over ? (score[0] === score[1] ? "It's a tie!" : `${names[score[0] > score[1] ? 0 : 1]} wins!`) : `${names[turn]}'s turn`}
      </p>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Rock Paper Scissors (pass-and-play, hidden picks)                          */
/* -------------------------------------------------------------------------- */

const MOVES = [
  { id: 0, label: 'Rock', icon: '✊' },
  { id: 1, label: 'Paper', icon: '✋' },
  { id: 2, label: 'Scissors', icon: '✌️' },
];

interface RpsState {
  picks: [number | null, number | null];
  score: { p1: number; p2: number };
}

export const RockPaperScissors: React.FC = () => {
  const { role, names } = usePlayers();
  const [g, setG] = useSharedState<RpsState>(() => ({ picks: [null, null], score: { p1: 0, p2: 0 } }));
  const { picks, score } = g;
  const round = picks[0] !== null && picks[1] !== null ? { a: picks[0] as number, b: picks[1] as number } : null;
  // Whose pick this device makes (on one shared device the players take turns)
  const actor: 0 | 1 = role ?? (picks[0] === null ? 0 : 1);
  const waitingForOther = role !== null && picks[role] !== null && !round;

  const pick = (m: number) => {
    if (round || picks[actor] !== null) return;
    setG((p) => {
      const np: [number | null, number | null] = [...p.picks];
      np[actor] = m;
      if (np[0] === null || np[1] === null) return { ...p, picks: np };
      const d = (np[1] - np[0] + 3) % 3; // 1 => P2 wins, 2 => P1 wins
      return {
        picks: np,
        score: { p1: p.score.p1 + (d === 2 ? 1 : 0), p2: p.score.p2 + (d === 1 ? 1 : 0) },
      };
    });
  };

  const next = () => setG((p) => ({ ...p, picks: [null, null] }));

  const diff = round ? (round.b - round.a + 3) % 3 : 0;
  const outcome = !round ? '' : diff === 0 ? "It's a draw." : diff === 1 ? `${names[1]} wins the round!` : `${names[0]} wins the round!`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span className="text-on-surface-variant">{names[0]}: {score.p1} · {names[1]}: {score.p2}</span>
        <button
          onClick={() => setG({ picks: [null, null], score: { p1: 0, p2: 0 } })}
          className="inline-flex items-center gap-1 text-xs text-on-surface-variant hover:text-primary"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset
        </button>
      </div>

      {round ? (
        <div className="text-center space-y-4 py-2">
          <div className="flex items-center justify-center gap-8 text-5xl">
            <div>
              <div>{MOVES[round.a].icon}</div>
              <p className="text-xs text-on-surface-variant mt-2">{names[0]}</p>
            </div>
            <span className="text-sm text-on-surface-variant">vs</span>
            <div>
              <div>{MOVES[round.b].icon}</div>
              <p className="text-xs text-on-surface-variant mt-2">{names[1]}</p>
            </div>
          </div>
          <p className="font-serif text-xl" aria-live="polite">{outcome}</p>
          <button onClick={next} className="btn-orange">Next round</button>
        </div>
      ) : (
        <>
          <p className="text-sm text-on-surface-variant text-center">
            {waitingForOther
              ? `Waiting for ${names[role === 0 ? 1 : 0]} to choose…`
              : role === null
              ? `${names[actor]}: choose in secret${actor === 1 ? ' (no peeking!)' : ''}.`
              : 'Choose your move.'}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {MOVES.map((m) => (
              <button
                key={m.id}
                onClick={() => pick(m.id)}
                disabled={waitingForOther}
                className="rounded-2xl border border-border-gray bg-surface-container hover:border-primary py-5 flex flex-col items-center gap-1 transition-colors"
              >
                <span className="text-4xl">{m.icon}</span>
                <span className="text-xs text-on-surface-variant">{m.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
