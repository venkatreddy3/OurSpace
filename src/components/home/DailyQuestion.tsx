import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageCircleHeart, Send, Shuffle } from 'lucide-react';

const QUESTIONS = [
  'What is a small thing I do that makes your whole day better?',
  'Which moment of ours would you relive tomorrow if you could?',
  'What is one place we have not been that you want us to see together?',
  'What song makes you think of us right now?',
  'What is something you are looking forward to this month?',
  'When did you first know we were something special?',
  'What is a tiny tradition you would love for us to start?',
  'What is your favourite thing about our mornings?',
  'If we had a free weekend with no plans, what would you want us to do?',
  'What is something I said that you still think about?',
  'What meal would you want us to cook together?',
  'What is one thing you are proud of me for lately?',
  'Which photo of us makes you smile the most?',
  'What is a memory from your childhood you have never told me?',
  'What does a perfect lazy Sunday look like to you?',
  'What is one dream you want us to chase together?',
  'What made you laugh the hardest with me?',
  'What is a movie we should watch next, and why?',
  'What is something new you would like us to try this year?',
  'How can I make your week a little easier?',
  'What is your favourite thing about how we handle hard days?',
  'What is the best surprise you could imagine for us?',
  'What is a small gift that would make you feel really seen?',
  'Which of our inside jokes is your favourite?',
  'Where do you picture us in five years?',
  'What is a compliment you would love to hear more often?',
  'What is one thing we do that you hope we never stop doing?',
  'What would our dream home smell and sound like?',
  'What is something you learned from me?',
  'If today were a movie scene about us, what would be happening?',
];

const dayOfYear = (d: Date): number => {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d.getTime() - start.getTime()) / 86_400_000);
};

interface DailyQuestionProps {
  /** Opens the note composer with the question already typed in */
  onSend: (question: string) => void;
}

/**
 * DailyQuestion
 * A conversation starter that changes every day (shuffle for another), which can be sent to the partner as a note.
 */
const DailyQuestion: React.FC<DailyQuestionProps> = ({ onSend }) => {
  const [index, setIndex] = useState(() => dayOfYear(new Date()) % QUESTIONS.length);
  const question = QUESTIONS[index];

  return (
    <div className="card-edge relative flex h-full flex-col overflow-hidden rounded-[28px] p-6 sm:p-8">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-on-surface-variant">
        <MessageCircleHeart className="h-4 w-4 text-primary" /> Today&rsquo;s conversation starter
      </div>

      <span aria-hidden="true" className="pointer-events-none absolute -right-2 -top-6 font-display text-[9rem] leading-none text-primary/10">
        &ldquo;
      </span>

      <div className="relative flex flex-1 items-center py-6">
        <AnimatePresence mode="wait">
          <motion.p
            key={index}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
            className="font-display text-2xl sm:text-3xl leading-snug"
          >
            {question}
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="relative flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => onSend(question)} className="btn-orange cursor-pointer">
          <Send className="h-4 w-4" /> Send as a note
        </button>
        <button
          type="button"
          onClick={() => setIndex((i) => (i + 1) % QUESTIONS.length)}
          className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm text-on-surface-variant transition-colors hover:text-primary cursor-pointer"
        >
          <Shuffle className="h-4 w-4" /> Another one
        </button>
      </div>
    </div>
  );
};

export default DailyQuestion;
