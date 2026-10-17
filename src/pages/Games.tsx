import React from 'react';
import { motion } from 'framer-motion';
import { Gamepad2, Disc, MessageCircleHeart, ArrowUpRight, Users, Clock, Grid3x3, Layers, Hand, Flame, Send } from 'lucide-react';
import Dialog from '../components/ui/Dialog';
import { DecisionWheel, RelationshipQuiz, TicTacToe } from '../components/games/GamePlayers';
import { ConnectFour, MemoryMatch, RockPaperScissors } from '../components/games/MoreGames';
import { TruthOrDare } from '../components/games/TruthOrDare';
import { useAuthStore } from '../store/authStore.js';
import { useGameStore, newSessionId } from '../store/gameStore';
import { sendGameMsg } from '../services/gameSession.service';

type GameId = 'wheel' | 'quiz' | 'minigame' | 'connect4' | 'memory' | 'rps' | 'tod';

interface Game {
  id: GameId;
  title: string;
  description: string;
  icon: React.ReactNode;
  tag: string;
  time: string;
  players: string;
  cta: string;
}

const games: Game[] = [
  {
    id: 'wheel',
    title: 'Decision Wheel',
    description: "Can't decide what to eat or watch? Add your options, spin the wheel and let fate handle it.",
    icon: <Disc className="w-6 h-6" />,
    tag: 'Cooperative',
    time: '1 min',
    players: '1–2 players',
    cta: 'Spin now',
  },
  {
    id: 'quiz',
    title: 'Relationship Quiz',
    description: 'Both answer the same questions, then compare. Instant mood booster!',
    icon: <MessageCircleHeart className="w-6 h-6" />,
    tag: 'Competitive',
    time: '3 min',
    players: '2 players',
    cta: 'Start quiz',
  },
  {
    id: 'minigame',
    title: 'Tic-Tac-Toe',
    description: 'A classic duel on one screen. Winner picks the next date.',
    icon: <Gamepad2 className="w-6 h-6" />,
    tag: 'Quick play',
    time: '2 min',
    players: '2 players',
    cta: 'Play round',
  },
  {
    id: 'connect4',
    title: 'Connect Four',
    description: 'Drop discs and line up four in a row before your partner does.',
    icon: <Grid3x3 className="w-6 h-6" />,
    tag: 'Strategy',
    time: '5 min',
    players: '2 players',
    cta: 'Drop in',
  },
  {
    id: 'memory',
    title: 'Memory Match',
    description: 'Take turns flipping cards. Find a pair and play again.',
    icon: <Layers className="w-6 h-6" />,
    tag: 'Brain teaser',
    time: '4 min',
    players: '2 players',
    cta: 'Flip cards',
  },
  {
    id: 'rps',
    title: 'Rock Paper Scissors',
    description: 'Pick in secret, reveal together. Best of forever.',
    icon: <Hand className="w-6 h-6" />,
    tag: 'Quick play',
    time: '1 min',
    players: '2 players',
    cta: 'Shoot',
  },
  {
    id: 'tod',
    title: 'Truth or Dare',
    description: 'Pick truth or dare and get a suggestion, from sweet to spicy. Take turns and see how far you go.',
    icon: <Flame className="w-6 h-6" />,
    tag: 'Party',
    time: '10 min',
    players: '2 players',
    cta: 'Let’s play',
  },
];

/** Static decorative wheel for the featured card */
const WheelArt: React.FC = () => (
  <svg viewBox="0 0 200 200" className="w-full h-full" aria-hidden="true">
    <circle cx="100" cy="100" r="96" fill="var(--bg-surface-container-high)" stroke="var(--border-gray)" strokeWidth="1.5" />
    {[0, 1, 2, 3, 4, 5].map((i) => {
      const a = (i * 60 * Math.PI) / 180;
      return <line key={i} x1="100" y1="100" x2={100 + 96 * Math.sin(a)} y2={100 - 96 * Math.cos(a)} stroke="var(--border-gray)" strokeWidth="1.5" />;
    })}
    <path d="M100 100 L100 4 A96 96 0 0 1 183 52Z" fill="var(--primary)" opacity="0.9" />
    <circle cx="100" cy="100" r="14" fill="var(--bg-background)" stroke="var(--border-gray)" strokeWidth="1.5" />
  </svg>
);

