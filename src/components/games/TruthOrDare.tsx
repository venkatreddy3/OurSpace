import React, { useMemo, useRef } from 'react';
import { RotateCcw, Shuffle, Check } from 'lucide-react';
import { usePlayers, useSharedState } from './useSharedGame';

type Kind = 'truth' | 'dare';
type Level = 'sweet' | 'fun' | 'spicy';

const LEVELS: { id: Level; label: string }[] = [
  { id: 'sweet', label: 'Sweet' },
  { id: 'fun', label: 'Fun' },
  { id: 'spicy', label: 'Spicy' },
];

const SUGGESTIONS: Record<Kind, Record<Level, string[]>> = {
  truth: {
    sweet: [
      'What was your very first impression of me?',
      'What is your favourite memory of us so far?',
      'When did you first realise you liked me?',
      'What is one thing I do that always makes you smile?',
      'What song reminds you of us?',
      'What is one dream you want us to achieve together?',
      'What is the most thoughtful thing I have ever done for you?',
      'Where would you take me if we could travel anywhere tomorrow?',
    ],
    fun: [
      'What is the most embarrassing thing you have done in front of me?',
      'What is a habit of mine that secretly annoys you?',
      'If I were an animal, which one would I be and why?',
      'What is the silliest thing you have googled about us?',
      'What is your most unpopular opinion?',
      'Which of my friends would you swap for one of yours?',
      'What is a lie you have told me that you never confessed?',
      'What nickname for me did you almost use but never said?',
    ],
    spicy: [
      'What is the most romantic thing you have fantasised about us doing?',
      'What is your favourite thing about kissing me?',
      'Where is the most unusual place you would like to kiss me?',
      'What outfit of mine do you find the most attractive?',
      'What is a flirty message you wanted to send me but held back?',
      'What was your first thought the first time we kissed?',
      'What is one thing you would love me to do more of?',
      'What is the boldest thing you have ever done to impress me?',
    ],
  },
  dare: {
    sweet: [
      'Give your partner a 30-second compliment shower.',
      'Write a tiny love note and hand it over.',
      'Hug your partner for a full minute without letting go.',
      'Say three things you love about them while looking into their eyes.',
      'Hum or sing a line of the song that reminds you of them.',
      'Draw a quick doodle of the two of you.',
      'Plan the next date out loud with at least three details.',
      'Give your partner a gentle forehead kiss.',
    ],
    fun: [
      'Do your best impression of your partner.',
      'Dance with no music for 30 seconds.',
      'Speak in an accent for the next three rounds.',
      'Let your partner pick a funny filter and take a selfie together.',
      'Try to make your partner laugh in 20 seconds.',
      'Say the alphabet backwards as fast as you can.',
      'Act out a movie scene and let your partner guess it.',
      'Do 10 jumping jacks while saying how amazing your partner is.',
    ],
    spicy: [
      'Whisper something flirty in your partner’s ear.',
      'Give your partner a slow 20-second kiss.',
      'Give a 1-minute shoulder massage.',
      'Describe your dream night in with your partner in three sentences.',
      'Send your partner your best flirty text, right now, from across the room.',
      'Trace a secret word on their back and let them guess it.',
      'Look into their eyes for 30 seconds without laughing.',
      'Choose a spot to kiss them and do it.',
    ],
  },
};

/** Truth or Dare with suggested prompts; players take turns and pick a heat level. */
interface TodState {
  turn: 0 | 1;
  level: Level;
  kind: Kind | null;
  prompt: string | null;
  done: number;
}

export const TruthOrDare: React.FC = () => {
  const { names, canAct } = usePlayers();
  const [g, setG] = useSharedState<TodState>(() => ({ turn: 0, level: 'sweet', kind: null, prompt: null, done: 0 }));
  const { turn, level, kind, prompt, done } = g;
  const mine = canAct(turn); // only the player whose turn it is can pick and draw
  const seen = useRef<Record<string, Set<string>>>({});

  const draw = (k: Kind, lv: Level) => {
    const pool = SUGGESTIONS[k][lv];
    const key = `${k}-${lv}`;
    const used = (seen.current[key] ||= new Set());
    if (used.size >= pool.length) used.clear();
    const fresh = pool.filter((p) => !used.has(p));
    const pick = fresh[Math.floor(Math.random() * fresh.length)];
    used.add(pick);
    setG((p) => ({ ...p, level: lv, kind: k, prompt: pick }));
  };

  const next = (completed: boolean) =>
    setG((p) => ({ ...p, done: p.done + (completed ? 1 : 0), kind: null, prompt: null, turn: p.turn === 0 ? 1 : 0 }));

  const reset = () => {
    seen.current = {};
    setG({ turn: 0, level: 'sweet', kind: null, prompt: null, done: 0 });
  };

  const accent = useMemo(() => (kind === 'dare' ? 'text-primary' : 'text-on-background'), [kind]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-on-surface-variant">Completed: {done}</span>
        <button onClick={reset} className="inline-flex items-center gap-1 text-xs text-on-surface-variant hover:text-primary">
          <RotateCcw className="w-3.5 h-3.5" /> Restart
        </button>
      </div>

      {/* Heat level */}
      <div className="flex justify-center">
        <div className="inline-flex p-1 bg-surface-container-high border border-border-gray rounded-full" role="radiogroup" aria-label="Level">
          {LEVELS.map((l) => (
            <button
              key={l.id}
              role="radio"
              aria-checked={level === l.id}
              disabled={!mine}
              onClick={() => { if (kind) draw(kind, l.id); else setG((p) => ({ ...p, level: l.id })); }}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                level === l.id ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-center text-sm text-on-surface-variant">
        It&rsquo;s <span className="font-semibold text-on-surface">{names[turn]}</span>&rsquo;s turn
      </p>

      {!prompt ? (
        mine ? (
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => draw('truth', level)} className="btn-outline-blue py-6 text-lg">Truth</button>
            <button onClick={() => draw('dare', level)} className="btn-orange py-6 text-lg">Dare</button>
          </div>
        ) : (
          <p className="text-center text-sm text-on-surface-variant py-8">
            Waiting for {names[turn]} to pick truth or dare…
          </p>
        )
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border-gray bg-surface-container-high p-6 text-center min-h-[140px] flex flex-col items-center justify-center gap-3">
            <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-on-surface-variant">
              {kind === 'dare' ? 'Dare' : 'Truth'}
            </span>
            <p className={`font-serif text-xl sm:text-2xl leading-snug ${accent}`}>{prompt}</p>
          </div>
          {mine ? (
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button onClick={() => draw(kind as Kind, level)} className="btn-outline-blue gap-2 text-sm">
              <Shuffle className="w-4 h-4" /> Another one
            </button>
            <button onClick={() => next(true)} className="btn-orange gap-2 text-sm">
              <Check className="w-4 h-4" /> Done, next turn
            </button>
            <button onClick={() => next(false)} className="text-xs text-on-surface-variant hover:text-primary underline">
              Skip
            </button>
          </div>
          ) : (
            <p className="text-center text-xs text-on-surface-variant">{names[turn]} is on it…</p>
          )}
        </div>
      )}
    </div>
  );
};