/** Everything that happens before and around a game: invite, waiting, declined, partner left */
const GameShell: React.FC = () => {
  const { user, partner } = useAuthStore();
  const session = useGameStore((s) => s.session);
  const setSession = useGameStore((s) => s.setSession);
  const patchSession = useGameStore((s) => s.patchSession);
  if (!session) return null;

  const partnerName = partner?.displayName || 'your partner';
  const canInvite = !!user && !!partner;

  const sendInvite = () => {
    if (!user) return;
    const id = newSessionId();
    setSession({ ...session, id, role: 0, phase: 'waiting', partnerLeft: false });
    sendGameMsg(
      { type: 'invite', sessionId: id, gameId: session.gameId, gameTitle: session.gameTitle, fromUid: user.uid, fromName: user.displayName },
      user.coupleId,
    );
  };

  const cancelInvite = () => {
    if (user) sendGameMsg({ type: 'cancel', sessionId: session.id, fromUid: user.uid, fromName: user.displayName }, user.coupleId);
    patchSession({ phase: 'choose', role: null });
  };

  if (session.phase === 'choose') {
    return (
      <div className="text-center space-y-5 py-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-primary-container text-on-primary-container flex items-center justify-center">
          <Send className="w-6 h-6" />
        </div>
        <div>
          <p className="font-serif text-2xl">Play with {partnerName}?</p>
          <p className="text-sm text-on-surface-variant mt-2">
            We&rsquo;ll send {partnerName} a request. When they join, you both play the same game live.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <button onClick={sendInvite} disabled={!canInvite} className="btn-orange w-full disabled:opacity-50 disabled:pointer-events-none">
            Send request to {partnerName}
          </button>
          {!canInvite && <p className="text-xs text-on-surface-variant">Pair with your partner first to play together.</p>}
          <button
            onClick={() => patchSession({ phase: 'local', role: null })}
            className="text-xs text-on-surface-variant hover:text-primary underline"
          >
            Play on this device instead
          </button>
        </div>
      </div>
    );
  }

  if (session.phase === 'waiting') {
    return (
      <div className="text-center space-y-5 py-6">
        <div className="w-12 h-12 mx-auto rounded-full border-4 border-primary/25 border-t-primary animate-spin" />
        <div>
          <p className="font-serif text-2xl">Request sent</p>
          <p className="text-sm text-on-surface-variant mt-2">Waiting for {partnerName} to join&hellip;</p>
        </div>
        <button onClick={cancelInvite} className="btn-outline-blue text-sm">Cancel request</button>
      </div>
    );
  }

  if (session.phase === 'declined') {
    return (
      <div className="text-center space-y-5 py-6">
        <p className="font-serif text-2xl">Maybe later</p>
        <p className="text-sm text-on-surface-variant">{partnerName} can&rsquo;t play right now.</p>
        <div className="flex justify-center gap-3">
          <button onClick={sendInvite} className="btn-orange text-sm">Ask again</button>
          <button onClick={() => patchSession({ phase: 'local', role: null })} className="btn-outline-blue text-sm">Play here</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {session.phase === 'playing' && (
        <p className="text-center text-[11px] uppercase tracking-widest text-on-surface-variant">
          {session.partnerLeft ? `${partnerName} left the game` : `Playing live with ${partnerName}`}
        </p>
      )}
      {session.gameId === 'wheel' && <DecisionWheel />}
      {session.gameId === 'quiz' && <RelationshipQuiz />}
      {session.gameId === 'minigame' && <TicTacToe />}
      {session.gameId === 'connect4' && <ConnectFour />}
      {session.gameId === 'memory' && <MemoryMatch />}
      {session.gameId === 'rps' && <RockPaperScissors />}
      {session.gameId === 'tod' && <TruthOrDare />}
    </div>
  );
};

const Games: React.FC = () => {
  const { user } = useAuthStore();
  const session = useGameStore((s) => s.session);
  const setSession = useGameStore((s) => s.setSession);

  const openGame = (game: Game) =>
    setSession({ id: '', gameId: game.id, gameTitle: game.title, role: null, phase: 'choose', partnerLeft: false });

  const closeGame = () => {
    if (session && user && (session.phase === 'playing' || session.phase === 'waiting')) {
      sendGameMsg(
        { type: session.phase === 'waiting' ? 'cancel' : 'leave', sessionId: session.id, fromUid: user.uid, fromName: user.displayName },
        user.coupleId,
      );
    }
    setSession(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-6xl mx-auto px-5 sm:px-8 py-8 sm:py-14"
    >
      {/* Header */}
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-8 mb-8 border-b border-border-gray">
        <div className="max-w-xl">
          <p className="text-xs uppercase tracking-[0.2em] text-on-surface-variant mb-3">Play together</p>
          <h1 className="font-display text-4xl sm:text-6xl">Couple games</h1>
          <p className="text-on-surface-variant mt-4 text-base sm:text-lg">
            Settle debates, test how well you know each other, or just have a little fun.
          </p>
        </div>
        <div className="flex gap-3">
          <div className="card-edge px-5 py-3 min-w-[110px]">
            <p className="font-display text-3xl">{games.length}</p>
            <p className="text-xs text-on-surface-variant">Games ready</p>
          </div>
          <div className="card-edge px-5 py-3 min-w-[110px]">
            <p className="font-display text-3xl">2</p>
            <p className="text-xs text-on-surface-variant">Players</p>
          </div>
        </div>
      </header>

      {/* Bento grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {games.map((game, index) => {
          const featured = index === 0;
          const wide = game.id === 'tod'; // medium-size card: 2 columns wide, one row tall
          return (
            <motion.button
              key={game.id}
              type="button"
              onClick={() => openGame(game)}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              whileHover={{ y: -4 }}
              className={`group text-left card-edge p-6 sm:p-8 flex cursor-pointer transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-primary ${
                featured
                  ? 'md:col-span-2 lg:row-span-2 flex-col sm:flex-row gap-6 sm:items-center'
                  : wide
                  ? 'md:col-span-2 flex-col sm:flex-row gap-6 sm:items-center'
                  : 'flex-col justify-between'
              }`}
            >
              <div className={featured ? 'flex-1 flex flex-col h-full justify-between gap-8' : wide ? 'flex-1 flex flex-col h-full justify-between gap-6' : 'flex flex-col gap-4'}>
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-12 h-12 rounded-2xl bg-surface-container-high border border-border-gray flex items-center justify-center text-on-surface group-hover:text-primary transition-colors">
                      {game.icon}
                    </div>
                    <span className="text-[10px] uppercase font-semibold tracking-wider px-3 py-1 rounded-full border border-border-gray text-on-surface-variant">
                      {game.tag}
                    </span>
                  </div>
                  <h2 className={`font-serif ${featured ? 'text-3xl sm:text-4xl' : 'text-2xl'}`}>{game.title}</h2>
                  <p className="text-on-surface-variant mt-3 leading-relaxed max-w-md">{game.description}</p>
                </div>

                <div className="flex items-center justify-between text-xs text-on-surface-variant pt-4 border-t border-border-gray">
                  <span className="inline-flex items-center gap-4">
                    <span className="inline-flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{game.time}</span>
                    <span className="inline-flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />{game.players}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-primary font-medium group-hover:gap-2 transition-all">
                    {game.cta} <ArrowUpRight className="w-4 h-4" />
                  </span>
                </div>
              </div>

              {wide && (
                <div className="flex sm:flex-col gap-3 mx-auto shrink-0 transition-transform duration-500 group-hover:-rotate-3" aria-hidden="true">
                  <span className="w-28 sm:w-36 rounded-2xl border-2 border-on-background px-4 py-5 text-center font-serif text-2xl -rotate-3">Truth</span>
                  <span className="w-28 sm:w-36 rounded-2xl bg-primary text-on-primary px-4 py-5 text-center font-serif text-2xl rotate-3">Dare</span>
                </div>
              )}

              {featured && (
                <div className="w-44 h-44 sm:w-64 sm:h-64 lg:w-72 lg:h-72 mx-auto shrink-0 transition-transform duration-700 group-hover:rotate-[24deg]">
                  <WheelArt />
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      <p className="text-center text-sm text-on-surface-variant mt-10">More games are on the way.</p>

      <Dialog isOpen={!!session} onClose={closeGame} title={session?.gameTitle ?? ''}>
        <GameShell />
      </Dialog>
    </motion.div>
  );
};

export default Games;
